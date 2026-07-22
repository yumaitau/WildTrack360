import { test } from 'vitest';
import assert from 'node:assert/strict';

type Mod = typeof import('@/lib/community/reaction-summary');
let cached: Mod | null = null;
async function mod(): Promise<Mod> {
  if (!cached) cached = (await import('@/lib/community/reaction-summary')) as Mod;
  return cached;
}

test('tallyReactionOwners counts per owner and drops self-reactions', async () => {
  const { tallyReactionOwners } = await mod();
  const counts = tallyReactionOwners([
    { profileId: 'r1', post: { authorId: 'owner-a' }, comment: null, chatMessage: null },
    { profileId: 'r2', post: { authorId: 'owner-a' }, comment: null, chatMessage: null },
    { profileId: 'r1', post: null, comment: { authorId: 'owner-b' }, chatMessage: null },
    // Self-reaction: owner-a reacting to their own post — excluded.
    { profileId: 'owner-a', post: { authorId: 'owner-a' }, comment: null, chatMessage: null },
    // Chat reaction for owner-b.
    { profileId: 'r3', post: null, comment: null, chatMessage: { authorId: 'owner-b' } },
  ]);
  assert.equal(counts.get('owner-a'), 2);
  assert.equal(counts.get('owner-b'), 2);
  assert.equal(counts.size, 2);
});

test('reactionSummaryTitle is singular vs plural', async () => {
  const { reactionSummaryTitle } = await mod();
  assert.match(reactionSummaryTitle(1), /Someone reacted/);
  assert.match(reactionSummaryTitle(5), /5 new reactions/);
});
