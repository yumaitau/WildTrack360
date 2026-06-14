type ClerkOrganization = {
  id?: string;
  name: string;
};

type ClerkUser = {
  primaryEmailAddressId?: string | null;
  emailAddresses?: { id: string; emailAddress: string }[];
};

type ClerkUserApiResponse = {
  primaryEmailAddressId?: string | null;
  primary_email_address_id?: string | null;
  emailAddresses?: { id: string; emailAddress: string }[];
  email_addresses?: { id: string; email_address: string }[];
};

export class ClerkManagementError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'ClerkManagementError';
  }
}

function clerkSecretKey(): string {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) throw new Error('CLERK_SECRET_KEY is not configured');
  return key;
}

async function clerkGet<T>(path: string): Promise<T> {
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    headers: {
      Authorization: `Bearer ${clerkSecretKey()}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ClerkManagementError(
      `Clerk API request failed (${res.status}): ${body || res.statusText}`,
      res.status
    );
  }

  return res.json() as Promise<T>;
}

export function getClerkOrganization(organizationId: string): Promise<ClerkOrganization> {
  return clerkGet<ClerkOrganization>(`/organizations/${encodeURIComponent(organizationId)}`);
}

export async function getClerkUser(userId: string): Promise<ClerkUser> {
  const user = await clerkGet<ClerkUserApiResponse>(`/users/${encodeURIComponent(userId)}`);
  return {
    primaryEmailAddressId: user.primaryEmailAddressId ?? user.primary_email_address_id ?? null,
    emailAddresses:
      user.emailAddresses ??
      user.email_addresses?.map((email) => ({
        id: email.id,
        emailAddress: email.email_address,
      })) ??
      [],
  };
}
