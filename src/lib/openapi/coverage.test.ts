/**
 * Coverage gate - asserts that every route in src/app/api/ is represented in
 * the OpenAPI document and that every status code the static extractor finds
 * is present in the matching operation's responses.
 *
 * RED until Tasks 4-10 complete (all 116 routes documented).
 * GREEN = Task 11 done.
 */

import * as fs from 'node:fs';
import { describe, it, expect, beforeAll } from 'vitest';
import { buildDocument } from './document';
import { listRouteFiles, extractMethods, extractStatuses } from './route-surface';
import { routeStatusOverrides } from './route-status-overrides';
import type { ZodOpenApiPathsObject } from 'zod-openapi';

interface OpenApiDocument {
  paths?: Record<string, Record<string, { responses?: Record<string, unknown> }>>;
}

describe('OpenAPI coverage gate', () => {
  let doc: OpenApiDocument;
  let paths: ZodOpenApiPathsObject;

  beforeAll(() => {
    doc = buildDocument() as OpenApiDocument;
    paths = (doc.paths ?? {}) as ZodOpenApiPathsObject;
  });

  it('every route file has at least one documented operation (route coverage)', () => {
    const files = listRouteFiles();
    const undocumented: string[] = [];

    for (const { filePath, openApiPath } of files) {
      const src = fs.readFileSync(filePath, 'utf8');
      const methods = extractMethods(src);

      for (const method of methods) {
        const opPath = paths[openApiPath];
        const operation = opPath?.[method.toLowerCase() as keyof typeof opPath];
        if (!operation) {
          undocumented.push(`${method} ${openApiPath}`);
        }
      }
    }

    expect(
      undocumented,
      `${undocumented.length} operations not yet documented:\n${undocumented.slice(0, 30).join('\n')}${undocumented.length > 30 ? `\n...and ${undocumented.length - 30} more` : ''}`,
    ).toHaveLength(0);
  });

  it('every extracted status code appears in the documented responses (status coverage)', () => {
    const files = listRouteFiles();
    const missing: string[] = [];

    for (const { filePath, openApiPath } of files) {
      const src = fs.readFileSync(filePath, 'utf8');
      const perMethodOverrides = routeStatusOverrides[openApiPath] ?? {};
      const allStatuses = extractStatuses(src, perMethodOverrides as Record<string, number[]>);

      for (const [method, codes] of Object.entries(allStatuses)) {
        const opPath = paths[openApiPath];
        const operation = opPath?.[method.toLowerCase() as keyof typeof opPath] as
          | { responses?: Record<string, unknown> }
          | undefined;
        if (!operation) continue; // undocumented - caught by route coverage test above

        const responseCodes = new Set(Object.keys(operation.responses ?? {}));

        for (const code of codes) {
          if (!responseCodes.has(String(code))) {
            missing.push(`${method} ${openApiPath}: documented status ${code} missing from responses`);
          }
        }
      }
    }

    expect(
      missing,
      `${missing.length} status codes missing from documented responses:\n${missing.slice(0, 30).join('\n')}${missing.length > 30 ? `\n...and ${missing.length - 30} more` : ''}`,
    ).toHaveLength(0);
  });
});
