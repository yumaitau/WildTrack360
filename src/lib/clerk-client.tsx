'use client';

import type { ReactNode } from 'react';
import {
  ClerkProvider as RealClerkProvider,
  SignIn as RealSignIn,
  SignInButton as RealSignInButton,
  SignOutButton as RealSignOutButton,
  SignUp as RealSignUp,
  useAuth as realUseAuth,
  useClerk as realUseClerk,
  useOrganization as realUseOrganization,
  useUser as realUseUser,
} from '@clerk/nextjs';
import {
  SCREENSHOT_DEMO_ORG_ID,
  SCREENSHOT_DEMO_ORG_NAME,
  SCREENSHOT_DEMO_ORG_SLUG,
  SCREENSHOT_DEMO_USER_ID,
  isClientScreenshotMode,
} from '@/lib/screenshot-mode';
import { useOrgContext } from '@/components/org-provider';

const demoUser = {
  id: SCREENSHOT_DEMO_USER_ID,
  firstName: 'Amelia',
  lastName: 'Hart',
  fullName: 'Amelia Hart',
  username: null,
  imageUrl: '',
  publicMetadata: {
    phoneNumber: '+61 400 800 123',
  },
  primaryEmailAddress: {
    emailAddress: 'amelia.hart@illawarra-wildlife.example',
  },
  primaryPhoneNumber: {
    phoneNumber: '+61 400 800 123',
  },
};

const demoMembers = [
  {
    id: 'mem-demo-user-wildtrack360-admin',
    role: 'org:admin',
    publicUserData: {
      userId: SCREENSHOT_DEMO_USER_ID,
      firstName: 'Amelia',
      lastName: 'Hart',
      identifier: 'amelia.hart@illawarra-wildlife.example',
      imageUrl: '',
    },
  },
  {
    id: 'mem-demo-user-macropods',
    role: 'org:member',
    publicUserData: {
      userId: 'demo-user-macropods',
      firstName: 'Noah',
      lastName: 'Singh',
      identifier: 'noah.singh@illawarra-wildlife.example',
      imageUrl: '',
    },
  },
  {
    id: 'mem-demo-user-bats',
    role: 'org:member',
    publicUserData: {
      userId: 'demo-user-bats',
      firstName: 'Maya',
      lastName: 'Nguyen',
      identifier: 'maya.nguyen@illawarra-wildlife.example',
      imageUrl: '',
    },
  },
  {
    id: 'mem-demo-user-reptiles',
    role: 'org:member',
    publicUserData: {
      userId: 'demo-user-reptiles',
      firstName: 'Ethan',
      lastName: 'Cole',
      identifier: 'ethan.cole@illawarra-wildlife.example',
      imageUrl: '',
    },
  },
  {
    id: 'mem-demo-user-birds',
    role: 'org:member',
    publicUserData: {
      userId: 'demo-user-birds',
      firstName: 'Priya',
      lastName: 'Rao',
      identifier: 'priya.rao@illawarra-wildlife.example',
      imageUrl: '',
    },
  },
];

const demoOrganization = {
  id: SCREENSHOT_DEMO_ORG_ID,
  name: SCREENSHOT_DEMO_ORG_NAME,
  slug: SCREENSHOT_DEMO_ORG_SLUG,
  publicMetadata: {
    org_url: SCREENSHOT_DEMO_ORG_SLUG,
    jurisdiction: 'NSW',
  },
  getMemberships: async () => ({ data: demoMembers }),
  getInvitations: async () => ({ data: [] }),
};

const demoMembership = {
  role: 'org:admin',
  permissions: [],
  publicUserData: {
    userId: demoUser.id,
    firstName: demoUser.firstName,
    lastName: demoUser.lastName,
    identifier: demoUser.primaryEmailAddress.emailAddress,
    imageUrl: demoUser.imageUrl,
  },
};

const demoUseUserReturn = {
  isLoaded: true,
  isSignedIn: true,
  user: demoUser,
} as unknown as ReturnType<typeof realUseUser>;

const demoUseOrganizationReturn = {
  isLoaded: true,
  organization: demoOrganization,
  membership: demoMembership,
} as unknown as ReturnType<typeof realUseOrganization>;

const demoUseAuthReturn = {
  isLoaded: true,
  isSignedIn: true,
  userId: SCREENSHOT_DEMO_USER_ID,
  orgId: SCREENSHOT_DEMO_ORG_ID,
  orgSlug: SCREENSHOT_DEMO_ORG_SLUG,
  getToken: async () => 'demo-token',
} as unknown as ReturnType<typeof realUseAuth>;

const demoUseClerkReturn = {
  signOut: async () => undefined,
  setActive: async () => undefined,
  openSignIn: () => undefined,
  openSignUp: () => undefined,
  user: demoUser,
  organization: demoOrganization,
} as unknown as ReturnType<typeof realUseClerk>;

export function ClerkProvider({ children, ...props }: { children: ReactNode; [key: string]: any }) {
  if (isClientScreenshotMode()) {
    return <>{children}</>;
  }

  return <RealClerkProvider {...props}>{children}</RealClerkProvider>;
}

export function useUser(): ReturnType<typeof realUseUser> {
  if (isClientScreenshotMode()) {
    return demoUseUserReturn;
  }

  return realUseUser();
}

export function useOrganization(): ReturnType<typeof realUseOrganization> {
  // Hooks must run unconditionally.
  const serverOrg = useOrgContext();
  const real = isClientScreenshotMode() ? null : realUseOrganization();

  if (isClientScreenshotMode()) {
    return demoUseOrganizationReturn;
  }

  // Issue #56: in db org mode the tenant is resolved server-side (subdomain →
  // Organisation → OrgMember) and provided via OrgProvider; Clerk's own hook
  // has no active organization. Synthesize the Clerk shape so existing
  // consumers (which only read id/name/slug/publicMetadata) keep working.
  // New code should use useOrgContext() directly.
  if (serverOrg.source === 'db') {
    if (!serverOrg.orgId) {
      return { isLoaded: true, organization: null, membership: null } as unknown as ReturnType<
        typeof realUseOrganization
      >;
    }
    return {
      isLoaded: true,
      organization: {
        id: serverOrg.orgId,
        name: serverOrg.orgName ?? '',
        slug: serverOrg.orgSlug,
        publicMetadata: { org_url: serverOrg.orgSlug ?? undefined },
      },
      membership: null,
    } as unknown as ReturnType<typeof realUseOrganization>;
  }

  return real as ReturnType<typeof realUseOrganization>;
}

export function useAuth(): ReturnType<typeof realUseAuth> {
  if (isClientScreenshotMode()) {
    return demoUseAuthReturn;
  }

  return realUseAuth();
}

export function useClerk(): ReturnType<typeof realUseClerk> {
  if (isClientScreenshotMode()) {
    return demoUseClerkReturn;
  }

  return realUseClerk();
}

export function SignIn(props: any) {
  if (isClientScreenshotMode()) {
    return null;
  }

  return <RealSignIn {...props} />;
}

export function SignUp(props: any) {
  if (isClientScreenshotMode()) {
    return null;
  }

  return <RealSignUp {...props} />;
}

export function SignInButton({ children, ...props }: { children?: ReactNode; [key: string]: any }) {
  if (isClientScreenshotMode()) {
    return <>{children}</>;
  }

  return <RealSignInButton {...props}>{children}</RealSignInButton>;
}

export function SignOutButton({ children, ...props }: { children?: ReactNode; [key: string]: any }) {
  if (isClientScreenshotMode()) {
    return <>{children}</>;
  }

  return <RealSignOutButton {...props}>{children}</RealSignOutButton>;
}
