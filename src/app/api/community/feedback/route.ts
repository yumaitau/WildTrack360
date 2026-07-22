import { NextResponse } from 'next/server';
import { readJson, requireCommunitySession, validationError } from '@/lib/community/api';
import { takeCommunityRateLimit } from '@/lib/community/rate-limit';
import { communityFeedbackSchema } from '@/lib/community/validation';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const auth = await requireCommunitySession({ write: true, profile: true });
  if ('error' in auth) return auth.error;
  const body = await readJson(request);
  if ('error' in body) return body.error;
  const parsed = communityFeedbackSchema.safeParse(body.data);
  if (!parsed.success) return validationError(parsed.error.issues);
  const rate = await takeCommunityRateLimit(auth.session.profile!.id, 'feedback');
  if (!rate.allowed) return NextResponse.json({ error: 'Feedback limit reached' }, { status: 429 });
  const feedback = await prisma.communityBetaFeedback.create({
    data: {
      profileId: auth.session.profile!.id,
      type: parsed.data.type,
      message: parsed.data.message,
      requestedFeatures: parsed.data.requestedFeatures,
      pageContext: parsed.data.pageContext ?? null,
      contactConsent: parsed.data.contactConsent,
    },
    select: { id: true, status: true },
  });
  return NextResponse.json(feedback, { status: 201 });
}
