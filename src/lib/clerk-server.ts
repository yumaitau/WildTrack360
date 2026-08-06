import 'server-only';

import {
  auth as realAuth,
  clerkClient as realClerkClient,
  currentUser as realCurrentUser,
} from '@clerk/nextjs/server';
import {
  DEMO_CLERK_USERS,
  SCREENSHOT_DEMO_ORG_ID,
  SCREENSHOT_DEMO_ORG_NAME,
  SCREENSHOT_DEMO_ORG_SLUG,
  SCREENSHOT_DEMO_USER_ID,
  assertScreenshotModeSafe,
  isScreenshotMode,
} from '@/lib/screenshot-mode';
import { resolveOrgIdForRequest } from '@/lib/org-resolver';

const demoOrg = {
  id: SCREENSHOT_DEMO_ORG_ID,
  name: SCREENSHOT_DEMO_ORG_NAME,
  slug: SCREENSHOT_DEMO_ORG_SLUG,
  publicMetadata: {
    org_url: SCREENSHOT_DEMO_ORG_SLUG,
    jurisdiction: 'NSW',
  },
  privateMetadata: {},
};

function demoPublicUserData(user: (typeof DEMO_CLERK_USERS)[number]) {
  return {
    userId: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    identifier: user.email,
    imageUrl: user.imageUrl,
  };
}

function demoEmail(user: (typeof DEMO_CLERK_USERS)[number]) {
  return {
    id: `email-${user.id}`,
    emailAddress: user.email,
  };
}

function demoUser(userId = SCREENSHOT_DEMO_USER_ID) {
  const user = DEMO_CLERK_USERS.find((item) => item.id === userId) ?? DEMO_CLERK_USERS[0];

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`,
    username: null,
    imageUrl: user.imageUrl,
    publicMetadata: {
      phoneNumber: '+61 400 800 123',
    },
    emailAddresses: [demoEmail(user)],
    primaryEmailAddress: demoEmail(user),
    primaryPhoneNumber: {
      phoneNumber: '+61 400 800 123',
    },
  };
}

function membershipFor(user: (typeof DEMO_CLERK_USERS)[number]) {
  return {
    id: `mem-${user.id}`,
    role: user.role,
    organization: demoOrg,
    publicUserData: demoPublicUserData(user),
  };
}

const demoMemberships = DEMO_CLERK_USERS.map(membershipFor);

function demoAuthPayload() {
  return {
    userId: SCREENSHOT_DEMO_USER_ID,
    orgId: SCREENSHOT_DEMO_ORG_ID,
    sessionId: 'demo-session-wildtrack360',
    sessionClaims: {
      org_id: SCREENSHOT_DEMO_ORG_ID,
      org_slug: SCREENSHOT_DEMO_ORG_SLUG,
      org_url: SCREENSHOT_DEMO_ORG_SLUG,
      org_role: 'org:admin',
    },
  };
}

// Issue #56: for database-managed organisations (DB_ORG_SOURCE feature flag
// set from the WildTrack360-Admin panel, a "worg_" DB-native org, or the
// ORG_SOURCE=db global override) the session's orgId no longer comes from
// Clerk Organizations — it resolves from the request subdomain + OrgMember
// membership (see org-resolver.ts). Legacy orgs keep the Clerk session orgId
// untouched. Every server-side `const { orgId } = await auth()` in the app
// imports from this module, so overriding here cuts the whole codebase over
// at one choke point.
async function withDbOrgId<T extends { userId: string | null; orgId?: string | null }>(
  session: T
): Promise<T> {
  if (!session?.userId) return session;
  const orgId = await resolveOrgIdForRequest(session.userId, session.orgId ?? null);
  return Object.assign(session, { orgId }) as T;
}

async function authImpl() {
  if (isScreenshotMode()) {
    assertScreenshotModeSafe();
    return demoAuthPayload() as any;
  }

  return withDbOrgId(await realAuth());
}

export const auth = Object.assign(authImpl, {
  protect: async () => {
    if (isScreenshotMode()) {
      assertScreenshotModeSafe();
      return demoAuthPayload() as any;
    }

    return withDbOrgId(await realAuth.protect());
  },
});

export async function currentUser() {
  if (isScreenshotMode()) {
    assertScreenshotModeSafe();
    return demoUser() as any;
  }

  return realCurrentUser();
}

export async function clerkClient() {
  if (!isScreenshotMode()) {
    return realClerkClient();
  }

  assertScreenshotModeSafe();

  return {
    organizations: {
      getOrganization: async () => demoOrg,
      getOrganizationMembershipList: async ({
        limit = 100,
        offset = 0,
      }: {
        organizationId: string;
        limit?: number;
        offset?: number;
      }) => ({
        data: demoMemberships.slice(offset, offset + limit),
        totalCount: demoMemberships.length,
      }),
      createOrganizationInvitation: async () => ({
        id: 'demo-organization-invitation',
        status: 'pending',
      }),
    },
    users: {
      getUser: async (userId: string) => demoUser(userId),
      deleteUser: async () => ({ id: 'demo-deleted-user' }),
      getOrganizationMembershipList: async ({ userId }: { userId: string }) => ({
        data: demoMemberships.filter((membership) => membership.publicUserData.userId === userId),
        totalCount: 1,
      }),
    },
    invitations: {
      createInvitation: async () => ({
        id: 'demo-invitation',
        status: 'pending',
      }),
    },
  } as any;
}
