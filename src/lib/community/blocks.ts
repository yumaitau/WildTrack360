import 'server-only';

import { prisma } from '@/lib/prisma';

// Profile ids the viewer has blocked. Their content is filtered out of the
// viewer's feed, post detail, comments, chat, search and member profile — a
// personal, one-directional mute (distinct from reporting).
export async function getBlockedProfileIds(profileId: string): Promise<string[]> {
  const rows = await prisma.communityBlock.findMany({
    where: { blockerId: profileId },
    select: { blockedId: true },
  });
  return rows.map((r) => r.blockedId);
}

// Given the viewer's block rows (in either direction), the set of OTHER profile
// ids involved — deduped, viewer excluded. Pure, so it's unit-testable.
export function collectBlockRelatedIds(
  rows: Array<{ blockerId: string; blockedId: string }>,
  profileId: string
): string[] {
  const ids = new Set<string>();
  for (const r of rows) {
    if (r.blockerId !== profileId) ids.add(r.blockerId);
    if (r.blockedId !== profileId) ids.add(r.blockedId);
  }
  return Array.from(ids);
}

// Both directions of a block relationship for the viewer — everyone they blocked
// AND everyone who blocked them. Used by the @mention typeahead so neither party
// can surface the other for a mention.
export async function getBlockRelatedProfileIds(profileId: string): Promise<string[]> {
  const rows = await prisma.communityBlock.findMany({
    where: { OR: [{ blockerId: profileId }, { blockedId: profileId }] },
    select: { blockerId: true, blockedId: true },
  });
  return collectBlockRelatedIds(rows, profileId);
}
