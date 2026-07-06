import { NextResponse } from 'next/server';
import { z, type ZodError, type ZodTypeAny } from 'zod';
import type { ContractConfig } from './contract';
import { validateResponse } from './response';
import { addUserEmailsToResponse } from '@/lib/user-reference-response';

type InferOr<T, F> = T extends ZodTypeAny ? z.infer<T> : F;

export interface HandlerCtx<C extends ContractConfig> {
  request: Request;
  params: InferOr<NonNullable<NonNullable<C['request']>['params']>, Record<string, never>>;
  query: InferOr<NonNullable<NonNullable<C['request']>['query']>, Record<string, never>>;
  body: InferOr<NonNullable<NonNullable<C['request']>['body']>, undefined>;
}

export type HandlerResult = Response | { data: unknown; status?: number };

function badRequest(error: ZodError): NextResponse {
  return NextResponse.json({ error: 'Invalid request', details: error.flatten() }, { status: 400 });
}

/**
 * Wrap a Next.js route handler with request + response validation derived from a
 * contract. Request shape (params/query/body) is validated first (400 on failure),
 * then `handler` runs (it owns auth/RBAC and may return a raw Response for early
 * 4xx returns). A success result `{ data, status? }` is validated against the
 * contract's response schema before being serialised.
 *
 * Note: input-shape validation (400) precedes the handler's auth check (401/403).
 */
export function route<C extends ContractConfig>(
  contract: C,
  handler: (ctx: HandlerCtx<C>) => Promise<HandlerResult>,
) {
  return async (
    request: Request,
    context?: { params?: Promise<Record<string, string>> },
  ): Promise<Response> => {
    let params: unknown;
    if (contract.request?.params) {
      const raw = context?.params ? await context.params : {};
      const parsed = contract.request.params.safeParse(raw);
      if (!parsed.success) return badRequest(parsed.error);
      params = parsed.data;
    }

    let query: unknown;
    if (contract.request?.query) {
      const raw = Object.fromEntries(new URL(request.url).searchParams);
      const parsed = contract.request.query.safeParse(raw);
      if (!parsed.success) return badRequest(parsed.error);
      query = parsed.data;
    }

    let body: unknown;
    if (contract.request?.body) {
      let raw: unknown;
      try {
        raw = await request.json();
      } catch {
        return NextResponse.json(
          { error: 'Invalid request', details: 'Request body must be valid JSON' },
          { status: 400 },
        );
      }
      const parsed = contract.request.body.safeParse(raw);
      if (!parsed.success) return badRequest(parsed.error);
      body = parsed.data;
    }

    const result = await handler({ request, params, query, body } as HandlerCtx<C>);

    if (result instanceof Response) {
      // A 2xx Response from the success path bypasses response validation. Warn in
      // dev/test so accidental leaks surface during migration; 4xx early/auth
      // returns are expected and stay quiet. Suppress the warn when the contract
      // declares a non-JSON content type (e.g. text/csv) - the raw Response is
      // the contractually expected form.
      const declaredContent = contract.responses[result.status]?.content;
      const isNonJson = declaredContent != null && declaredContent !== 'application/json';
      if (
        process.env.NODE_ENV !== 'production' &&
        result.status >= 200 &&
        result.status < 300 &&
        !isNonJson
      ) {
        console.warn(
          'route(): handler returned a 2xx Response directly - response schema was NOT validated',
        );
      }
      return result;
    }

    const status = result.status ?? contract.successStatus;
    const schema = contract.responses[status]?.schema;
    if (schema) validateResponse(schema, result.data);
    const data = await addUserEmailsToResponse(result.data);
    return NextResponse.json(data, { status });
  };
}
