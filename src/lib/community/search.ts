import 'server-only';

import { Prisma } from '@prisma/client';
import { getBlockedProfileIds } from './blocks';
import { prisma } from '@/lib/prisma';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_QUERY_LENGTH = 200;

export type CommunitySearchRow = {
  id: string;
  title: string | null;
  type: string;
  categoryId: string;
  lastActivityAt: Date;
};

export type CommunitySearchResult = {
  results: CommunitySearchRow[];
  nextCursor: string | null;
};

function sanitiseQuery(q: string): string {
  return q.trim().slice(0, MAX_QUERY_LENGTH);
}

// Beta-scale full-text search over published posts. There is no dedicated
// tsvector column or GIN index yet — a GIN index over
// to_tsvector('english', title || body) is the scale follow-up once traffic
// justifies it. Keyset pagination uses (lastActivityAt, id) so ties are stable.
export async function searchCommunityPosts(input: {
  q: string;
  cursor?: string | null;
  limit?: number;
  viewerProfileId?: string | null;
}): Promise<CommunitySearchResult> {
  const q = sanitiseQuery(input.q ?? '');
  if (!q) return { results: [], nextCursor: null };

  const limit = Math.min(Math.max(1, input.limit ?? DEFAULT_LIMIT), MAX_LIMIT);
  const take = limit + 1;
  const cursor = input.cursor?.trim() || null;

  const cursorCondition = cursor
    ? Prisma.sql`AND ("lastActivityAt", "id") < (
        SELECT "lastActivityAt", "id" FROM "CommunityPost" WHERE "id" = ${cursor}
      )`
    : Prisma.empty;

  // Hide blocked members' posts from the viewer's results.
  const blockedIds = input.viewerProfileId ? await getBlockedProfileIds(input.viewerProfileId) : [];
  const blockCondition = blockedIds.length
    ? Prisma.sql`AND "authorId" NOT IN (${Prisma.join(blockedIds)})`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<CommunitySearchRow[]>`
    SELECT "id", "title", "type"::text AS "type", "categoryId", "lastActivityAt"
    FROM "CommunityPost"
    WHERE "status" = 'PUBLISHED'
      AND "deletedAt" IS NULL
      AND to_tsvector('english', coalesce("title", '') || ' ' || coalesce("body", ''))
          @@ websearch_to_tsquery('english', ${q})
      ${blockCondition}
      ${cursorCondition}
    ORDER BY "lastActivityAt" DESC, "id" DESC
    LIMIT ${take}
  `;

  const nextCursor = rows.length > limit ? rows[limit - 1].id : null;
  return { results: rows.slice(0, limit), nextCursor };
}
