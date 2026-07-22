import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  buildStoredMentions,
  mentionAppearsInBody,
  readStoredMentions,
  selectMentionRecipients,
} from '@/lib/community/mention-core';

test('mentionAppearsInBody requires the exact @DisplayName token', () => {
  assert.equal(mentionAppearsInBody('hi @Jane Smith!', 'Jane Smith'), true);
  assert.equal(mentionAppearsInBody('hi Jane Smith', 'Jane Smith'), false);
  assert.equal(mentionAppearsInBody('hi @Jane', 'Jane Smith'), false);
});

test('buildStoredMentions drops mentions not actually written in the body', () => {
  const result = buildStoredMentions(
    [
      { id: 'p1', displayName: 'Jane' },
      { id: 'p2', displayName: 'Bob' }, // "@Bob" is absent from the body
    ],
    { body: 'thanks @Jane', authorProfileId: 'author' }
  );
  assert.deepEqual(result, [{ id: 'p1', name: 'Jane' }]);
});

test("buildStoredMentions uses the canonical displayName, not the client's claim", () => {
  // Only the DB-fetched displayName is ever stored; a spoofed client label can't
  // reach the record because the caller passes trusted profiles here.
  const result = buildStoredMentions([{ id: 'p1', displayName: 'Jane' }], {
    body: 'hey @Jane',
    authorProfileId: 'author',
  });
  assert.deepEqual(result, [{ id: 'p1', name: 'Jane' }]);
});

test('buildStoredMentions excludes self-mentions', () => {
  const result = buildStoredMentions([{ id: 'self', displayName: 'Me' }], {
    body: 'note to @Me',
    authorProfileId: 'self',
  });
  assert.deepEqual(result, []);
});

test('readStoredMentions tolerates malformed JSON shapes', () => {
  assert.deepEqual(
    readStoredMentions([
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ]),
    [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ]
  );
  assert.deepEqual(readStoredMentions([{ id: 'a' }, 'junk', null, { name: 'no id' }]), []);
  assert.deepEqual(readStoredMentions(null), []);
  assert.deepEqual(readStoredMentions('not an array'), []);
});

test('selectMentionRecipients excludes actor + excludeIds and dedupes', () => {
  const recipients = selectMentionRecipients(
    [
      { id: 'actor', name: 'Actor' }, // self — skipped
      { id: 'excluded', name: 'Ex' }, // excludeIds — skipped
      { id: 'u1', name: 'One' },
      { id: 'u1', name: 'One' }, // duplicate — collapsed
      { id: 'u2', name: 'Two' },
    ],
    { actorId: 'actor', excludeIds: ['excluded'] }
  );
  assert.deepEqual(
    recipients.map((r) => r.id),
    ['u1', 'u2']
  );
});
