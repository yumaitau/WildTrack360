import { test } from 'vitest';
import assert from 'node:assert/strict';

// blocks.ts imports "server-only"; stub it before the lazy import (see
// community-epic.test.ts for the pattern).

type BlocksModule = typeof import('@/lib/community/blocks');
let cached: BlocksModule | null = null;
async function blocksModule(): Promise<BlocksModule> {
  if (!cached) cached = (await import('@/lib/community/blocks')) as BlocksModule;
  return cached;
}

test('collectBlockRelatedIds returns both directions, deduped, viewer excluded', async () => {
  const { collectBlockRelatedIds } = await blocksModule();
  const rows = [
    { blockerId: 'me', blockedId: 'a' }, // I blocked a
    { blockerId: 'b', blockedId: 'me' }, // b blocked me
    { blockerId: 'me', blockedId: 'a' }, // dup
    { blockerId: 'c', blockedId: 'me' }, // c blocked me
  ];
  assert.deepEqual(collectBlockRelatedIds(rows, 'me').sort(), ['a', 'b', 'c']);
});

test('collectBlockRelatedIds is empty when the viewer has no block relations', async () => {
  const { collectBlockRelatedIds } = await blocksModule();
  assert.deepEqual(collectBlockRelatedIds([], 'me'), []);
});
