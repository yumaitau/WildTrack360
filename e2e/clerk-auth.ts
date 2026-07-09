import { expect, type Page } from '@playwright/test';
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright';
import { createClerkClient } from '@clerk/backend';

// Sign in `page` using whatever credentials the env provides:
//   - a password  → password strategy (simplest for local runs; needs a Clerk
//     dev instance so setupClerkTestingToken can bypass bot protection).
//   - otherwise    → Backend-API sign-in token (ticket strategy; works on prod
//     sk_live). Requires E2E_CLERK_SECRET_KEY.
export async function signIn(
  page: Page,
  identifier: string,
  password?: string,
): Promise<void> {
  if (password) {
    await signInWithPassword(page, identifier, password);
  } else {
    await signInWithTicket(page, identifier);
  }
}

// Password sign-in via @clerk/testing's helper. Fills Clerk's sign-in form using
// the given identifier + password after a testing token bypasses bot detection.
export async function signInWithPassword(
  page: Page,
  identifier: string,
  password: string,
): Promise<void> {
  await setupClerkTestingToken({ page });
  await page.goto('/sign-in');
  await clerk.loaded({ page });
  await clerk.signIn({
    page,
    signInParams: { strategy: 'password', identifier, password },
  });
  await page.waitForFunction(() => {
    const w = window as unknown as { Clerk?: { user?: unknown } };
    return Boolean(w.Clerk?.user);
  });
}

// Bits of window.Clerk we touch inside the browser.
interface BrowserClerk {
  Clerk: {
    client: {
      signIn: {
        create(opts: {
          strategy: 'ticket';
          ticket: string;
        }): Promise<{ status: string; createdSessionId: string }>;
      };
    };
    setActive(opts: { session: string }): Promise<void>;
  };
}

// Signs `page` in as the Clerk user matching `identifier` (email or username)
// using a Backend-API sign-in token consumed via the ticket strategy — works on
// production instances (unlike testing tokens) and needs no password.
export async function signInWithTicket(
  page: Page,
  identifier: string,
): Promise<void> {
  const secretKey =
    process.env.E2E_CLERK_SECRET_KEY ?? process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error('E2E_CLERK_SECRET_KEY (or CLERK_SECRET_KEY) is required.');
  }

  const clerkClient = createClerkClient({ secretKey });
  const isEmail = identifier.includes('@');
  const list = await clerkClient.users.getUserList(
    isEmail ? { emailAddress: [identifier] } : { username: [identifier] },
  );
  const user = list.data?.[0];
  expect(
    user,
    `No Clerk user found for "${identifier}" in ${process.env.CLERK_FAPI}.`,
  ).toBeTruthy();

  const { token } = await clerkClient.signInTokens.createSignInToken({
    userId: user!.id,
    expiresInSeconds: 300,
  });

  await setupClerkTestingToken({ page });
  await page.goto('/sign-in');
  await clerk.loaded({ page });
  await page.evaluate(async (ticket) => {
    const w = window as unknown as BrowserClerk;
    const signIn = await w.Clerk.client.signIn.create({
      strategy: 'ticket',
      ticket,
    });
    if (signIn.status !== 'complete') {
      throw new Error(
        `Ticket sign-in did not complete (status: ${signIn.status}).`,
      );
    }
    await w.Clerk.setActive({ session: signIn.createdSessionId });
  }, token);
  await page.waitForFunction(() => {
    const w = window as unknown as { Clerk?: { user?: unknown } };
    return Boolean(w.Clerk?.user);
  });
}
