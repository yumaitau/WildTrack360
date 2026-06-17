/**
 * Verifies that docs/api/openapi.json matches what the generator would produce.
 * Exits 1 if the committed file is stale.
 *
 * Run via: npm run docs:api:check
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { buildDocument } from '../src/lib/openapi/document';

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

const committedPath = path.join(process.cwd(), 'docs', 'api', 'openapi.json');

if (!fs.existsSync(committedPath)) {
  console.error('docs/api/openapi.json not found. Run: npm run docs:api:json');
  process.exit(1);
}

const committed = fs.readFileSync(committedPath, 'utf8');
const generated = JSON.stringify(sortKeys(buildDocument()), null, 2) + '\n';

if (committed !== generated) {
  console.error('docs/api/openapi.json is stale. Run: npm run docs:api:json');
  process.exit(1);
}

console.log('docs/api/openapi.json is up to date');
