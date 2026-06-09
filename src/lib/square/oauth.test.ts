import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../prisma', () => ({
  prisma: {
    squareOAuthState: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { createOAuthState, consumeOAuthState } from './oauth';
import { prisma } from '../prisma';

const create = prisma.squareOAuthState.create as unknown as ReturnType<typeof vi.fn>;
const findUnique = prisma.squareOAuthState.findUnique as unknown as ReturnType<typeof vi.fn>;
const del = prisma.squareOAuthState.delete as unknown as ReturnType<typeof vi.fn>;
const deleteMany = prisma.squareOAuthState.deleteMany as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  create.mockResolvedValue({});
  del.mockResolvedValue({});
  deleteMany.mockResolvedValue({});
});

describe('createOAuthState', () => {
  it('stores a nonce for the org and returns it', async () => {
    const state = await createOAuthState('org_1');
    expect(typeof state).toBe('string');
    expect(state.length).toBeGreaterThan(20);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ state, clerkOrganizationId: 'org_1' }),
      })
    );
  });
});

describe('consumeOAuthState', () => {
  it('returns the org id for a valid unexpired nonce and deletes it', async () => {
    findUnique.mockResolvedValue({
      state: 'x',
      clerkOrganizationId: 'org_1',
      expiresAt: new Date(Date.now() + 60_000),
    });
    expect(await consumeOAuthState('x')).toBe('org_1');
    expect(del).toHaveBeenCalledWith({ where: { state: 'x' } });
  });

  it('returns null for an unknown nonce', async () => {
    findUnique.mockResolvedValue(null);
    expect(await consumeOAuthState('x')).toBeNull();
  });

  it('returns null for an expired nonce (and still deletes it)', async () => {
    findUnique.mockResolvedValue({
      state: 'x',
      clerkOrganizationId: 'org_1',
      expiresAt: new Date(Date.now() - 1_000),
    });
    expect(await consumeOAuthState('x')).toBeNull();
    expect(del).toHaveBeenCalled();
  });

  it('returns null for empty input without touching the DB', async () => {
    expect(await consumeOAuthState(null)).toBeNull();
    expect(await consumeOAuthState('')).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });
});
