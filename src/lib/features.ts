'server-only';

import { cache } from 'react';
import { NextResponse } from 'next/server';
import { prisma } from './prisma';

// All gateable features. Keep this list tight — each value here represents a
// product surface that ships dark for new orgs and is flipped on per-org via
// the WildTrack360-Admin app. MEMBERSHIP_PLATFORM wraps the entire member +
// donation + Stripe Connect bundle as a single rollout switch.
export const FEATURES = ['MEMBERSHIP_PLATFORM'] as const;
export type Feature = (typeof FEATURES)[number];

// Per-request memo via React.cache: the same (orgId, feature) pair within a
// single render pass / API handler invocation hits the DB once. Critically,
// the cache scope is the React request, not the Node process — flipping a
// feature in the admin app takes effect on the very next request, not "after
// the container restarts" (which is what a module-scope Map would mean).
const lookupFlag = cache(
  async (orgId: string, feature: Feature): Promise<boolean> => {
    const row = await prisma.orgFeatureFlag.findUnique({
      where: { clerkOrganizationId_feature: { clerkOrganizationId: orgId, feature } },
      select: { enabled: true },
    });
    return row?.enabled ?? false;
  }
);

export async function isFeatureEnabled(orgId: string, feature: Feature): Promise<boolean> {
  return lookupFlag(orgId, feature);
}

// Throw helper for API routes — pair with the existing requirePermission
// pattern so the same try/catch surface keeps Forbidden errors uniform.
export async function requireFeature(orgId: string, feature: Feature): Promise<void> {
  if (!(await isFeatureEnabled(orgId, feature))) {
    throw new FeatureDisabledError(feature);
  }
}

export class FeatureDisabledError extends Error {
  constructor(public readonly feature: Feature) {
    super(`Feature '${feature}' is not enabled for this organisation`);
    this.name = 'FeatureDisabledError';
  }
}

// Used by API routes: returns null when the feature is enabled, or a 404
// Response when it isn't. We pick 404 (not 403) so disabled orgs can't even
// probe for the feature's existence — the route looks like it doesn't exist.
export async function gateFeature(
  orgId: string,
  feature: Feature
): Promise<Response | null> {
  if (await isFeatureEnabled(orgId, feature)) return null;
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
