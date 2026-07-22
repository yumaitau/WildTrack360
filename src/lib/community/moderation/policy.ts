import { createHash } from 'node:crypto';

export const COMMUNITY_MODERATION_POLICY_VERSION = 'community-2026-07-20-v1';

export interface DeterministicSignal {
  category: string;
  reasonCode: string;
  recommendation: 'REVIEW' | 'HOLD';
}

export function communityContentHash(title: string | null, body: string) {
  return createHash('sha256')
    .update(`${title?.trim() ?? ''}\n${body.trim()}`, 'utf8')
    .digest('hex');
}

export function deterministicCommunitySignals(
  title: string | null,
  body: string
): DeterministicSignal[] {
  const text = `${title ?? ''}\n${body}`;
  const signals: DeterministicSignal[] = [];

  // Decimal coordinates precise enough to identify a nest, cultural place or
  // incident location. Broad place names remain legitimate community context.
  if (/-?\d{1,2}\.\d{4,}\s*[, ]\s*-?\d{2,3}\.\d{4,}/.test(text)) {
    signals.push({
      category: 'sensitive_location',
      reasonCode: 'exact_coordinates',
      recommendation: 'HOLD',
    });
  }
  if (
    /\b(ignore|disregard)\s+(all\s+)?(previous|system|moderation)(?:\s+(?:system|moderation|previous)){0,2}\s+(instructions?|rules?)\b/i.test(
      text
    )
  ) {
    signals.push({
      category: 'prompt_injection',
      reasonCode: 'instruction_override_attempt',
      recommendation: 'REVIEW',
    });
  }
  if (
    /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i.test(text) ||
    /(?:\+?61|0)[2-478](?:[ -]?\d){8}\b/.test(text)
  ) {
    signals.push({
      category: 'personal_information',
      reasonCode: 'contact_details',
      recommendation: 'REVIEW',
    });
  }
  const links = text.match(/https?:\/\//gi)?.length ?? 0;
  if (links > 5) {
    signals.push({ category: 'spam', reasonCode: 'link_volume', recommendation: 'REVIEW' });
  }
  if (/\b(call 000|emergency happening now|urgent rescue now)\b/i.test(text)) {
    signals.push({
      category: 'urgent_safety',
      reasonCode: 'emergency_channel',
      recommendation: 'REVIEW',
    });
  }
  return signals;
}
