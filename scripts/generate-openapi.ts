/**
 * Generate docs/api/openapi.json from the src/lib/openapi document assembly.
 *
 * Usage:
 *   tsx scripts/generate-openapi.ts                     # writes docs/api/openapi.json
 *   tsx scripts/generate-openapi.ts --out /tmp/spec.json # writes to a custom path
 *   OPENAPI_OUT=/tmp/spec.json tsx scripts/generate-openapi.ts
 *
 * IMPORTANT: this script must NEVER import route handlers, @/lib/prisma,
 * @/lib/clerk-server, or @/lib/rbac. They all transitively import 'server-only'
 * which crashes plain tsx. Import only from ../src/lib/openapi/.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { buildDocument } from '../src/lib/openapi/document';

// Resolve output path: --out flag > OPENAPI_OUT env > default.
function resolveOutputPath(): string {
  const outFlag = process.argv.indexOf('--out');
  if (outFlag !== -1 && process.argv[outFlag + 1]) {
    return process.argv[outFlag + 1];
  }
  if (process.env.OPENAPI_OUT) {
    return process.env.OPENAPI_OUT;
  }
  return path.join(process.cwd(), 'docs', 'api', 'openapi.json');
}

/** Recursively sort all object keys so JSON output is deterministic across runs. */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as object).sort()) {
      sorted[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

const doc = buildDocument();
const sorted = sortKeys(doc);
const json = JSON.stringify(sorted, null, 2) + '\n';

const outputPath = resolveOutputPath();
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, json, 'utf8');
console.log(`OpenAPI spec written to ${outputPath} (${json.length} bytes)`);
