import { NextResponse } from 'next/server';
import { requireCommunityModerator } from '@/lib/community/admin';
import { computeCommunityMetrics } from '@/lib/community/metrics';

export async function GET() {
  const auth = await requireCommunityModerator();
  if ('error' in auth) return auth.error;

  const metrics = await computeCommunityMetrics();
  return NextResponse.json(metrics, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
