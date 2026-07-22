import 'server-only';

import { NextResponse } from 'next/server';
import { communityAccessMessage, getCommunitySession } from './access';

/**
 * Gate a Community API route. Returns either the resolved session or a ready
 * error Response. Missing feature/access is a 403 with the reason so the client
 * can route the user to onboarding or an access-denied state; unauthenticated is
 * a 401. `write` also requires canWrite (mute/ban/role); `profile` requires a
 * completed, guideline-accepted profile.
 */
export async function requireCommunitySession(
  options: { write?: boolean; profile?: boolean } = {}
) {
  const session = await getCommunitySession();
  if (!session) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (!session.access.canRead || (options.write && !session.access.canWrite)) {
    return {
      error: NextResponse.json(
        { error: communityAccessMessage(session.access.reason), reason: session.access.reason },
        { status: 403 }
      ),
    };
  }
  if (options.profile && (!session.profile || !session.hasAcceptedGuidelines)) {
    return {
      error: NextResponse.json(
        { error: 'Complete Community onboarding first', onboardingRequired: true },
        { status: 403 }
      ),
    };
  }
  return { session };
}

export async function readJson(request: Request) {
  try {
    return { data: (await request.json()) as unknown };
  } catch {
    return { error: NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) };
  }
}

export function validationError(issues: unknown) {
  return NextResponse.json({ error: 'Validation failed', issues }, { status: 400 });
}
