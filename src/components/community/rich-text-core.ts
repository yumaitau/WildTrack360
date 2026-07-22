// Pure, framework-free core of the Community rich-text renderer. Kept in a .ts
// file (no JSX) so the adversarial link/scheme safety can be unit-tested without
// a React/JSX transform. The .tsx component re-exports these and renders the
// segments; React escapes every text node on output.

// Matches http(s) URLs and bare www. links, stopping before trailing
// punctuation so a link at the end of a sentence doesn't swallow the full stop.
// Single-pass, no nested quantifier — linear time, not ReDoS-prone.
export const LINK_RE = /(https?:\/\/[^\s<]+[^\s<.,:;!?"')\]}]|www\.[^\s<]+[^\s<.,:;!?"')\]}])/gi;

export interface MentionRef {
  id: string;
  name: string;
}

export interface RichSegment {
  value: string;
  // Non-null only for link segments. Because LINK_RE requires an http(s)://
  // or www. prefix, href can never carry a javascript:/data:/vbscript: (or any
  // other) scheme — those never match and fall through as escaped plain text.
  href: string | null;
  // Non-null only for @mention segments — the referenced community profile id.
  mentionId: string | null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function splitMentions(value: string, mentions: MentionRef[]): RichSegment[] {
  if (mentions.length === 0) return [{ value, href: null, mentionId: null }];
  // Longest token first so "@Jane Smith" wins over "@Jane" at the same position
  // (JS alternation is ordered, not longest-match). Case-sensitive: the composer
  // inserts the exact displayName and the body carries it verbatim.
  const byToken = new Map(mentions.map((m) => [`@${m.name}`, m.id]));
  const tokens = [...byToken.keys()].sort((a, b) => b.length - a.length);
  const re = new RegExp(`(${tokens.map(escapeRegExp).join('|')})`, 'g');
  return value.split(re).map((part, index) => ({
    value: part,
    href: null,
    mentionId: index % 2 === 1 ? (byToken.get(part) ?? null) : null,
  }));
}

// Pure text → segment parser. First splits out URLs (odd indices of a
// capture-group split are the matches), then splits the remaining plain-text
// runs on known @mention tokens. Concatenating every segment.value reproduces
// the input exactly (loss-free).
export function parseCommunityRichText(text: string, mentions: MentionRef[] = []): RichSegment[] {
  return text.split(LINK_RE).flatMap((value, index) => {
    if (index % 2 === 1) {
      return [
        { value, href: value.startsWith('www.') ? `https://${value}` : value, mentionId: null },
      ];
    }
    return splitMentions(value, mentions);
  });
}
