'server-only';

import { NextResponse } from 'next/server';
import { prisma } from './prisma';

// All gateable features. Keep this list tight — each value here represents a
// product surface that ships dark for new orgs and is flipped on per-org via
// the WildTrack360-Admin app. MEMBERSHIP_PLATFORM wraps the entire member +
// donation + Stripe Connect bundle as a single rollout switch.
export const FEATURES = ['MEMBERSHIP_PLATFORM'] as const;
export type Feature = (typeof FEATURES)[number];

// Per-request cache so layout + page + many API calls in the same request
// don't all round-trip to the DB. The Next.js server invokes this within a
// single rendering pass so an in-memory Map keyed by `${orgId}:${feature}` is
// safe; the cache GC happens naturally between requests.
const cache = new Map<string, boolean>();

function cacheKey(orgId: string, feature: Feature): string {
  return `${orgId}:${feature}`;
}

export async function isFeatureEnabled(orgId: string, feature: Feature): Promise<boolean> {
  const key = cacheKey(orgId, feature);
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  const row = await prisma.orgFeatureFlag.findUnique({
    where: { clerkOrganizationId_feature: { clerkOrganizationId: orgId, feature } },
    select: { enabled: true },
  });
  const enabled = row?.enabled ?? false;
  cache.set(key, enabled);
  return enabled;
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
