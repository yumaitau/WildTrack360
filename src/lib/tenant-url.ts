import 'server-only';

import { clerkClient } from '@clerk/nextjs/server';

// Resolving a tenant's absolute base URL. Each org lives on its own subdomain
// (`<org_url>.<root>`), so a baked-in site-URL env var (NEXT_PUBLIC_APP_URL)
// can't be right for more than one tenant — and isn't even present at runtime
// in the Docker image, which is why it fell back to http://localhost:3000. We
// derive the host from the org's `org_url` publicMetadata (the same slug the
// middleware matches against the request subdomain) and the BAKED
// NEXT_PUBLIC_ROOT_DOMAIN.

type Clerk = Awaited<ReturnType<typeof clerkClient>>;

function rootDomain(): string {
  return process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';
}

function protocolFor(host: string): 'http' | 'https' {
  return host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https';
}

// Build a tenant base origin from an already-known org slug. Falls back to the
// bare root domain when the slug is missing/invalid so callers always get an
// absolute, non-localhost URL in prod.
export function tenantBaseUrlFromSlug(orgUrl: string | null | undefined): string {
  const root = rootDomain();
  const proto = protocolFor(root);
  if (orgUrl && /^[a-zA-Z0-9-]+$/.test(orgUrl)) {
    return `${proto}://${orgUrl}.${root}`;
  }
  return `${proto}://${root}`;
}

// Look up an org's tenant base origin (e.g. https://rescue.wildtrack360.com.au).
// Pass an existing Clerk client to avoid a second handshake when the caller
// already has one.
export async function tenantBaseUrl(orgId: string, clerk?: Clerk): Promise<string> {
  const client = clerk ?? (await clerkClient());
  try {
    const org = await client.organizations.getOrganization({ organizationId: orgId });
    const orgUrl = (org.publicMetadata as Record<string, unknown> | null)?.org_url as
      | string
      | undefined;
    return tenantBaseUrlFromSlug(orgUrl);
  } catch {
    return tenantBaseUrlFromSlug(undefined);
  }
}

// Origin (scheme + host) of an inbound request, honoring reverse-proxy headers.
// Used when there's no org context yet (e.g. an OAuth error before the signed
// state is consumed) so we bounce back to the host the caller actually hit
// instead of a baked-in URL.
export function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get('x-forwarded-host') ?? url.host;
  const proto = request.headers.get('x-forwarded-proto') ?? protocolFor(host);
  return `${proto}://${host}`;
}
