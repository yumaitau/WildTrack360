import 'server-only';

import * as React from 'react';
import { headers } from 'next/headers';
import { prisma } from './prisma';
import { extractSubdomain } from './subdomain';
import { isDbNativeOrgId, isDbOrg, isDbOrgSource } from './org-source';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';

// Tenant resolution for issue #56, per-org flagged (DB_ORG_SOURCE, toggled
// from the WildTrack360-Admin panel):
//
//   On a tenant subdomain, the subdomain's organisation decides its own mode
//   (design decision D2): a database-managed org resolves host → subdomain →
//   Organisation (slug) → membership check (OrgMember); a legacy org keeps
//   the Clerk session's orgId (the middleware org_url claim still guards it).
//
//   On the root domain there is no subdomain context: the Clerk session's
//   active org is used when present (legacy), otherwise the user's first
//   database-managed membership — that covers users invited after their org
//   left Clerk Organizations, who never have a Clerk active org. This feeds
//   the root-domain → tenant-subdomain redirect and MCP/OAuth callers.
//
// Wrapped in React cache() so the many auth() calls a single request makes
// share one resolution instead of re-querying per call. (cache only exists
// under the react-server condition; in plain node — vitest, scripts — the
// function runs unmemoised.)
const requestCache: <T extends (...args: never[]) => unknown>(fn: T) => T =
  typeof React.cache === 'function' ? React.cache : (fn) => fn;

async function firstDbManagedOrgId(userId: string): Promise<string | null> {
  const memberships = await prisma.orgMember.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { orgId: true },
  });
  if (isDbOrgSource()) return memberships[0]?.orgId ?? null;
  for (const membership of memberships) {
    if (isDbNativeOrgId(membership.orgId) || (await isDbOrg(membership.orgId))) {
      return membership.orgId;
    }
  }
  return null;
}

export const resolveOrgIdForRequest = requestCache(
  async (userId: string, sessionOrgId: string | null): Promise<string | null> => {
    if (!userId) return null;

    let host = '';
    try {
      const headerStore = await headers();
      host = headerStore.get('host') ?? '';
    } catch {
      // Outside a request scope (build-time render, background job) there is
      // no host to resolve a tenant from.
      host = '';
    }

    const subdomain = extractSubdomain(host, ROOT_DOMAIN);

    if (subdomain) {
      const org = await prisma.organisation.findUnique({
        where: { slug: subdomain },
        select: { id: true, isActive: true },
      });

      if (!org || !(await isDbOrg(org.id))) {
        // Legacy (Clerk-managed) tenant — or no mirror row yet. Keep the
        // Clerk session's active org exactly as before the migration.
        return sessionOrgId;
      }

      if (!org.isActive) return null;

      const membership = await prisma.orgMember.findUnique({
        where: { userId_orgId: { userId, orgId: org.id } },
        select: { id: true },
      });
      return membership ? org.id : null;
    }

    // Root domain: legacy sessions carry an active org; otherwise fall back
    // to the user's first database-managed membership.
    if (!isDbOrgSource() && sessionOrgId) return sessionOrgId;
    return (await firstDbManagedOrgId(userId)) ?? sessionOrgId;
  }
);
