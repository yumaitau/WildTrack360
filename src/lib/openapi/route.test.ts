import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from '@/lib/openapi/registry';
import { defineContract } from './contract';
import { route, type HandlerCtx } from './route';
import { generateOpenApiDocument } from './generate';

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));
import * as Sentry from '@sentry/nextjs';

const itemContract = defineContract({
  method: 'post',
  path: '/api/__test/items',
  summary: 'Create test item',
  tags: ['Test'],
  security: 'clerkSession',
  request: { body: z.object({ name: z.string().min(1) }) },
  responses: {
    201: { description: 'created', schema: z.object({ id: z.string(), name: z.string() }) },
  },
  successStatus: 201,
});

function postReq(body: unknown) {
  return new Request('http://t.localhost/api/__test/items', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('route() wrapper', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects an invalid body with 400 before calling the handler', async () => {
    const fn = vi.fn();
    const handler = route(itemContract, fn);
    const res = await handler(postReq({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid request');
    expect(json.details).toBeDefined();
    expect(fn).not.toHaveBeenCalled();
  });

  it('calls the handler with parsed body and returns the validated success response', async () => {
    const fn = vi.fn(async (ctx: HandlerCtx<typeof itemContract>) => ({
      data: { id: 'a1', name: ctx.body.name },
      status: 201,
    }));
    const handler = route(itemContract, fn);
    const res = await handler(postReq({ name: 'Joey' }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: 'a1', name: 'Joey' });
    expect(fn).toHaveBeenCalledOnce();
  });

  it('warns (dev/test) when the handler returns a 2xx Response directly, and passes it through unvalidated', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fn = async () =>
      new Response(JSON.stringify({ not: 'validated' }), { status: 200 });
    const handler = route(itemContract, fn);
    const res = await handler(postReq({ name: 'Joey' }));
    expect(res.status).toBe(200);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('does NOT warn when the handler returns a 4xx Response (legit early/auth return)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fn = async () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    const handler = route(itemContract, fn);
    const res = await handler(postReq({ name: 'Joey' }));
    expect(res.status).toBe(401);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('throws under NODE_ENV=test when the success response does not match its schema', async () => {
    const fn = async () => ({ data: { id: 'a1' }, status: 201 }); // missing `name`
    const handler = route(itemContract, fn);
    await expect(handler(postReq({ name: 'Joey' }))).rejects.toThrow();
  });

  it('under NODE_ENV=production logs to Sentry and returns the (invalid) response instead of throwing', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const fn = async () => ({ data: { id: 'a1' }, status: 201 }); // missing `name`
    const handler = route(itemContract, fn);
    const res = await handler(postReq({ name: 'Joey' }));
    expect(res.status).toBe(201);
    expect(Sentry.captureException).toHaveBeenCalledOnce();
    vi.unstubAllEnvs();
  });

  describe('non-JSON (CSV) response support', () => {
    const csvContract = defineContract({
      method: 'get',
      path: '/api/__test/csv-export',
      summary: 'Export CSV',
      tags: ['Test'],
      security: 'clerkSession',
      responses: {
        200: { description: 'CSV file download', content: 'text/csv' },
        401: { description: 'Unauthorized' },
      },
      successStatus: 200,
    });

    function getReq() {
      return new Request('http://t.localhost/api/__test/csv-export', { method: 'GET' });
    }

    it('does NOT warn when handler returns a 2xx Response for a declared non-JSON content type', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const fn = async () =>
        new Response('col1,col2\nval1,val2', {
          status: 200,
          headers: { 'content-type': 'text/csv' },
        });
      const handler = route(csvContract, fn);
      const res = await handler(getReq());
      expect(res.status).toBe(200);
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it('emits text/csv as an empty-object content map (no schema) in the generated OpenAPI document', () => {
      const doc = generateOpenApiDocument();
      const paths = doc.paths as Record<string, Record<string, unknown>>;
      const op = paths['/api/__test/csv-export']?.get as Record<string, unknown> | undefined;
      const responses = op?.responses as Record<string, Record<string, unknown>> | undefined;
      const resp200 = responses?.['200'];
      expect(resp200).toBeDefined();
      // Non-JSON branch: text/csv content with string schema, no application/json
      const content = resp200?.content as Record<string, unknown> | undefined;
      expect(content).toBeDefined();
      expect(content?.['text/csv']).toBeDefined();
      expect(content?.['application/json']).toBeUndefined();
    });
  });
});
