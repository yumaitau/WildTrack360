'server-only';

import { clerkClient } from '@/lib/clerk-server';

export const CLERK_EMAIL_UNAVAILABLE = 'Email unavailable';

type ClerkEmailAddress = {
  id?: string | null;
  emailAddress?: string | null;
};

type ClerkUserWithEmail = {
  primaryEmailAddressId?: string | null;
  emailAddresses?: ClerkEmailAddress[] | null;
};

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

  let client: Awaited<ReturnType<typeof clerkClient>>;
  try {
    client = await clerkClient();
  } catch {
    return new Map(ids.map((id) => [id, CLERK_EMAIL_UNAVAILABLE]));
  }

  await Promise.all(
    ids.map(async (id) => {
      try {
        const user = await client.users.getUser(id);
        emails.set(id, getClerkUserEmail(user) ?? CLERK_EMAIL_UNAVAILABLE);
      } catch {
        emails.set(id, CLERK_EMAIL_UNAVAILABLE);
      }
    })
  );

  return emails;
}
