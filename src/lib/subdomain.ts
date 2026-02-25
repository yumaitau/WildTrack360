/**
 * Extracts the subdomain from a host string given the root domain.
 *
 * Examples:
 *   extractSubdomain("tenant.example.com", "example.com") → "tenant"
 *   extractSubdomain("tenant.localhost:3000", "localhost:3000") → "tenant"
 *   extractSubdomain("example.com", "example.com") → null
 *   extractSubdomain("www.example.com", "example.com") → null
 */
export function extractSubdomain(
  host: string,
  rootDomain: string
): string | null {
  // Exact match on root domain — no subdomain
  if (host === rootDomain) {
    return null;
  }

  // Check if host ends with .<rootDomain>
  const suffix = `.${rootDomain}`;
  if (!host.endsWith(suffix)) {
    return null;
  }

  const subdomain = host.slice(0, -suffix.length);

  // Ignore www
  if (subdomain === "www") {
    return null;
  }

  // Only return single-level subdomains (no dots)
  if (subdomain.includes(".")) {
    return null;
  }

  return subdomain || null;
}
