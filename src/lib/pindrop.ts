import 'server-only';

import { prisma } from './prisma';
import crypto from 'crypto';

/**
 * Timing-safe comparison of access tokens.
 */
export function verifyAccessToken(provided: string, stored: string): boolean {
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(stored, 'utf8');
  if (a.byteLength !== b.byteLength) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Fetch a pindrop session by ID and validate the access token.
 * Returns the session if valid, null otherwise.
 */
export async function getSessionForPublicAccess(
  sessionId: string,
  token: string
) {
  const session = await prisma.pindropSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) return null;
  if (!verifyAccessToken(token, session.accessToken)) return null;

  return session;
}
