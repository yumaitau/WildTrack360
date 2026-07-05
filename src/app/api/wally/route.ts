import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { bedrock } from '@ai-sdk/amazon-bedrock';
import { streamText, stepCountIs, type LanguageModelUsage } from 'ai';
import { z } from 'zod';
import { logAudit } from '@/lib/audit';
import { getUserRole } from '@/lib/rbac';
import { WALLY_MAX_HISTORY, WALLY_USAGE_TIME_ZONE } from '@/lib/wally/constants';
import {
  buildWallyOperationalContext,
  buildWallySystemPrompt,
  buildWallyUserPrompt,
  WALLY_MODEL,
} from '@/lib/wally/context';
import { buildWallyTools } from '@/lib/wally/tools';
import { reserveWallyOrgMessage } from '@/lib/wally/usage';
import { isScreenshotMode } from '@/lib/screenshot-mode';
import { streamScreenshotWords } from '@/lib/wally/screenshot-reply';
import { route } from '@/lib/openapi/route';
import { wallyContract } from './openapi';

export const runtime = 'nodejs';

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(4000),
});

const RequestSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(WALLY_MAX_HISTORY),
});

const MAX_AUDIT_TEXT_LENGTH = 6000;

type WallyMessage = z.infer<typeof MessageSchema>;

function compactAuditText(value: string, maxLength = MAX_AUDIT_TEXT_LENGTH) {
  const compacted = value.replace(/\s+/g, ' ').trim();
  if (compacted.length <= maxLength) return compacted;
  return `${compacted.slice(0, maxLength)}... [truncated]`;
}

function latestUserPrompt(messages: WallyMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === 'user') return messages[index].content;
  }
  return '';
}

function auditUsage(usage?: LanguageModelUsage) {
  if (!usage) return null;
  return {
    inputTokens: usage.inputTokens ?? null,
    outputTokens: usage.outputTokens ?? null,
    totalTokens: usage.totalTokens ?? null,
    cachedInputTokens: usage.cachedInputTokens ?? usage.inputTokenDetails.cacheReadTokens ?? null,
    reasoningTokens: usage.reasoningTokens ?? usage.outputTokenDetails.reasoningTokens ?? null,
  };
}

export const POST = route(wallyContract, async ({ request }) => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
  }

  if (isScreenshotMode()) {
    return new Response(streamScreenshotWords(), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  try {
    const requestMessages = parsed.data.messages;
    const prompt = latestUserPrompt(requestMessages);
    const usageReservation = await reserveWallyOrgMessage(authenticatedOrgId);

    if (!usageReservation.allowed) {
      return NextResponse.json(
        {
          error: `Wally has reached the daily limit of ${usageReservation.limit} messages for this organisation. Try again tomorrow.`,
          limit: usageReservation.limit,
          used: usageReservation.used,
          remaining: usageReservation.remaining,
          dateKey: usageReservation.dateKey,
          timeZone: WALLY_USAGE_TIME_ZONE,
        },
        { status: 429 }
      );
    }

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
      toolNames,
    }: {
      status: 'completed' | 'error';
      response?: string;
      finishReason?: string;
      usage?: LanguageModelUsage;
      error?: unknown;
      toolCallCount?: number;
      toolResultCount?: number;
      toolNames?: string[];
    }) {
      if (auditLogged) return;
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
            toolNames: toolNames ?? [],
          },
          quota: {
            limit: usageReservation.limit,
            used: usageReservation.used,
            remaining: usageReservation.remaining,
            dateKey: usageReservation.dateKey,
            timeZone: WALLY_USAGE_TIME_ZONE,
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
      tools: buildWallyTools({
        userId: authenticatedUserId,
        orgId: authenticatedOrgId,
        role,
      }),
      stopWhen: stepCountIs(8),
      onError({ error }) {
        console.error('[wally] bedrock stream error:', error);
        logWallyDiscussionAudit({ status: 'error', error });
      },
      onFinish({ text, usage, finishReason, steps }) {
        const toolCalls = steps.flatMap((step) => step.toolCalls);
        const toolResults = steps.flatMap((step) => step.toolResults);
        console.log(
          `[wally] finished user=${authenticatedUserId} org=${authenticatedOrgId} reason=${finishReason} tools=${toolCalls.length} tokens=${usage?.inputTokens ?? '?'}->${usage?.outputTokens ?? '?'}`
        );
        logWallyDiscussionAudit({
          status: 'completed',
          response: text,
          finishReason,
          usage,
          toolCallCount: toolCalls.length,
          toolResultCount: toolResults.length,
          toolNames: toolCalls.map((call) => call.toolName),
        });
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('[wally] failed:', error);
    return NextResponse.json({ error: 'Wally is unavailable right now' }, { status: 500 });
  }
});
