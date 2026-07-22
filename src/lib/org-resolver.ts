import 'server-only';

import * as React from 'react';
import { headers } from 'next/headers';
import { prisma } from './prisma';
import { extractSubdomain } from './subdomain';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';

// DB-mode tenant resolution (issue #56 design decision D2): the subdomain is
// the org context, not a session claim. host → subdomain → Organisation (by
// slug) → membership check (OrgMember). Returns the org id only when the
// signed-in user is a proven member of the subdomain's organisation.
//
// On the root domain there is no subdomain context, so we fall back to the
// user's first membership — mirroring the legacy "active org" used by the
// root-domain → tenant-subdomain redirect and by MCP/OAuth callers that
// arrive without a tenant host.
//
// Wrapped in React cache() so the many auth() calls a single request makes
// share one resolution instead of re-querying per call. (cache only exists
// under the react-server condition; in plain node — vitest, scripts — the
// function runs unmemoised.)
const requestCache: <T extends (...args: never[]) => unknown>(fn: T) => T =
  typeof React.cache === 'function' ? React.cache : (fn) => fn;

export const resolveDbOrgId = requestCache(async (userId: string): Promise<string | null> => {
  if (!userId) return null;

  let host = '';
  try {
    const headerStore = await headers();
    host = headerStore.get('host') ?? '';
  } catch {
    // Outside a request scope (build-time render, background job) there is no
    // host to resolve a tenant from.
    host = '';
  }

  const subdomain = extractSubdomain(host, ROOT_DOMAIN);

  if (subdomain) {
    const org = await prisma.organisation.findUnique({
      where: { slug: subdomain },
      select: { id: true, isActive: true },
    });
    if (!org || !org.isActive) return null;

    const membership = await prisma.orgMember.findUnique({
      where: { userId_orgId: { userId, orgId: org.id } },
      select: { id: true },
    });
    return membership ? org.id : null;
  }

  const first = await prisma.orgMember.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { orgId: true },
  });
  return first?.orgId ?? null;
});
