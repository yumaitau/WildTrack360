/**
 * OpenAPI drift gate. Runs under tsx (tsconfig.scripts.json resolves @/ and shims
 * server-only). Three guarantees:
 *   1. Coverage   - every (path, method) exported by a route.ts is either
 *                   contracted (in the generated spec) or in ROUTE_ALLOWLIST.
 *   2. Wiring     - every co-located openapi.ts is imported by manifest.ts
 *                   (else its contract never reaches the spec).
 *   3. Freshness  - public/openapi.json matches the freshly generated document.
 *
 * Modes:
 *   (default)  check; exit 1 on any failure.
 *   --write    regenerate public/openapi.json.
 *   --init     rewrite ROUTE_ALLOWLIST to exactly the currently-uncontracted
 *              pairs (keeps allowlist and contracted disjoint).
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { generateOpenApiDocument } from '@/lib/openapi/generate';
import { ROUTE_ALLOWLIST, type AllowlistEntry } from '@/lib/openapi/route-allowlist';

const SRC = path.resolve('src');
const API_DIR = path.resolve('src/app/api');
const MANIFEST = path.resolve('src/lib/openapi/manifest.ts');
const ALLOWLIST_FILE = path.resolve('src/lib/openapi/route-allowlist.ts');
const SNAPSHOT = path.resolve('public/openapi.json');
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
type Method = (typeof METHODS)[number];

interface Pair {
  path: string;
  method: Method;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

/** src/app/api/animals/[id]/route.ts -> /api/animals/{id} */
function fileToApiPath(file: string): string {
  let rel = path.relative(path.resolve('src/app'), file).replace(/\\/g, '/');
  rel = '/' + rel.replace(/\/route\.ts$/, '');
  return rel.replace(/\[(?:\.\.\.)?([^\]]+)\]/g, '{$1}');
}

function key(method: string, p: string): string {
  return `${method.toUpperCase()} ${p}`;
}

const allFiles = walk(API_DIR);
const routeFiles = allFiles.filter((f) => f.endsWith(`${path.sep}route.ts`));
const contractFiles = allFiles.filter((f) => f.endsWith(`${path.sep}openapi.ts`));

const routePairs: Pair[] = [];
for (const file of routeFiles) {
  const src = readFileSync(file, 'utf8');
  const apiPath = fileToApiPath(file);
  for (const m of METHODS) {
    // Match both the legacy form (`export async function GET`) and the migrated
    // convention form (`export const GET = route(...)`). Missing the const form
    // would silently drop every migrated/new route from the gate.
    if (new RegExp(`export\\s+(?:async\\s+function|const)\\s+${m}\\b`).test(src)) {
      routePairs.push({ path: apiPath, method: m });
    }
  }
}

const doc = generateOpenApiDocument();
const contracted = new Set<string>();
for (const [p, ops] of Object.entries(doc.paths ?? {})) {
  for (const m of Object.keys(ops as Record<string, unknown>)) {
    if ((METHODS as readonly string[]).includes(m.toUpperCase())) contracted.add(key(m, p));
  }
}

const mode = process.argv.includes('--write')
  ? 'write'
  : process.argv.includes('--init')
    ? 'init'
    : 'check';

if (mode === 'init') {
  const uncontracted = routePairs
    .filter((p) => !contracted.has(key(p.method, p.path)))
    .sort((a, b) => key(a.method, a.path).localeCompare(key(b.method, b.path)));
  const entries = uncontracted
    .map((p) => `  { path: '${p.path}', method: '${p.method}' },`)
    .join('\n');
  const header = readFileSync(ALLOWLIST_FILE, 'utf8').split('export const ROUTE_ALLOWLIST')[0];
  writeFileSync(
    ALLOWLIST_FILE,
    `${header}export const ROUTE_ALLOWLIST: AllowlistEntry[] = [\n${entries}\n];\n`,
  );
  console.log(`Wrote ${uncontracted.length} allowlist entries to route-allowlist.ts`);
  process.exit(0);
}

const json = JSON.stringify(doc, null, 2) + '\n';
if (mode === 'write') {
  writeFileSync(SNAPSHOT, json);
  console.log(`Wrote ${SNAPSHOT} (${contracted.size} contracted operations)`);
  process.exit(0);
}

// check mode
const allowed = new Set(ROUTE_ALLOWLIST.map((e: AllowlistEntry) => key(e.method, e.path)));
const routeKeys = new Set(routePairs.map((p) => key(p.method, p.path)));
const errors: string[] = [];
const warnings: string[] = [];

for (const p of routePairs) {
  const k = key(p.method, p.path);
  if (!contracted.has(k) && !allowed.has(k)) {
    errors.push(`Undocumented route (no contract, not allowlisted): ${k}`);
  }
}
for (const a of allowed) {
  if (!routeKeys.has(a)) errors.push(`Stale allowlist entry (no matching route file): ${a}`);
  else if (contracted.has(a)) warnings.push(`Redundant allowlist entry (now contracted): ${a}`);
}

const manifestSrc = readFileSync(MANIFEST, 'utf8');
for (const cf of contractFiles) {
  const spec = '@/' + path.relative(SRC, cf).replace(/\\/g, '/').replace(/\.ts$/, '');
  if (!manifestSrc.includes(spec)) errors.push(`Contract not wired into manifest.ts: ${spec}`);
}

let snapshot = '';
try {
  snapshot = readFileSync(SNAPSHOT, 'utf8');
} catch {
  /* missing snapshot handled below */
}
if (snapshot !== json) {
  errors.push('public/openapi.json is stale - run `npm run openapi:generate`');
}

console.log(
  `Scanned ${routePairs.length} route methods: ${contracted.size} contracted, ${allowed.size} allowlisted.`,
);
for (const w of warnings) console.warn(`WARN: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`FAIL: ${e}`);
  process.exit(1);
}
console.log('openapi:check passed.');
