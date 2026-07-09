// Playwright global setup. We do NOT call @clerk/testing's clerkSetup() here:
// it mints a Clerk *testing token*, which the Backend API only issues for
// development instances — it fails against a production (sk_live) instance.
//
// Instead we derive the Clerk Frontend API host from the publishable key and
// expose it as CLERK_FAPI, which setupClerkTestingToken() needs during the
// one-time sign-in (clerk-auth.ts). Real sign-in is a Backend-API sign-in token
// (ticket strategy), which works on production instances.

// pk_(test|live)_<base64> decodes to "<frontendApi>$".
function frontendApiFromPublishableKey(pk: string): string | undefined {
  const encoded = pk.split('_')[2];
  if (!encoded) return undefined;
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  return decoded.replace(/\$+$/, '') || undefined;
}

export default async function globalSetup() {
  const secretKey =
    process.env.E2E_CLERK_SECRET_KEY ?? process.env.CLERK_SECRET_KEY;
  const publishableKey =
    process.env.E2E_CLERK_PUBLISHABLE_KEY ??
    process.env.CLERK_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  // The secret key is only needed for the ticket strategy (signInWithTicket
  // throws its own error if it's missing). Password auth doesn't use it, so it's
  // optional here. The publishable key is always needed to derive CLERK_FAPI.
  if (!publishableKey) {
    throw new Error(
      'E2E_CLERK_PUBLISHABLE_KEY (or CLERK_PUBLISHABLE_KEY / NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) is required.',
    );
  }

  const fapi = frontendApiFromPublishableKey(publishableKey);
  if (!fapi) {
    throw new Error(
      `Could not derive Clerk Frontend API from "${publishableKey}".`,
    );
  }
  process.env.CLERK_FAPI = fapi;

  // Normalise so downstream Clerk SDK calls (which read CLERK_SECRET_KEY) work
  // even when only the E2E_-prefixed vars are set.
  if (secretKey && !process.env.CLERK_SECRET_KEY) {
    process.env.CLERK_SECRET_KEY = secretKey;
  }
}
