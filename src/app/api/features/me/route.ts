import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { FEATURES, isFeatureEnabled, type Feature } from '@/lib/features';
import { route } from '@/lib/openapi/route';
import { getMyFeaturesContract } from './openapi';

export const GET = route(getMyFeaturesContract, async () => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const enabled: Partial<Record<Feature, boolean>> = {};
  for (const feature of FEATURES) {
    enabled[feature] = await isFeatureEnabled(orgId, feature);
  }
  return { data: enabled };
});
