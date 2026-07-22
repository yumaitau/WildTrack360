import 'server-only';

import * as React from 'react';
import { redirect } from 'next/navigation';
import type { Organisation, OrgMember, OrgRole } from '@prisma/client';
import { auth } from './clerk-server';
import { prisma } from './prisma';
import { orgSource } from './org-source';
import { getUserRole } from './rbac';

// The load-bearing tenant-resolution module from issue #56 Phase 2. New code
// should call getOrgContext()/requireOrgContext() instead of destructuring
// `auth()`:
//
//   clerk mode — orgId comes from the Clerk session (legacy), org row is read
//                from the organisations mirror when present.
//   db mode    — host → subdomain → Organisation (slug) → OrgMember proves
//                membership; auth() already returns the DB-resolved orgId
//                (see clerk-server.ts), so both modes converge here.
//
// null ⇒ the route should return 401 (no session) / 403 (no membership).

export interface OrgContext {
  userId: string;
  org: Organisation;
  membership: OrgMember;
  role: OrgRole;
}

// React cache() only exists under the react-server condition; plain node
// (vitest, scripts) runs unmemoised.
const requestCache: <T extends (...args: never[]) => unknown>(fn: T) => T =
  typeof React.cache === 'function' ? React.cache : (fn) => fn;

export const getOrgContext = requestCache(async (): Promise<OrgContext | null> => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return null;

  const [org, membership] = await Promise.all([
    prisma.organisation.findUnique({ where: { id: orgId } }),
    prisma.orgMember.findUnique({ where: { userId_orgId: { userId, orgId } } }),
  ]);

  if (orgSource() === 'db') {
    // In db mode the subdomain resolution already proved membership; a missing
    // row here means it was revoked mid-request.
    if (!org || !membership) return null;
    return { userId, org, membership, role: membership.role };
  }

  // clerk mode: the mirror tables may not be backfilled yet. Fall back to a
  // synthesised org row and the legacy CARER-default role so behaviour is
  // unchanged while Clerk is authoritative.
  const role = membership?.role ?? (await getUserRole(userId, orgId));
  const fallbackOrg: Organisation = org ?? {
    id: orgId,
    name: orgId,
    slug: orgId,
    jurisdiction: null,
    logoUrl: null,
    isActive: true,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
  const fallbackMembership: OrgMember =
    membership ??
    ({
      id: `transient_${userId}_${orgId}`,
      userId,
      orgId,
      role,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    } as OrgMember);

  return { userId, org: fallbackOrg, membership: fallbackMembership, role };
});

/**
 * Like getOrgContext() but redirects instead of returning null:
 * no session → /landing, no membership for this tenant → /unauthorized.
 */
export async function requireOrgContext(): Promise<OrgContext> {
  const context = await getOrgContext();
  if (context) return context;

  const { userId } = await auth();
  redirect(userId ? '/unauthorized' : '/landing');
}
