// Pure @mention logic — no DB, no server-only guard — so it is unit-testable and
// reusable. The impure orchestration (profile lookup, notification writes) lives
// in mentions.ts.

export type StoredMention = { id: string; name: string };

// A mention is "present" only when the exact "@DisplayName" token appears in the
// body. This blocks invisible mentions (notify someone with no visible reference)
// and name spoofing (show "@Alice" but notify Bob).
export function mentionAppearsInBody(body: string, displayName: string): boolean {
  return body.includes(`@${displayName}`);
}

// Turn the profiles that actually exist and are ACTIVE (already fetched) into the
// trustworthy stored list: the profile's real displayName must appear as
// "@DisplayName" in the body, self-mentions are dropped, and the stored name is
// always the canonical displayName — never the client's claim.
export function buildStoredMentions(
  profiles: { id: string; displayName: string }[],
  opts: { body: string; authorProfileId: string }
): StoredMention[] {
  return profiles
    .filter((profile) => profile.id !== opts.authorProfileId)
    .filter((profile) => mentionAppearsInBody(opts.body, profile.displayName))
    .map((profile) => ({ id: profile.id, name: profile.displayName }));
}

// The distinct recipients to notify: never the actor, never an excluded id (e.g.
// the person already getting a direct REPLY), and each id at most once.
export function selectMentionRecipients(
  mentions: StoredMention[],
  opts: { actorId: string; excludeIds?: string[] }
): StoredMention[] {
  const exclude = new Set([opts.actorId, ...(opts.excludeIds ?? [])]);
  const seen = new Set<string>();
  const recipients: StoredMention[] = [];
  for (const mention of mentions) {
    if (exclude.has(mention.id) || seen.has(mention.id)) continue;
    seen.add(mention.id);
    recipients.push(mention);
  }
  return recipients;
}

// Narrow Prisma's stored JsonValue back to the mention shape we wrote.
export function readStoredMentions(value: unknown): StoredMention[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) =>
    entry &&
    typeof entry === 'object' &&
    'id' in entry &&
    'name' in entry &&
    typeof (entry as { id: unknown }).id === 'string' &&
    typeof (entry as { name: unknown }).name === 'string'
      ? [{ id: (entry as { id: string }).id, name: (entry as { name: string }).name }]
      : []
  );
}
