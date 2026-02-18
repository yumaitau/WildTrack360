import 'server-only';

import { prisma } from './prisma';
import crypto from 'crypto';

/**
 * Timing-safe comparison of access tokens to prevent timing attacks.
 */
export function verifyAccessToken(provided: string, stored: string): boolean {
  if (provided.length !== stored.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(provided),
    Buffer.from(stored)
  );
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
