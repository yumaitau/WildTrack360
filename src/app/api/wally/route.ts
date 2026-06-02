import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { bedrock } from '@ai-sdk/amazon-bedrock';
import { streamText, type LanguageModelUsage } from 'ai';
import { z } from 'zod';
import { logAudit } from '@/lib/audit';
import { getUserRole } from '@/lib/rbac';
import {
  buildWallyOperationalContext,
  buildWallySystemPrompt,
  buildWallyUserPrompt,
  WALLY_MODEL,
} from '@/lib/wally/context';

export const runtime = 'nodejs';

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(4000),
});

const RequestSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(16),
});

const MAX_AUDIT_TEXT_LENGTH = 6000;

type WallyMessage = z.infer<typeof MessageSchema>;

function compactAuditText(value: string, maxLength = MAX_AUDIT_TEXT_LENGTH) {
  const compacted = value.replace(/\s+/g, ' ').trim();

  if (compacted.length <= maxLength) {
    return compacted;
  }

  return `${compacted.slice(0, maxLength)}... [truncated]`;
}

function latestUserPrompt(messages: WallyMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === 'user') {
      return messages[index].content;
    }
  }

  return '';
}

function auditUsage(usage?: LanguageModelUsage) {
  if (!usage) {
    return null;
  }

  return {
    inputTokens: usage.inputTokens ?? null,
    outputTokens: usage.outputTokens ?? null,
    totalTokens: usage.totalTokens ?? null,
    cachedInputTokens: usage.cachedInputTokens ?? usage.inputTokenDetails.cacheReadTokens ?? null,
    reasoningTokens: usage.reasoningTokens ?? usage.outputTokenDetails.reasoningTokens ?? null,
  };
}

export async function POST(request: Request) {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const authenticatedUserId = userId;
  const authenticatedOrgId = orgId;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const requestMessages = parsed.data.messages;
    const prompt = latestUserPrompt(requestMessages);
    const auditConversation = requestMessages.map((message, index) => ({
      index,
      role: message.role,
      content: compactAuditText(message.content, 2000),
    }));
    let auditLogged = false;

    function logWallyDiscussionAudit({
      status,
      response,
      finishReason,
      usage,
      error,
      toolCallCount,
      toolResultCount,
    }: {
      status: 'completed' | 'error';
      response?: string;
      finishReason?: string;
      usage?: LanguageModelUsage;
      error?: unknown;
      toolCallCount?: number;
      toolResultCount?: number;
    }) {
      if (auditLogged) {
        return;
      }

      auditLogged = true;

      logAudit({
        userId: authenticatedUserId,
        orgId: authenticatedOrgId,
        action: 'UPDATE',
        entity: 'AIAssistantDiscussion',
        metadata: {
          assistant: 'Wally the Wallaby',
          event: 'AI_DISCUSSION',
          model: WALLY_MODEL,
          status,
          messageCount: requestMessages.length,
          latestPrompt: compactAuditText(prompt),
          assistantResponse: compactAuditText(response ?? ''),
          conversation: auditConversation,
          actionsTaken: [
            'BUILT_RBAC_SCOPED_OPERATIONAL_CONTEXT',
            'SENT_PROMPT_TO_AWS_BEDROCK',
            status === 'completed' ? 'STREAMED_ASSISTANT_RESPONSE' : 'AI_RESPONSE_FAILED',
          ],
          assistantToolActions: {
            toolCallCount: toolCallCount ?? 0,
            toolResultCount: toolResultCount ?? 0,
          },
          finishReason: finishReason ?? null,
          usage: auditUsage(usage),
          error: error instanceof Error ? error.message : error ? String(error) : null,
        },
      });
    }

    const role = await getUserRole(authenticatedUserId, authenticatedOrgId);
    const operationalContext = await buildWallyOperationalContext({
      orgId: authenticatedOrgId,
      userId: authenticatedUserId,
      role,
    });

    const result = streamText({
      model: bedrock(WALLY_MODEL),
      system: buildWallySystemPrompt(operationalContext),
      prompt: buildWallyUserPrompt(parsed.data.messages),
      onError({ error }) {
        console.error('[wally] bedrock stream error:', error);
        logWallyDiscussionAudit({
          status: 'error',
          error,
        });
      },
      onFinish({ text, usage, finishReason, toolCalls, toolResults }) {
        console.log(
          `[wally] finished user=${authenticatedUserId} org=${authenticatedOrgId} reason=${finishReason} tokens=${usage?.inputTokens ?? '?'}->${usage?.outputTokens ?? '?'}`
        );
        logWallyDiscussionAudit({
          status: 'completed',
          response: text,
          finishReason,
          usage,
          toolCallCount: toolCalls.length,
          toolResultCount: toolResults.length,
        });
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('[wally] failed:', error);
    return NextResponse.json({ error: 'Wally is unavailable right now' }, { status: 500 });
  }
}
