import { describe, expect, it, beforeEach } from 'vitest';
import { signOAuthState, verifyOAuthState } from './oauth';

beforeEach(() => {
  process.env.ENCRYPTION_KEY = 'a'.repeat(64);
});

describe('OAuth state signing', () => {
  it('round-trips the org id', () => {
    const state = signOAuthState('org_123');
    expect(verifyOAuthState(state)).toBe('org_123');
  });

  it('rejects tampered / malformed state', () => {
    const state = signOAuthState('org_123');
    expect(verifyOAuthState(state.slice(0, -2) + 'zz')).toBeNull();
    expect(verifyOAuthState('garbage')).toBeNull();
    expect(verifyOAuthState('')).toBeNull();
    expect(verifyOAuthState(null)).toBeNull();
  });

  it('rejects state signed with a different key', () => {
    const state = signOAuthState('org_123');
    process.env.ENCRYPTION_KEY = 'b'.repeat(64);
    expect(verifyOAuthState(state)).toBeNull();
  });
});
