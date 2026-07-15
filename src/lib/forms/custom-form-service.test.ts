import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFindFirst, mockDeleteMany, mockDeleteObjectFromS3 } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockDeleteMany: vi.fn(),
  mockDeleteObjectFromS3: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('../prisma', () => ({
  prisma: {
    customFormSubmission: {
      findFirst: mockFindFirst,
      deleteMany: mockDeleteMany,
    },
  },
}));
vi.mock('../s3', () => ({ deleteObjectFromS3: mockDeleteObjectFromS3 }));

import { deleteSubmission } from './custom-form-service';

describe('deleteSubmission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindFirst.mockResolvedValue({
      id: 'submission-1',
      formId: 'form-1',
      photoUrls: [
        'orgs/org-1/animal-photos/one.jpg',
        'orgs/org-1/animal-photos/two.jpg',
        'https://example.com/external.jpg',
        'orgs/org-2/animal-photos/not-ours.jpg',
      ],
    });
    mockDeleteMany.mockResolvedValue({ count: 1 });
    mockDeleteObjectFromS3.mockResolvedValue(undefined);
  });

  it('tenant-scopes deletion and cleans up only this organization uploaded photos', async () => {
    const result = await deleteSubmission('org-1', 'submission-1');

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: 'submission-1', clerkOrganizationId: 'org-1' },
      select: { id: true, formId: true, photoUrls: true },
    });
    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { id: 'submission-1', clerkOrganizationId: 'org-1' },
    });
    expect(mockDeleteObjectFromS3).toHaveBeenCalledTimes(2);
    expect(mockDeleteObjectFromS3).toHaveBeenNthCalledWith(1, 'orgs/org-1/animal-photos/one.jpg');
    expect(result).toEqual({ id: 'submission-1', formId: 'form-1', photoCount: 2 });
  });

  it('adds submitter ownership to both lookup and deletion when requested', async () => {
    await deleteSubmission('org-1', 'submission-1', { submittedByUserId: 'user-1' });

    const where = {
      id: 'submission-1',
      clerkOrganizationId: 'org-1',
      submittedByUserId: 'user-1',
    };
    expect(mockFindFirst).toHaveBeenCalledWith({
      where,
      select: { id: true, formId: true, photoUrls: true },
    });
    expect(mockDeleteMany).toHaveBeenCalledWith({ where });
  });

  it('does not clean up photos when the scoped submission does not exist', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(deleteSubmission('org-1', 'missing')).resolves.toBeNull();
    expect(mockDeleteMany).not.toHaveBeenCalled();
    expect(mockDeleteObjectFromS3).not.toHaveBeenCalled();
  });

  it('does not fail the database deletion when storage cleanup fails', async () => {
    const error = new Error('storage unavailable');
    mockDeleteObjectFromS3.mockRejectedValueOnce(error);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(deleteSubmission('org-1', 'submission-1')).resolves.toEqual({
      id: 'submission-1',
      formId: 'form-1',
      photoCount: 2,
    });
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('one.jpg'), error);
    consoleError.mockRestore();
  });
});
