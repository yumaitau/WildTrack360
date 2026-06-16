import { describe, expect, it, vi, beforeEach } from 'vitest';

const { consumeOAuthState, exchangeCodeAndStore, getOrganization, auth } = vi.hoisted(() => ({
  consumeOAuthState: vi.fn(),
  exchangeCodeAndStore: vi.fn(),
  getOrganization: vi.fn(),
  auth: vi.fn(),
}));

vi.mock('@/lib/square/oauth', () => ({ consumeOAuthState, exchangeCodeAndStore }));
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));
vi.mock('@clerk/nextjs/server', () => ({
  auth,
  clerkClient: vi.fn(async () => ({ organizations: { getOrganization } })),
}));

import { GET } from './route';

function req(qs: string) {
  return new Request(`https://yumait.wildtrack360.com.au/api/square/oauth/callback?${qs}`, {
    headers: { 'x-forwarded-host': 'yumait.wildtrack360.com.au', 'x-forwarded-proto': 'https' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_ROOT_DOMAIN = 'wildtrack360.com.au';
  auth.mockResolvedValue({ userId: 'user_1' });
  getOrganization.mockResolvedValue({ publicMetadata: { org_url: 'yumait' } });
  consumeOAuthState.mockResolvedValue('org_1');
  exchangeCodeAndStore.mockResolvedValue(undefined);
});

describe('Square OAuth callback', () => {
  it("bounces to the org's tenant subdomain on success — never localhost", async () => {
    const res = await GET(req('code=abc&state=xyz'));
    expect(res.headers.get('location')).toBe(
      'https://yumait.wildtrack360.com.au/admin/payments/settings?ok=1'
    );
    expect(exchangeCodeAndStore).toHaveBeenCalledWith('org_1', 'abc');
  });

  it('uses the request origin (not localhost) when Square errors before state', async () => {
    const res = await GET(req('error=access_denied'));
    expect(res.headers.get('location')).toBe(
      'https://yumait.wildtrack360.com.au/admin/payments/settings?error=access_denied'
    );
    expect(consumeOAuthState).not.toHaveBeenCalled();
  });

  it('ignores a spoofed x-forwarded-host and falls back to the real host', async () => {
    const spoofed = new Request(
      'https://yumait.wildtrack360.com.au/api/square/oauth/callback?error=access_denied',
      { headers: { 'x-forwarded-host': 'evil.com', 'x-forwarded-proto': 'https' } }
    );
    const res = await GET(spoofed);
    expect(res.headers.get('location')).toBe(
      'https://yumait.wildtrack360.com.au/admin/payments/settings?error=access_denied'
    );
  });

  it('redirects with error=state when the state is unknown/expired', async () => {
    consumeOAuthState.mockResolvedValue(null);
    const res = await GET(req('code=abc&state=bad'));
    expect(res.headers.get('location')).toBe(
      'https://yumait.wildtrack360.com.au/admin/payments/settings?error=state'
    );
    expect(exchangeCodeAndStore).not.toHaveBeenCalled();
  });

  it('bounces to the tenant settings with error=exchange when the token swap fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    exchangeCodeAndStore.mockRejectedValue(new Error('boom'));
    const res = await GET(req('code=abc&state=xyz'));
    expect(res.headers.get('location')).toBe(
      'https://yumait.wildtrack360.com.au/admin/payments/settings?error=exchange'
    );
    errorSpy.mockRestore();
  });
});
