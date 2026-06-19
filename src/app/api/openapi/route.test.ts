import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockAuth } = vi.hoisted(() => ({ mockAuth: vi.fn() }));

vi.mock('@/lib/clerk-server', () => ({ auth: mockAuth }));

import { GET as openapiGET } from './route';
import { GET as docsGET } from '../docs/route';

describe('API docs routes - open in dev, authenticated in prod', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: null, orgId: null });
  });

  const req = () => new Request('http://localhost/api/openapi');
  const docsReq = () => new Request('http://localhost/api/docs');

  // Vitest runs with NODE_ENV=test (not production) -> dev policy: open to all.
  it('GET /api/openapi -> 200 in dev even with no session', async () => {
    const res = await openapiGET(req());
    expect(res.status).toBe(200);
    const doc = await res.json();
    expect(doc.openapi).toBe('3.1.0');
  });

  it('GET /api/docs -> 200 HTML in dev even with no session', async () => {
    const res = await docsGET(docsReq());
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect((await res.text()).toLowerCase()).toContain('scalar');
  });

  it('GET /api/openapi -> 401 in production without a session', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const res = await openapiGET(req());
    expect(res.status).toBe(401);
    vi.unstubAllEnvs();
  });

  it('GET /api/openapi -> 200 in production for ANY signed-in user (no admin role required)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' }); // role not checked
    const res = await openapiGET(req());
    expect(res.status).toBe(200);
    vi.unstubAllEnvs();
  });

  it('GET /api/docs -> 401 in production without a session', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const res = await docsGET(docsReq());
    expect(res.status).toBe(401);
    vi.unstubAllEnvs();
  });
});
