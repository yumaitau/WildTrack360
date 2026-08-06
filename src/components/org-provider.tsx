'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { OrgRole } from '@prisma/client';

// Server-populated organisation context (issue #56 Phase 2.5). In db org mode
// Clerk's useOrganization() no longer knows the active org — the tenant is
// resolved server-side from the subdomain — so the root layout passes the
// resolved org down through this provider. New client code should prefer
// useOrgContext() over the Clerk hooks.

export interface OrgContextValue {
  source: 'clerk' | 'db';
  orgId: string | null;
  orgName: string | null;
  orgSlug: string | null;
  role: OrgRole | null;
}

const defaultValue: OrgContextValue = {
  source: 'clerk',
  orgId: null,
  orgName: null,
  orgSlug: null,
  role: null,
};

const OrgContext = createContext<OrgContextValue>(defaultValue);

export function OrgProvider({
  value,
  children,
}: {
  value: OrgContextValue;
  children: ReactNode;
}) {
  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrgContext(): OrgContextValue {
  return useContext(OrgContext);
}
