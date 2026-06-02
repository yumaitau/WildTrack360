import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { bedrock } from '@ai-sdk/amazon-bedrock';
import { streamText } from 'ai';
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

export async function POST(request: Request) {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
    const role = await getUserRole(userId, orgId);
    const operationalContext = await buildWallyOperationalContext({
      orgId,
      userId,
      role,
    });

    const result = streamText({
      model: bedrock(WALLY_MODEL),
      system: buildWallySystemPrompt(operationalContext),
      prompt: buildWallyUserPrompt(parsed.data.messages),
      onError({ error }) {
        console.error('[wally] bedrock stream error:', error);
      },
      onFinish({ usage, finishReason }) {
        console.log(
          `[wally] finished user=${userId} org=${orgId} reason=${finishReason} tokens=${usage?.inputTokens ?? '?'}->${usage?.outputTokens ?? '?'}`
        );
      },
    });

    logAudit({
      userId,
      orgId,
      action: 'UPDATE',
      entity: 'Wally',
      metadata: {
        model: WALLY_MODEL,
        messageCount: parsed.data.messages.length,
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('[wally] failed:', error);
    return NextResponse.json({ error: 'Wally is unavailable right now' }, { status: 500 });
  }
}
