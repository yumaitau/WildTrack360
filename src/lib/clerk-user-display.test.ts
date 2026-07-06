import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CLERK_EMAIL_UNAVAILABLE, resolveClerkUserEmailMap } from './clerk-user-display';

const { mockClerkClient, mockGetUserList } = vi.hoisted(() => ({
  mockClerkClient: vi.fn(),
  mockGetUserList: vi.fn(),
}));

vi.mock('@/lib/clerk-server', () => ({
  clerkClient: mockClerkClient,
}));

function clerkUser(id: string, email = `${id}@example.test`) {
  return {
    id,
    primaryEmailAddressId: `email_${id}`,
    emailAddresses: [{ id: `email_${id}`, emailAddress: email }],
  };
}

describe('resolveClerkUserEmailMap', () => {
  beforeEach(() => {
    mockClerkClient.mockResolvedValue({ users: { getUserList: mockGetUserList } });
    mockGetUserList.mockReset();
  });

  it('batches Clerk user lookups and marks missing users unavailable', async () => {
    const ids = Array.from({ length: 101 }, (_, index) => `user_batch_${index}`);
    mockGetUserList.mockImplementation(async ({ userId }: { userId: string[] }) => ({
      data: userId.slice(0, 1).map((id) => clerkUser(id)),
    }));

    const result = await resolveClerkUserEmailMap(ids);

    expect(mockGetUserList).toHaveBeenCalledTimes(2);
    expect(result.get('user_batch_0')).toBe('user_batch_0@example.test');
    expect(result.get('user_batch_1')).toBe(CLERK_EMAIL_UNAVAILABLE);
    expect(result.get('user_batch_100')).toBe('user_batch_100@example.test');
  });

  it('reuses cached email lookups within the TTL', async () => {
    mockGetUserList.mockResolvedValue({ data: [clerkUser('user_cached')] });

    await expect(resolveClerkUserEmailMap(['user_cached'])).resolves.toEqual(
      new Map([['user_cached', 'user_cached@example.test']])
    );
    mockGetUserList.mockClear();

    await expect(resolveClerkUserEmailMap(['user_cached'])).resolves.toEqual(
      new Map([['user_cached', 'user_cached@example.test']])
    );
    expect(mockGetUserList).not.toHaveBeenCalled();
  });
});
