import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRequireFormAccess, mockHasPermission, mockDeleteSubmission, mockLogAudit } = vi.hoisted(
  () => ({
    mockRequireFormAccess: vi.fn(),
    mockHasPermission: vi.fn(),
    mockDeleteSubmission: vi.fn(),
    mockLogAudit: vi.fn(),
  })
);

vi.mock('../../access', () => ({ requireFormAccess: mockRequireFormAccess }));
vi.mock('@/lib/rbac', () => ({ hasPermission: mockHasPermission }));
vi.mock('@/lib/forms/custom-form-service', () => ({ deleteSubmission: mockDeleteSubmission }));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));

import { DELETE } from './route';

const request = new Request('http://t.localhost/api/custom-forms/submissions/submission-1', {
  method: 'DELETE',
});
const context = { params: Promise.resolve({ id: 'submission-1' }) };

describe('DELETE /api/custom-forms/submissions/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireFormAccess.mockResolvedValue({
      userId: 'user-1',
      orgId: 'org-1',
      role: 'CARER',
    });
    mockHasPermission.mockReturnValue(false);
    mockDeleteSubmission.mockResolvedValue({
      id: 'submission-1',
      formId: 'form-1',
      photoCount: 2,
    });
  });

  it('limits regular submitters to deleting their own submissions', async () => {
    const response = await DELETE(request, context);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(mockDeleteSubmission).toHaveBeenCalledWith('org-1', 'submission-1', {
      submittedByUserId: 'user-1',
    });
    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entity: 'CustomFormSubmission', entityId: 'submission-1' })
    );
  });

  it('allows submission managers to delete any submission in their organization', async () => {
    mockHasPermission.mockReturnValue(true);

    const response = await DELETE(request, context);

    expect(response.status).toBe(200);
    expect(mockDeleteSubmission).toHaveBeenCalledWith('org-1', 'submission-1', {
      submittedByUserId: undefined,
    });
  });

  it('returns 404 when the submission is outside the caller deletion scope', async () => {
    mockDeleteSubmission.mockResolvedValue(null);

    const response = await DELETE(request, context);

    expect(response.status).toBe(404);
    expect(mockLogAudit).not.toHaveBeenCalled();
  });

  it('returns an access response before attempting deletion', async () => {
    mockRequireFormAccess.mockResolvedValue({
      response: Response.json({ error: 'Forbidden' }, { status: 403 }),
    });

    const response = await DELETE(request, context);

    expect(response.status).toBe(403);
    expect(mockDeleteSubmission).not.toHaveBeenCalled();
  });
});
