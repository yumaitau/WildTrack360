import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextResponse } from 'next/server';

const {
  mockAuth,
  mockClerkClient,
  mockIsForbiddenError,
  mockRequirePermission,
  mockGateFeature,
  mockLogAudit,
  mockComposeMemberMessages,
  mockGetOrgDisplayInfo,
  mockSendMemberMessageEmail,
  mockMemberMessageUpdateMany,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockClerkClient: vi.fn(),
  mockIsForbiddenError: vi.fn(),
  mockRequirePermission: vi.fn(),
  mockGateFeature: vi.fn(),
  mockLogAudit: vi.fn(),
  mockComposeMemberMessages: vi.fn(),
  mockGetOrgDisplayInfo: vi.fn(),
  mockSendMemberMessageEmail: vi.fn(),
  mockMemberMessageUpdateMany: vi.fn(),
}));

vi.mock('@/lib/clerk-server', () => ({ auth: mockAuth, clerkClient: mockClerkClient }));
vi.mock('@/lib/rbac', () => ({
  isForbiddenError: mockIsForbiddenError,
  requirePermission: mockRequirePermission,
}));
vi.mock('@/lib/features', () => ({ gateFeature: mockGateFeature }));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));
vi.mock('@/lib/member-messages', () => ({ composeMemberMessages: mockComposeMemberMessages }));
vi.mock('@/lib/org-info', () => ({ getOrgDisplayInfo: mockGetOrgDisplayInfo }));
vi.mock('@/lib/email/member-broadcast', () => ({
  sendMemberMessageEmail: mockSendMemberMessageEmail,
}));
vi.mock('@/lib/prisma', () => ({
  prisma: { memberMessage: { updateMany: mockMemberMessageUpdateMany } },
}));

import { POST } from './route';

function postReq(body: unknown) {
  return new Request('http://t.localhost/api/members/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const composedMsg = {
  email: 'jane@example.org',
  subject: 'Hello Jane',
  body: 'Thank you for your support.',
  memberName: 'Jane Doe',
  messageId: 'msg-1',
};

describe('POST /api/members/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
    mockClerkClient.mockResolvedValue({
      users: { getUser: vi.fn().mockResolvedValue({ firstName: 'Admin', lastName: 'User' }) },
    });
    mockGateFeature.mockResolvedValue(null);
    mockIsForbiddenError.mockReturnValue(false);
    mockRequirePermission.mockResolvedValue(undefined);
    mockGetOrgDisplayInfo.mockResolvedValue({ name: 'Test Org' });
    mockComposeMemberMessages.mockResolvedValue([composedMsg]);
    mockSendMemberMessageEmail.mockResolvedValue(true);
    mockMemberMessageUpdateMany.mockResolvedValue({ count: 1 });
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null, orgId: null });
    const res = await POST(
      postReq({ memberIds: ['m-1'], subject: 'Hi', body: 'Hello' })
    );
    expect(res.status).toBe(401);
  });

  it('returns 404 when feature is gated', async () => {
    mockGateFeature.mockResolvedValue(
      NextResponse.json({ error: 'Not found' }, { status: 404 })
    );
    const res = await POST(
      postReq({ memberIds: ['m-1'], subject: 'Hi', body: 'Hello' })
    );
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid body (missing subject) before composing', async () => {
    const res = await POST(postReq({ memberIds: ['m-1'], body: 'Hello' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Invalid request');
    expect(mockComposeMemberMessages).not.toHaveBeenCalled();
  });

  it('returns 400 when email recipient count exceeds 100', async () => {
    const manyIds = Array.from({ length: 101 }, (_, i) => `m-${i}`);
    const res = await POST(
      postReq({ memberIds: manyIds, subject: 'Hi', body: 'Hello', sendEmail: true })
    );
    expect(res.status).toBe(400);
    expect(mockComposeMemberMessages).not.toHaveBeenCalled();
  });

  it('returns 200 with created/emailed counts on success', async () => {
    const res = await POST(
      postReq({ memberIds: ['m-1'], subject: 'Hi', body: 'Hello' })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.created).toBe(1);
    expect(json.emailed).toBe(1);
  });
});
