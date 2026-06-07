import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { FEATURES, isFeatureEnabled, type Feature } from '@/lib/features';

// Returns the active org's enabled-feature set so client components can hide
// nav items + buttons for dark features without round-tripping to each gated
// API. Safe to expose: this leaks only the org's own configuration.
export async function GET() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const enabled: Partial<Record<Feature, boolean>> = {};
  for (const feature of FEATURES) {
    enabled[feature] = await isFeatureEnabled(orgId, feature);
  }
  return NextResponse.json(enabled);
}
