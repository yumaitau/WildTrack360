import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = process.cwd();
const API_DIR = path.join(ROOT, 'src', 'app', 'api');

export interface RouteFile {
  filePath: string;
  openApiPath: string;
}

/** Convert a route.ts file path to its OpenAPI path key. */
function toOpenApiPath(filePath: string): string {
  // e.g. /abs/src/app/api/animals/[id]/route.ts -> /api/animals/{id}
  const rel = path.relative(path.join(ROOT, 'src', 'app'), filePath);
  const withoutSuffix = rel.replace(/[/\\]route\.ts$/, '');
  const posix = withoutSuffix.split(path.sep).join('/');
  // Replace [param] with {param}
  return '/' + posix.replace(/\[([^\]]+)\]/g, '{$1}');
}

/** Recursively collect all route.ts files under src/app/api. */
export function listRouteFiles(): RouteFile[] {
  const results: RouteFile[] = [];

  function walk(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name === 'route.ts') {
        results.push({ filePath: full, openApiPath: toOpenApiPath(full) });
      }
    }
  }

  walk(API_DIR);
  return results;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

/** Extract exported HTTP method names from a route.ts source string. */
export function extractMethods(src: string): string[] {
  const found = new Set<string>();
  for (const method of HTTP_METHODS) {
    // export async function METHOD( or export function METHOD(
    const funcPattern = new RegExp(`\\bexport\\s+(?:async\\s+)?function\\s+${method}\\s*\\(`);
    // export const METHOD = or export const METHOD: NextRouteHandler =
    const constPattern = new RegExp(`\\bexport\\s+const\\s+${method}\\s*[=:]`);
    if (funcPattern.test(src) || constPattern.test(src)) {
      found.add(method);
    }
  }
  return [...found];
}

/**
 * Slice the body of an exported handler function from the source.
 * Handles both `export async function METHOD(` and `export const METHOD =`.
 * Returns null if the method is not found.
 */
function sliceMethodBody(src: string, method: string): string | null {
  // Find the earliest match of the export declaration for this method
  const patterns = [
    new RegExp(`\\bexport\\s+(?:async\\s+)?function\\s+${method}\\s*\\(`),
    new RegExp(`\\bexport\\s+const\\s+${method}\\s*[=:]`),
  ];

  let matchIndex = -1;
  for (const pat of patterns) {
    const m = pat.exec(src);
    if (m !== null && (matchIndex === -1 || m.index < matchIndex)) {
      matchIndex = m.index;
    }
  }
  if (matchIndex === -1) return null;

  // Walk forward from the match to find the opening { of the function body
  let i = matchIndex;
  while (i < src.length && src[i] !== '{') i++;
  if (i >= src.length) return null;

  const start = i;
  let depth = 0;

  while (i < src.length) {
    const ch = src[i];

    if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    } else if (ch === '"' || ch === "'") {
      // Skip string literal
      const q = ch;
      i++;
      while (i < src.length && src[i] !== q) {
        if (src[i] === '\\') i++;
        i++;
      }
    } else if (ch === '`') {
      // Skip template literal (simplified: no nested ${} handling needed for our use)
      i++;
      while (i < src.length && src[i] !== '`') {
        if (src[i] === '\\') i++;
        i++;
      }
    } else if (ch === '/' && i + 1 < src.length && src[i + 1] === '/') {
      // Skip line comment
      while (i < src.length && src[i] !== '\n') i++;
    } else if (ch === '/' && i + 1 < src.length && src[i + 1] === '*') {
      // Skip block comment
      i += 2;
      while (i + 1 < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i++; // skip closing /
    }

    i++;
  }

  return null; // unclosed brace - shouldn't happen on valid TS
}

/**
 * Extract per-method status codes from a route.ts source string.
 *
 * Returns a map of HTTP method -> Set<number> of status codes the method can return.
 * Implements the three escape hatches from invariant #3:
 *   (a) All literals in a status expression (covers ternaries)
 *   (b) Response-helper allowlist: gateFeature -> 404, errorResponse(msg, NNN) -> NNN
 *   (c) Per-route override map (passed in as second argument)
 */
export function extractStatuses(
  src: string,
  overrides: Record<string, number[]> = {},
): Record<string, Set<number>> {
  const methods = extractMethods(src);
  const result: Record<string, Set<number>> = {};

  for (const method of methods) {
    const body = sliceMethodBody(src, method);
    if (!body) continue;

    const statuses = new Set<number>();

    // (a) All [1-5]dd literals in status-bearing expressions.
    // Match `status: <expr>` and extract every 3-digit status from the expression.
    const statusExprRe = /\bstatus\s*:\s*([^\n,}]+)/g;
    let m: RegExpExecArray | null;
    while ((m = statusExprRe.exec(body)) !== null) {
      const expr = m[1];
      const numRe = /\b([1-5]\d\d)\b/g;
      let nm: RegExpExecArray | null;
      while ((nm = numRe.exec(expr)) !== null) {
        statuses.add(parseInt(nm[1], 10));
      }
    }

    // (b) Implicit 200: NextResponse.json( or new NextResponse( without an explicit status option.
    // We check each call site: if the argument list (up to 300 chars ahead) contains no `status:`,
    // the response uses the default 200.
    const jsonCallRe = /NextResponse\.json\s*\(/g;
    while ((m = jsonCallRe.exec(body)) !== null) {
      const ahead = body.slice(m.index + m[0].length, m.index + m[0].length + 300);
      if (!ahead.includes('status:')) {
        statuses.add(200);
      }
    }

    const newNextRe = /new\s+NextResponse\s*\(/g;
    while ((m = newNextRe.exec(body)) !== null) {
      const ahead = body.slice(m.index + m[0].length, m.index + m[0].length + 300);
      if (!ahead.includes('status:')) {
        statuses.add(200);
      }
    }

    // (b) Implicit 307: NextResponse.redirect( without an explicit 3xx status.
    const redirectRe = /NextResponse\.redirect\s*\(/g;
    while ((m = redirectRe.exec(body)) !== null) {
      const ahead = body.slice(m.index + m[0].length, m.index + m[0].length + 100);
      if (!/\b3\d\d\b/.test(ahead)) {
        statuses.add(307);
      }
    }

    // (b) Helper allowlist: gateFeature(...) returns NextResponse with status 404 directly.
    if (/\bgateFeature\s*\(/.test(body)) {
      statuses.add(404);
    }

    // (b) Helper allowlist: errorResponse(message, NNN) - status is the numeric second argument.
    const errRespRe = /\berrorResponse\s*\([^,]+,\s*([1-5]\d\d)\s*[),]/g;
    while ((m = errRespRe.exec(body)) !== null) {
      statuses.add(parseInt(m[1], 10));
    }

    // (c) Override map: fully dynamic statuses (e.g. status: error.status) recorded by hand.
    for (const code of overrides[method] ?? []) {
      statuses.add(code);
    }

    result[method] = statuses;
  }

  return result;
}
