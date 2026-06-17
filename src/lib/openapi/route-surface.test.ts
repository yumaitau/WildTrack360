import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { listRouteFiles, extractMethods, extractStatuses } from './route-surface';

const ROOT = process.cwd();

describe('listRouteFiles', () => {
  it('finds exactly 116 route files', () => {
    const files = listRouteFiles();
    expect(files).toHaveLength(116);
  });

  it('converts file paths to /api/... OpenAPI paths', () => {
    const files = listRouteFiles();
    const paths = files.map(f => f.openApiPath);
    expect(paths).toContain('/api/animals');
    expect(paths).toContain('/api/animals/{id}');
    expect(paths).toContain('/api/members/export');
  });

  it('replaces [param] segments with {param}', () => {
    const files = listRouteFiles();
    const paths = files.map(f => f.openApiPath);
    // No square brackets should remain
    expect(paths.every(p => !p.includes('['))).toBe(true);
    expect(paths.every(p => !p.includes(']'))).toBe(true);
  });
});

describe('extractMethods', () => {
  it('finds GET and POST on animals/route.ts', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/app/api/animals/route.ts'), 'utf8');
    const methods = extractMethods(src);
    expect(methods.sort()).toEqual(['GET', 'POST']);
  });

  it('finds PATCH and DELETE (no GET) on animals/[id]/route.ts', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/app/api/animals/[id]/route.ts'), 'utf8');
    const methods = extractMethods(src);
    expect(methods.sort()).toEqual(['DELETE', 'PATCH']);
    expect(methods).not.toContain('GET');
  });
});

describe('extractStatuses - per-method scoping (invariant #2)', () => {
  it('GET /api/animals: 200 (implicit), 400, 401, 403, 500', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/app/api/animals/route.ts'), 'utf8');
    const statuses = extractStatuses(src);
    expect([...statuses['GET']!].sort((a, b) => a - b)).toEqual([200, 400, 401, 403, 500]);
  });

  it('POST /api/animals: 201, 400, 401, 403, 422, 500', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/app/api/animals/route.ts'), 'utf8');
    const statuses = extractStatuses(src);
    expect([...statuses['POST']!].sort((a, b) => a - b)).toEqual([201, 400, 401, 403, 422, 500]);
  });

  it('GET /api/animals does NOT include 201 or 422 (method-scoping guard)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/app/api/animals/route.ts'), 'utf8');
    const statuses = extractStatuses(src);
    expect(statuses['GET']!.has(201)).toBe(false);
    expect(statuses['GET']!.has(422)).toBe(false);
  });
});

describe('extractStatuses - helper allowlist (invariant #3b)', () => {
  it('GET /api/members/export: 200 (explicit), 401, 403, 404 (from gateFeature)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/app/api/members/export/route.ts'), 'utf8');
    const statuses = extractStatuses(src);
    expect([...statuses['GET']!].sort((a, b) => a - b)).toEqual([200, 401, 403, 404]);
  });
});

describe('extractStatuses - ternary / all-literals scan (invariant #3a)', () => {
  it('pindrop POST/GET yields both 422 and 500 from ternary status expression', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/app/api/pindrop/route.ts'), 'utf8');
    const statuses = extractStatuses(src);
    const anyMethod = Object.values(statuses).some(s => s.has(422) && s.has(500));
    expect(anyMethod).toBe(true);
  });
});

describe('route-status-overrides completeness (invariant #3c)', () => {
  it('every route file with status: error.status has an entry in routeStatusOverrides', async () => {
    const { routeStatusOverrides } = await import('./route-status-overrides');
    const files = listRouteFiles();
    const missing: string[] = [];

    for (const { filePath, openApiPath } of files) {
      const src = fs.readFileSync(filePath, 'utf8');
      // Match `status: expr.prop` only when the property access is the actual value,
      // not a ternary condition. Require word.word to be followed by } or , (closing
      // the options object), which excludes `status: flag.blocked ? 422 : 500`
      // where the word.word is the condition before the ? operator.
      if (/(?:NextResponse\.json|new\s+NextResponse)\s*\([^)]*\bstatus\s*:\s*\w+\.\w+\s*[},]/.test(src)) {
        if (!routeStatusOverrides[openApiPath]) {
          missing.push(openApiPath);
        }
      }
    }

    expect(
      missing,
      `Routes with dynamic error.status missing from routeStatusOverrides:\n${missing.join('\n')}`,
    ).toHaveLength(0);
  });
});

describe('structural guard (invariant #1)', () => {
  const FORBIDDEN = ['@/lib/prisma', '@/lib/clerk-server', '@/lib/rbac', 'server-only'];

  function checkFile(filePath: string): string[] {
    if (!fs.existsSync(filePath)) return [];
    const src = fs.readFileSync(filePath, 'utf8');
    return FORBIDDEN.filter(dep => {
      // Anchor to line-start so occurrences inside comments (e.g. `* import 'server-only'`) are excluded.
      const importPattern = new RegExp(
        `^\\s*(?:import|require)\\s*(?:[^'"]*from\\s*)?['"\`]${dep}['"\`]`,
        'm',
      );
      return importPattern.test(src);
    });
  }

  it('generate-openapi.ts imports no server-only modules', () => {
    const violations = checkFile(path.join(ROOT, 'scripts/generate-openapi.ts'));
    expect(violations).toHaveLength(0);
  });

  it('src/lib/openapi/**/*.ts import no server-only modules', () => {
    const openapiDir = path.join(ROOT, 'src/lib/openapi');
    const tsFiles = fs.readdirSync(openapiDir, { recursive: true, encoding: 'utf8' })
      .filter((f): f is string => typeof f === 'string' && f.endsWith('.ts') && !f.endsWith('.test.ts'));

    const violations: string[] = [];
    for (const relFile of tsFiles) {
      const hits = checkFile(path.join(openapiDir, relFile));
      if (hits.length) violations.push(`${relFile}: ${hits.join(', ')}`);
    }
    expect(violations).toHaveLength(0);
  });
});
