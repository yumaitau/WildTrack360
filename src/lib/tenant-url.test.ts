import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requestHost, requestOrigin } from './tenant-url';

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_ROOT_DOMAIN', 'wildtrack360.com.au');
});

afterEach(() => vi.unstubAllEnvs());

describe('trusted request origins', () => {
  it('accepts and normalizes the first trusted proxy hop', () => {
    const request = new Request('http://internal:3000/callback', {
      headers: {
        'x-forwarded-host': 'YUMAIT.WILDTRACK360.COM.AU:443, internal:3000',
        'x-forwarded-proto': 'https, http',
      },
    });
    expect(requestHost(request)).toBe('yumait.wildtrack360.com.au');
    expect(requestOrigin(request)).toBe('https://yumait.wildtrack360.com.au');
  });

  it.each([
    'attacker.invalid?.wildtrack360.com.au',
    'attacker.invalid#.wildtrack360.com.au',
    'attacker.invalid/.wildtrack360.com.au',
    'attacker.invalid\\.wildtrack360.com.au',
    'wildtrack360.com.au@attacker.invalid',
    'attacker-wildtrack360.com.au',
    'wildtrack360.com.au.attacker.invalid',
    'yumait.wildtrack360.com.au:444',
    'yumait.wildtrack360.com.au:invalid',
    'https://yumait.wildtrack360.com.au',
    'bad host.wildtrack360.com.au',
  ])('rejects an untrusted authority: %s', (host) => {
    const request = new Request('https://rescue.wildtrack360.com.au/callback', {
      headers: { 'x-forwarded-host': host },
    });
    expect(requestHost(request)).toBe('rescue.wildtrack360.com.au');
    expect(requestOrigin(request)).toBe('https://rescue.wildtrack360.com.au');
  });

  it('falls back to the configured root when both incoming hosts are untrusted', () => {
    const request = new Request('https://attacker.invalid/callback', {
      headers: { 'x-forwarded-host': 'other.invalid' },
    });
    expect(requestOrigin(request)).toBe('https://wildtrack360.com.au');
  });

  it('preserves localhost tenant ports for development', () => {
    vi.stubEnv('NEXT_PUBLIC_ROOT_DOMAIN', 'localhost:3000');
    const request = new Request('http://localhost:3000/callback', {
      headers: { 'x-forwarded-host': 'rescue.localhost:3000', 'x-forwarded-proto': 'http' },
    });
    expect(requestHost(request)).toBe('rescue.localhost:3000');
    expect(requestOrigin(request)).toBe('http://rescue.localhost:3000');
  });
});
