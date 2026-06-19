import type { ZodTypeAny } from 'zod';
import { z, registry } from '@/lib/openapi/registry';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';
export type SecurityName = 'clerkSession' | 'internalSecret' | 'squareSignature' | 'public';

export interface ResponseDef {
  description: string;
  schema?: ZodTypeAny;
  /** For non-JSON responses (e.g. 'text/csv'). No schema validation occurs. */
  content?: string;
}

export interface ContractConfig<
  P extends ZodTypeAny | undefined = ZodTypeAny | undefined,
  Q extends ZodTypeAny | undefined = ZodTypeAny | undefined,
  B extends ZodTypeAny | undefined = ZodTypeAny | undefined,
> {
  method: HttpMethod;
  path: string;
  summary: string;
  tags?: string[];
  /** Security scheme name, or 'public' for no auth. */
  security?: SecurityName;
  request?: { params?: P; query?: Q; body?: B };
  responses: Record<number, ResponseDef>;
  /** The 2xx status the handler returns on success (used to pick the response schema). */
  successStatus: number;
}

type RegisterPathArg = Parameters<typeof registry.registerPath>[0];
type RequestArg = NonNullable<RegisterPathArg['request']>;

/**
 * Register a route's OpenAPI path + schemas into the shared registry and return
 * the config so the handler can import the same schemas. PURE: imports only zod
 * + the registry, never server-only / Clerk / Prisma, so the CI generate/check
 * script can import it under tsx.
 */
export function defineContract<
  P extends ZodTypeAny | undefined = undefined,
  Q extends ZodTypeAny | undefined = undefined,
  B extends ZodTypeAny | undefined = undefined,
>(config: ContractConfig<P, Q, B>): ContractConfig<P, Q, B> {
  const security =
    config.security && config.security !== 'public' ? [{ [config.security]: [] }] : undefined;

  const responses: RegisterPathArg['responses'] = {};
  for (const [status, def] of Object.entries(config.responses)) {
    responses[Number(status)] = def.schema
      ? { description: def.description, content: { [def.content ?? 'application/json']: { schema: def.schema } } }
      : def.content
        ? { description: def.description, content: { [def.content]: { schema: z.string() } } }
        : { description: def.description };
  }

  const request: RequestArg = {};
  if (config.request?.params) request.params = config.request.params as RequestArg['params'];
  if (config.request?.query) request.query = config.request.query as RequestArg['query'];
  if (config.request?.body) {
    request.body = { content: { 'application/json': { schema: config.request.body } } };
  }

  registry.registerPath({
    method: config.method,
    path: config.path,
    summary: config.summary,
    ...(config.tags ? { tags: config.tags } : {}),
    ...(security ? { security } : {}),
    request,
    responses,
  });

  return config;
}
