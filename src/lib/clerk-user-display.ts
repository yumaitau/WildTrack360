'server-only';

import { clerkClient } from '@/lib/clerk-server';

export const CLERK_EMAIL_UNAVAILABLE = 'Email unavailable';

type ClerkEmailAddress = {
  id?: string | null;
  emailAddress?: string | null;
};

type ClerkUserWithEmail = {
  id?: string | null;
  primaryEmailAddressId?: string | null;
  emailAddresses?: ClerkEmailAddress[] | null;
};

type ClerkUserListResponse =
  | { data?: ClerkUserWithEmail[] | null }
  | ClerkUserWithEmail[]
  | null
  | undefined;

type ClerkUsersApi = {
  getUserList: (params: { userId: string[]; limit: number }) => Promise<ClerkUserListResponse>;
};

const CLERK_USER_LIST_BATCH_SIZE = 100;
const CLERK_EMAIL_CACHE_TTL_MS = 5 * 60 * 1000;
const clerkEmailCache = new Map<string, { email: string; expiresAt: number }>();

export function getClerkUserEmail(user: ClerkUserWithEmail | null | undefined): string | null {
  const emails = user?.emailAddresses ?? [];
  const primary = emails.find((email) => email.id && email.id === user?.primaryEmailAddressId);
  return primary?.emailAddress ?? emails[0]?.emailAddress ?? null;
}

export async function resolveClerkUserEmailMap(
  userIds: Iterable<string | null | undefined>
): Promise<Map<string, string>> {
  const ids = [...new Set([...userIds].filter((id): id is string => Boolean(id)))];
  const emails = new Map<string, string>();
  if (ids.length === 0) return emails;

  const now = Date.now();
  const idsToFetch: string[] = [];
  for (const id of ids) {
    const cached = clerkEmailCache.get(id);
    if (cached && cached.expiresAt > now) {
      emails.set(id, cached.email);
    } else {
      idsToFetch.push(id);
    }
  }
  if (idsToFetch.length === 0) return emails;

  let client: Awaited<ReturnType<typeof clerkClient>>;
  try {
    client = await clerkClient();
  } catch {
    for (const id of idsToFetch) emails.set(id, CLERK_EMAIL_UNAVAILABLE);
    return emails;
  }

  const usersApi = client.users as unknown as ClerkUsersApi;
  for (let start = 0; start < idsToFetch.length; start += CLERK_USER_LIST_BATCH_SIZE) {
    const chunk = idsToFetch.slice(start, start + CLERK_USER_LIST_BATCH_SIZE);
    try {
      const response = await usersApi.getUserList({ userId: chunk, limit: chunk.length });
      const users = Array.isArray(response) ? response : response?.data ?? [];
      const returnedIds = new Set<string>();

      for (const user of users) {
        if (!user.id || !chunk.includes(user.id)) continue;
        const email = getClerkUserEmail(user) ?? CLERK_EMAIL_UNAVAILABLE;
        emails.set(user.id, email);
        clerkEmailCache.set(user.id, { email, expiresAt: Date.now() + CLERK_EMAIL_CACHE_TTL_MS });
        returnedIds.add(user.id);
      }

      for (const id of chunk) {
        if (returnedIds.has(id)) continue;
        emails.set(id, CLERK_EMAIL_UNAVAILABLE);
        clerkEmailCache.set(id, {
          email: CLERK_EMAIL_UNAVAILABLE,
          expiresAt: Date.now() + CLERK_EMAIL_CACHE_TTL_MS,
        });
      }
    } catch {
      for (const id of chunk) {
        emails.set(id, CLERK_EMAIL_UNAVAILABLE);
        clerkEmailCache.set(id, {
          email: CLERK_EMAIL_UNAVAILABLE,
          expiresAt: Date.now() + CLERK_EMAIL_CACHE_TTL_MS,
        });
      }
    }
  }

  return emails;
}
