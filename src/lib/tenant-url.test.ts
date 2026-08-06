import { afterEach, describe, expect, it, vi } from 'vitest';
import { tenantBaseUrlFromSlug } from './tenant-url';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('tenantBaseUrlFromSlug', () => {
  it('uses HTTP for the homelab root domain', () => {
    vi.stubEnv('NEXT_PUBLIC_ROOT_DOMAIN', 'homelab:3012');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://homelab:3012');

    expect(tenantBaseUrlFromSlug('brindabella-wildlife-demo')).toBe(
      'http://brindabella-wildlife-demo.homelab:3012'
    );
  });

  it('uses HTTP for homelab when NEXT_PUBLIC_APP_URL is unavailable at build time', () => {
    vi.stubEnv('NEXT_PUBLIC_ROOT_DOMAIN', 'homelab:3012');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');

    expect(tenantBaseUrlFromSlug('brindabella-wildlife-demo')).toBe(
      'http://brindabella-wildlife-demo.homelab:3012'
    );
  });

  it('uses HTTPS for the production root domain', () => {
    vi.stubEnv('NEXT_PUBLIC_ROOT_DOMAIN', 'wildtrack360.com.au');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://wildtrack360.com.au');

    expect(tenantBaseUrlFromSlug('rescue')).toBe('https://rescue.wildtrack360.com.au');
  });

  it('ignores an app URL for a different host', () => {
    vi.stubEnv('NEXT_PUBLIC_ROOT_DOMAIN', 'wildtrack360.com.au');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://untrusted.example');

    expect(tenantBaseUrlFromSlug('rescue')).toBe('https://rescue.wildtrack360.com.au');
  });
});
