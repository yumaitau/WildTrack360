import { createHmac, timingSafeEqual } from 'node:crypto';

export type UnsubscribeScope = 'all' | 'downgrade' | 'target';
export type UnsubscribeTargetType = 'POST' | 'CATEGORY' | 'CHAT_ROOM';

export interface UnsubscribePayload {
  profileId: string;
  scope: UnsubscribeScope;
  targetType?: UnsubscribeTargetType;
  targetId?: string;
  // Absolute expiry as epoch milliseconds.
  exp: number;
}

// Default token lifetime — long enough to survive an inbox that sits unread for
// a while, short enough that a leaked link eventually stops working.
export const UNSUBSCRIBE_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;

function secret(): string {
  return process.env.COMMUNITY_UNSUBSCRIBE_SECRET ?? process.env.CRON_SECRET ?? '';
}

function sign(body: string, key: string): string {
  return createHmac('sha256', key).update(body).digest('base64url');
}

function isScope(value: unknown): value is UnsubscribeScope {
  return value === 'all' || value === 'downgrade' || value === 'target';
}

function isTargetType(value: unknown): value is UnsubscribeTargetType {
  return value === 'POST' || value === 'CATEGORY' || value === 'CHAT_ROOM';
}

export function signUnsubscribeToken(payload: UnsubscribePayload): string {
  const key = secret();
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${body}.${sign(body, key)}`;
}

// Builds a signed token that expires `ttlMs` from `now`.
export function buildUnsubscribeToken(
  input: Omit<UnsubscribePayload, 'exp'>,
  now: Date,
  ttlMs: number = UNSUBSCRIBE_TOKEN_TTL_MS
): string {
  return signUnsubscribeToken({ ...input, exp: now.getTime() + ttlMs });
}

// Returns the payload only when the HMAC matches and the token has not expired.
// An empty secret can never verify, so tokens are dead in unconfigured envs.
export function verifyUnsubscribeToken(token: string, now: Date): UnsubscribePayload | null {
  const key = secret();
  if (!key) return null;
  if (typeof token !== 'string') return null;

  const dot = token.indexOf('.');
  if (dot <= 0 || dot >= token.length - 1) return null;
  const body = token.slice(0, dot);
  const mac = token.slice(dot + 1);

  const expected = sign(body, key);
  const macBuf = Buffer.from(mac);
  const expectedBuf = Buffer.from(expected);
  if (macBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(macBuf, expectedBuf)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const payload = parsed as Record<string, unknown>;

  if (typeof payload.profileId !== 'string' || !payload.profileId) return null;
  if (!isScope(payload.scope)) return null;
  if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) return null;
  if (now.getTime() > payload.exp) return null;

  if (payload.scope === 'target') {
    if (!isTargetType(payload.targetType)) return null;
    if (typeof payload.targetId !== 'string' || !payload.targetId) return null;
  }

  return {
    profileId: payload.profileId,
    scope: payload.scope,
    targetType: isTargetType(payload.targetType) ? payload.targetType : undefined,
    targetId: typeof payload.targetId === 'string' ? payload.targetId : undefined,
    exp: payload.exp,
  };
}
