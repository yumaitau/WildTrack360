import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockAuth, mockGetUserRole } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockGetUserRole: vi.fn(),
}));

vi.mock('@/lib/clerk-server', () => ({ auth: mockAuth }));
vi.mock('@/lib/rbac', () => ({ getUserRole: mockGetUserRole }));

import { GET as openapiGET } from './route';
import { GET as docsGET } from '../docs/route';

describe('API docs routes (admin-gated)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
    mockGetUserRole.mockResolvedValue('ADMIN');
  });

  it('GET /api/openapi ->401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null, orgId: null });
    const res = await openapiGET();
    expect(res.status).toBe(401);
  });

  it('GET /api/openapi ->403 for a non-admin', async () => {
    mockGetUserRole.mockResolvedValue('CARER');
    const res = await openapiGET();
    expect(res.status).toBe(403);
  });

  it('GET /api/openapi ->200 with a 3.1.0 document for an admin', async () => {
    const res = await openapiGET();
    expect(res.status).toBe(200);
    const doc = await res.json();
    expect(doc.openapi).toBe('3.1.0');
    expect(doc.info.title).toBe('WildTrack360 API');
  });

  it('GET /api/docs ->403 for a non-admin', async () => {
    mockGetUserRole.mockResolvedValue('COORDINATOR');
    const res = await docsGET();
    expect(res.status).toBe(403);
  });

  it('GET /api/docs ->200 HTML containing the Scalar reference for an admin', async () => {
    const res = await docsGET();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const body = await res.text();
    expect(body.toLowerCase()).toContain('scalar');
    expect(body).toContain('/api/openapi');
  });
});
