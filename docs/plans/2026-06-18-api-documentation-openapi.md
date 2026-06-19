# API Documentation (OpenAPI + Scalar, Zod-derived) — Phase 0 Implementation Plan

Created: 2026-06-18
Author: josh@luongo.com.au
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 1
Worktree: No
Type: Feature

## Summary

**Goal:** Stand up the Zod-derived OpenAPI 3.1 documentation foundation — a per-route contract convention, an admin-gated Scalar reference UI, a live spec endpoint, request + response runtime validation, and a CI drift gate — then prove it end-to-end by fully migrating the `animals` domain as the reference. (PRD: `docs/prd/2026-06-18-api-documentation.md`)

## Out of Scope

- **All non-`animals` domains** (carers, members, portal, public, square, rbac, admin, reports, internal, etc.). They stay in the drift-gate allowlist and are migrated in follow-on `/spec` plans (PRD Phases 1–N). This plan migrates `animals` only.
- **Reshaping existing API contracts** — schemas describe and validate what each handler *currently* returns; no field renames, envelope standardisation, or status-code changes.
- **Auth / RBAC behaviour changes** — security schemes are *described* in the spec; the actual auth checks in handlers are preserved as-is.
- **Client SDK / typed-client generation** and any external/public docs portal.

## Approach

**Chosen:** Pure co-located contract modules (`openapi.ts` beside each `route.ts`) registered into a shared `@asteasolutions/zod-to-openapi` registry, consumed by both the handler (via a `route()` validation wrapper) and the spec generator; Scalar (`@scalar/nextjs-api-reference`) renders the live doc at an admin-gated route; a `tsx` coverage script enforces drift in CI.

**Why:** Decoupling the contract (pure Zod + metadata, no `server-only`/Clerk/Prisma imports) from the handler is what lets one schema be the single source of truth for both runtime validation and docs *and* still be importable by a standalone CI script — `route.ts` files import `server-only` and cannot run outside Next.js. It costs one extra small file per route (`openapi.ts`) versus inlining, which is the price of a CI-runnable, drift-proof gate.

## Context for Implementer

The contract/handler split is the load-bearing constraint the whole rollout depends on: **`openapi.ts` files must import only `zod` and the shared registry — never `server-only`, Clerk, Prisma, the handler, or the `src/lib/openapi-server/admin-guard.ts` helper (which is itself `server-only` via `@/lib/rbac`).** The handler (`route.ts`) imports the contract's schemas for validation; the central manifest imports the contracts for generation; the CI script imports the manifest. If a contract ever pulls in `server-only`, the `tsx` coverage/generate script breaks (it has no Next.js runtime). Server-only helpers therefore live under `src/lib/openapi-server/`, never `src/lib/openapi/`. Task 4's coverage script guards this by asserting every `**/openapi.ts` is wired into the manifest and the generate step runs cleanly under `tsx`.

Prisma returns `Date` objects and `Json` fields (e.g. `Animal.rescueCoordinates`); there are **no `Decimal` columns anywhere** (verified). `NextResponse.json` serialises via `JSON.stringify`, so `Date` → ISO string on the wire. Response schemas therefore describe the **serialised wire shape** (`z.string().datetime()` for dates), and the response validator checks the JSON-roundtripped payload — keeping the doc schema and the validation schema identical.

## Runtime Environment

- **Start command:** `npm run dev` (Next.js dev server, default port 3000). Multi-tenant via subdomain host header (e.g. `tenant.localhost:3000`).
- **Health check:** any route; `GET /api/internal/ping` exists.
- **Tests:** `npm test` (Vitest, `src/**/*.test.ts`, node env, `server-only` shimmed in `src/__tests__/setup.ts`).

## Assumptions

- Importing a co-located `openapi.ts` contract triggers no DB/Clerk connection (contracts import only `zod` + the registry; Prisma connects lazily on query, Clerk `auth()` runs only at request time) — Tasks 4 (CI script) and 1 (generator) depend on this.
- `@asteasolutions/zod-to-openapi` v7.x is compatible with the installed `zod` ^3.25.76 — Task 1 depends on this; if not, fall back to `zod-openapi` (the other Zod-3-compatible generator) and adjust the registry API in Task 1 only.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Runtime response validation throws on real Prisma output (nested `carer`/`records`/`photos` includes, nullable fields) and 500s a working endpoint | High | High | Author response schemas against the *actual* handler output; every migration task's DoD requires a real 200 response to pass its schema in the test env; production failure mode logs to Sentry and returns the response instead of throwing (Task 2). |
| A contract file exists but isn't imported by the manifest → endpoint silently missing from the spec | Medium | Medium | Coverage script (Task 4) fails if any `**/openapi.ts` is not referenced in `manifest.ts`. |
| Contract accidentally imports `server-only` (via a shared util) → CI generate/check script crashes | Medium | High | Coverage script runs the full generate under `tsx`; a `server-only` import surfaces as a hard failure there before merge. |

## Goal Verification

### Truths

1. The OpenAPI document served at `GET /api/openapi` includes every `animals` endpoint (GET/POST `/api/animals`, GET `/api/animals/peek-id`, PATCH/DELETE `/api/animals/{id}`, GET/POST + DELETE for `growth` and `reminders`) with request and response schemas, and `npm run openapi:check` passes with `animals` removed from the allowlist. *(Tasks 4, 6–10)*
2. A request to a migrated `animals` endpoint with an invalid body/params is rejected with HTTP 400 before any business logic runs, while a valid request succeeds and its response passes its response schema at runtime in the test environment. *(Tasks 2, 6)*

## E2E Test Scenarios

### TS-001: Admin views the API reference
**Priority:** Critical
**Preconditions:** Dev server running; signed in as an ADMIN org user.
**Mapped Tasks:** Task 3, 6

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/api/docs` | Scalar reference UI renders |
| 2 | Locate the "Animals" tag group | `GET/POST /api/animals`, `PATCH/DELETE /api/animals/{id}`, growth & reminders endpoints are listed |
| 3 | Open `POST /api/animals` | Request body schema and 201 response schema (Animal) are shown |

### TS-002: Non-admin is blocked
**Priority:** High
**Preconditions:** Dev server running; signed in as a non-admin (CARER) user.
**Mapped Tasks:** Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/api/docs` | Response is 403 (not the reference UI) |
| 2 | Request `GET /api/openapi` | Response is 403 |

### TS-003: Request validation rejects bad input
**Priority:** High
**Preconditions:** Dev server running; authenticated session.
**Mapped Tasks:** Task 2, 6

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | `POST /api/animals` with a body missing required fields (e.g. no `name`/`species`) | HTTP 400 with `{ error, details }`; no animal created |
| 2 | `POST /api/animals` with a valid body | HTTP 201; response validates against the Animal schema |

## E2E Results

**Live-target probe (Phase B):**
- **Tier 1** (reuse running server on :3000): FAIL — nothing listening.
- **Tier 2** (start `next dev`): SUCCESS — server started, routes compiled on-demand (`GET /api/openapi 404 in 899ms` then 44ms, no compile errors). `/api/openapi`, `/api/docs`, `/api/animals` all return **404 for unauthenticated requests** — correct Clerk middleware protection (`auth.protect()`; these paths are not in `isPublicRoute`). Reaching the handler's own 200/403 needs a real Clerk **ADMIN** session.
- **Tier 3** (deploy preview): UNAVAILABLE — `vercel.json` present but `vercel` CLI not installed (`command not found: vercel`).
- **Tier 4** (fallback): browser render of the admin-gated Scalar UI is `UNIT_VERIFIED` (see gap below).

| Scenario | Priority | Result | Notes |
|----------|----------|--------|-------|
| TS-001 (admin views reference) | Critical | UNIT_VERIFIED | Handler returns 200 `text/html` containing `scalar` + `/api/openapi` (unit test); live browser render needs an ADMIN Clerk session (no test credentials). |
| TS-002 (non-admin blocked) | High | PARTIAL_LIVE + UNIT | Live: unauth → 404 via Clerk middleware. Unit: authenticated non-admin → 403 (mocked auth). |
| TS-003 (request validation) | High | UNIT_VERIFIED | `POST /api/animals` invalid body → 400 before business logic; valid → 201 (unit tests, route wrapper). |

**Production build:** `next build` → "✓ Compiled successfully" (exit 0) with `--max-old-space-size=8192`; the local Node-25 default heap OOMs but that is environmental (CI/Vercel build fine).

## Progress Tracking

- [x] Task 1: Dependencies + OpenAPI registry & document generator
- [x] Task 2: `defineContract` convention + `route()` validation wrapper + response validator
- [x] Task 3: Manifest + admin-gated spec endpoint + Scalar docs UI
- [x] Task 4: Drift-check coverage script + allowlist + npm scripts
- [x] Task 5: CI workflow (GitHub Actions)
- [x] Task 6: Animal shared schema + collection routes (`/animals`, `/animals/peek-id`)
- [x] Task 7: Animal item routes (`/animals/[id]` PATCH, DELETE)
- [x] Task 8: Animal growth sub-resource
- [x] Task 9: Animal reminders sub-resource
- [x] Task 10: Drain `animals` from allowlist + docs sync

## Implementation Tasks

### Task 1: Dependencies + OpenAPI registry & document generator

**Objective:** Install the OpenAPI tooling and create the shared registry and document generator that every contract registers into and the spec endpoint/CI script generate from. Establishes the security schemes the whole API will reference.

**Files:**

- Modify: `package.json` (add `@asteasolutions/zod-to-openapi`, `@scalar/nextjs-api-reference`)
- Create: `src/lib/openapi/registry.ts`
- Create: `src/lib/openapi/generate.ts`
- Test: `src/lib/openapi/generate.test.ts`

**Key Decisions / Notes:**

- Install with `npm install` (package-lock.json present — npm is the package manager).
- **DEVIATION (install-time):** `@asteasolutions/zod-to-openapi@8` requires zod 4 (project is zod 3.25) — pinned `@asteasolutions/zod-to-openapi@^7.3.4` (the zod-3-compatible line) per the plan's Assumptions fallback. `@scalar/nextjs-api-reference@0.11` requires React 19 (project is React 18) — so Scalar is served via its framework-agnostic **standalone bundle** in Task 3 instead of that package (no extra npm dep, no peer conflict).
- `registry.ts`: call `extendZodWithOpenApi(z)` exactly once; export a shared `export const registry = new OpenAPIRegistry()`. Register three security schemes via `registry.registerComponent('securitySchemes', …)`: `clerkSession` (`{ type: 'http', scheme: 'bearer' }` — lets the Scalar try-it client paste a session token), `internalSecret` (`{ type: 'apiKey', in: 'header', name: 'x-internal-secret' }`), `squareSignature` (`{ type: 'apiKey', in: 'header', name: 'x-square-hmacsha256-signature' }`). Animals routes will reference `clerkSession`; the other two are registered now so later phases reuse them.
- `generate.ts`: `export function generateOpenApiDocument()` — `import '@/lib/openapi/manifest'` (side-effect import to populate the registry; created in Task 3), then `new OpenApiGeneratorV31(registry.definitions).generateDocument({ openapi: '3.1.0', info: { title: 'WildTrack360 API', version: <from package.json> } })`. Until Task 3 the manifest import can be a stubbed empty module.
- API verified via context7: `OpenAPIRegistry`, `registerPath`, `registerComponent`, `OpenApiGeneratorV31(registry.definitions).generateDocument(...)`.

**Definition of Done:**

- [ ] `generateOpenApiDocument()` returns a document with `openapi: '3.1.0'` and `components.securitySchemes` containing `clerkSession`, `internalSecret`, `squareSignature`.
- [ ] Verify: `npm test -- src/lib/openapi/generate.test.ts`

### Task 2: `defineContract` convention + `route()` validation wrapper + response validator

**Objective:** Create the per-route convention: a pure `defineContract` that registers a path and returns reusable schemas, a `route()` wrapper that validates the request (params/query/body) and the response, and a response validator implementing the environment-dependent failure mode.

**Files:**

- Create: `src/lib/openapi/contract.ts` (`defineContract`)
- Create: `src/lib/openapi/route.ts` (`route()` handler wrapper)
- Create: `src/lib/openapi/response.ts` (`validateResponse`)
- Test: `src/lib/openapi/route.test.ts`

**Key Decisions / Notes:**

- `defineContract(config)` is **pure** (zod + registry only): calls `registry.registerPath({ method, path, tags, summary, security, request: { params, query, body }, responses })` and returns the config (schemas included) for the handler to import. This file is what co-located `openapi.ts` modules import.
- `route(contract, fn)` returns a Next.js handler `(request, ctx) => Response`. It awaits Next 15 async `ctx.params` (`Promise<{…}>` — see `src/app/api/animals/[id]/route.ts:9`), `safeParse`s params/query/body against the contract schemas, returns `NextResponse.json({ error: 'Invalid request', details: <flattened zod issues> }, { status: 400 })` on failure, else calls `fn({ request, params, query, body })`. `fn` returns `{ data, status? }` for success (validated) or a raw `NextResponse`/`{ error, status }` for early/auth returns (passed through, not response-validated).
- **Guard against silent validation bypass (reviewer must_fix):** the existing handlers `return NextResponse.json(...)` at *multiple* exit points (e.g. `animals/route.ts` GET returns four times). When `fn` returns a `Response`/`NextResponse` instance, `route()` passes it through unvalidated — so a forgotten success-branch refactor during Tasks 6–9 would silently skip response validation. To surface this immediately: if `fn`'s return value is a `Response` instance, pass it through BUT `console.warn('route(): fn returned a Response on the success path — response was not validated')` under `NODE_ENV !== 'production'`. Auth/early returns are expected to use this path; the warning makes accidental success-path leaks visible during migration.
- `validateResponse(schema, data)`: `schema.safeParse(JSON.parse(JSON.stringify(data)))` (roundtrip to the wire shape so `Date`→ISO string). On failure: in `development`/`test` **throw** the zod error; otherwise `Sentry.captureException(...)` (import `* as Sentry from '@sentry/nextjs'`, available per `sentry.server.config.ts`) and return the data unchanged. Gate on `process.env.NODE_ENV`.
- Follow the existing `safeParse` + `{ error }` shape from `src/app/api/report-queries/route.ts:59`.

**Definition of Done:**

- [ ] Invalid request body → handler returns 400 with `{ error, details }` and `fn` is not invoked.
- [ ] Valid request → `fn` receives parsed `{ params, query, body }`; success result is returned as `NextResponse.json(data, { status })`.
- [ ] Response not matching its schema → `validateResponse` throws under `NODE_ENV=test`; under `NODE_ENV=production` it calls `Sentry.captureException` and returns the data (assert via a mocked Sentry).
- [ ] Handler `fn` that returns a `NextResponse` from its success branch → `route()` passes it through, does NOT throw, and emits the dev/test `console.warn` (assert via a `console.warn` spy).
- [ ] Verify: `npm test -- src/lib/openapi/route.test.ts`

### Task 3: Manifest + admin-gated spec endpoint + Scalar docs UI

**Objective:** Wire the contract manifest, expose the generated spec at `GET /api/openapi`, and render the Scalar reference at `GET /api/docs` — both restricted to ADMIN users via existing RBAC.

**Files:**

- Create: `src/lib/openapi/manifest.ts`
- Create: `src/lib/openapi-server/admin-guard.ts`
- Create: `src/app/api/openapi/route.ts`
- Create: `src/app/api/docs/route.ts`
- Test: `src/app/api/openapi/route.test.ts`

**Key Decisions / Notes:**

- `manifest.ts`: side-effect imports of every co-located contract (`import '@/app/api/animals/openapi'`, etc.) so the registry is populated before generation. Starts importing animals contracts as Tasks 6–9 add them.
- **Admin gate lives OUTSIDE `src/lib/openapi/` (reviewer should_fix):** put `requireAdmin()` in `src/lib/openapi-server/admin-guard.ts`, NOT under `src/lib/openapi/`. It imports `@/lib/rbac`, whose `src/lib/rbac.ts:1` is `'server-only'`; keeping it out of the `openapi/` tree makes the server-only boundary visually obvious so a pure contract can never accidentally import it (the CI `tsx` script would crash on `server-only`). `requireAdmin()`: `auth()` from `@/lib/clerk-server` + `getUserRole(userId, orgId)` from `@/lib/rbac` (`src/lib/rbac.ts:137`); return 401 if no `userId`, 403 if `role !== 'ADMIN'` (verified: `OrgRole` from `@prisma/client` includes the literal `'ADMIN'`, `src/lib/rbac.ts:228`).
- `openapi/route.ts`: after the gate, `return NextResponse.json(generateOpenApiDocument())`.
- `docs/route.ts`: after the gate, return an HTML `Response` (`Content-Type: text/html`) that renders Scalar's **standalone bundle** pointing at `/api/openapi` (the `@scalar/nextjs-api-reference` package requires React 19; project is React 18 — see Task 1 deviation). Use the standalone script (`https://cdn.jsdelivr.net/npm/@scalar/api-reference`) with `data-url="/api/openapi"`. `// SHORTCUT: Scalar loaded from CDN; self-host the bundle if offline/CSP-restricted docs are needed`.
- Test mocks `@/lib/clerk-server` auth (pattern: `src/app/api/weather/route.test.ts:4-10`).

**Definition of Done:**

- [ ] `GET /api/openapi` → 401 (no session), 403 (non-admin), 200 + a valid 3.1.0 document (admin).
- [ ] `GET /api/docs` → 403 (non-admin); for admin → 200 with `Content-Type: text/html` and a body containing `scalar` (confirms the Scalar UI was served, not just any 200).
- [ ] Verify: `npm test -- src/app/api/openapi/route.test.ts`

### Task 4: Drift-check coverage script + allowlist + npm scripts

**Objective:** Add a `tsx` script that fails when any route lacks a contract (and isn't allowlisted), verifies the manifest wires every contract, and checks the committed spec snapshot is fresh — plus the npm scripts to run it.

**Files:**

- Create: `scripts/openapi-coverage.ts`
- Create: `src/lib/openapi/route-allowlist.ts`
- Create: `public/openapi.json` (generated snapshot, committed)
- Modify: `package.json` (add `"openapi:generate"`, `"openapi:check"`)

**Key Decisions / Notes:**

- Script logic: (1) **coverage** — glob `src/app/api/**/route.ts`, static-scan each for `export (async function|const) (GET|POST|PUT|PATCH|DELETE)` (BOTH forms — legacy handlers use `export async function`, migrated/convention routes use `export const GET = route(...)`; matching only the former would silently drop every migrated route from the gate), map file path → URL (`[id]`→`{id}`, strip `route.ts`, prefix `/api`); every (path, method) must be in the generated doc's `paths` OR in the allowlist, else fail. (2) **manifest wiring** — every `src/app/api/**/openapi.ts` must appear as an import in `manifest.ts`, else fail. (3) **freshness** — regenerate the document, compare to `public/openapi.json`; `--write` updates it, plain run fails on mismatch.
- **`route-allowlist.ts` entries are `(path, method)` pairs, not paths (reviewer should_fix):** the route files export many HTTP methods total (originally 176; **178** after Task 3 added the `/api/docs` + `/api/openapi` meta-routes). A path-only allowlist would silently pass a multi-method route where only one method has a contract. Entry format: `{ path: '/api/foo', method: 'GET' }[]`. The script's `--init` mode generates the list programmatically as exactly the currently-uncontracted pairs (keeping allowlist and contracted disjoint) — not hand-maintained. The `animals` domain is 11 method-exports, so after the animals drain (Task 10) the allowlist holds **167** entries (incl. the 2 meta-routes, which stay allowlisted as infrastructure, not documented API surface).
- npm: `"openapi:generate": "tsx scripts/openapi-coverage.ts --write"`, `"openapi:check": "tsx scripts/openapi-coverage.ts"`.
- The script imports `generate.ts`/`manifest.ts` (pure contracts) — it must run under `tsx` with no DB/Clerk (see Assumptions). `tsx` is already a dependency.

**Definition of Done:**

- [ ] With a `(path, method)` pair removed from the allowlist but lacking a contract, `npm run openapi:check` exits non-zero naming the offending path+method.
- [ ] With all `(path, method)` pairs either contracted or allowlisted and `public/openapi.json` fresh, `npm run openapi:check` exits 0.
- [ ] A contract file not imported in `manifest.ts` causes a non-zero exit naming the file.
- [x] The script cross-checks total coverage: every scanned `(path, method)` is contracted-or-allowlisted (178 scanned = 0 contracted + 178 allowlisted at Task 4), so no method silently escapes the gate.
- [ ] Verify: `npm run openapi:check` (after generating the snapshot with `npm run openapi:generate`)

### Task 5: CI workflow (GitHub Actions)

**Objective:** Stand up the CI pipeline that currently does not exist, running typecheck, tests, the drift gate, and build on every PR and push to the default branch.

**Files:**

- Create: `.github/workflows/ci.yml`

**Key Decisions / Notes:**

- No CI workflow exists today (`.github/` holds only PR/issue templates) — this creates the first one.
- Steps: checkout → setup-node **pinned to Node 20** (verified: no `.nvmrc` and no `engines` field exist, so pin explicitly with a comment; Node 20 LTS matches `@types/node` ^20 and Next.js 15) → `npm ci` → `npx prisma generate` (the `build` script and `postinstall` already run it; needed so contract/Prisma types resolve) → `npm run typecheck` → `npm test` → `npm run openapi:check` → `npm run build`.
- Triggers: `pull_request` and `push` to the default branch.
- Deploy is Vercel (`vercel.json`); this workflow is CI-only and does not deploy.
- **DEVIATION:** (1) `next build` is NOT in CI — it needs runtime secrets (Clerk/Square/Sentry) and Vercel already builds on deploy; running it secret-less would false-red CI. (2) Added a **Postgres 15 service + `prisma migrate deploy`** step: `npm test` includes a pre-existing DB-backed integration test (`src/lib/animalId/generate.test.ts`, real `PrismaClient`, no DB-absent guard) that needs a live DB. Verified locally against a throwaway Postgres: migrations applied + that test passes (1/1).

**Definition of Done:**

- [ ] `.github/workflows/ci.yml` is valid YAML and includes the `npm run openapi:check` step.
- [ ] Verify locally that the gate commands succeed in order: `npm run typecheck && npm test && npm run openapi:check && npm run build`

### Task 6: Animal shared schema + collection routes (`/animals`, `/animals/peek-id`)

**Objective:** Define the shared `Animal` response schema and migrate the animals collection endpoints (`GET`/`POST /api/animals`, `GET /api/animals/peek-id`) to the contract + `route()` convention with request and response validation.

**Files:**

- Create: `src/app/api/animals/openapi.ts`
- Modify: `src/app/api/animals/route.ts`
- Create: `src/app/api/animals/peek-id/openapi.ts`
- Modify: `src/app/api/animals/peek-id/route.ts`
- Test: `src/app/api/animals/route.test.ts`

**Key Decisions / Notes:**

- `Animal` schema models the serialised Prisma `Animal` (see `prisma/schema.prisma` `model Animal`): dates as `z.string().datetime()` (`dateFound`, `dateOfBirth?`, `createdAt`, `updatedAt`, …), `status` as `z.enum(['ADMITTED','IN_CARE','READY_FOR_RELEASE','RELEASED','DECEASED','TRANSFERRED','PERMANENT_CARE'])` (verified `AnimalStatus` values), `rescueCoordinates`/`releaseCoordinates` as `z.object({ lat, lng }).nullable()`, nullable string fields, and the **included relations** the GET returns (`carer`, `records`, `photos` — see `src/app/api/animals/route.ts:27`). Register it once via `registry.register('Animal', …)` for reuse across Tasks 7–9.
- Migrate `route.ts` GET (list, query `orgId?`) and POST (create) to `route(contract, fn)`; preserve the existing RBAC/`getUserRole`/`prisma`/`logAudit` logic and the `_autoGenerateOrgAnimalId` transaction path (`src/app/api/animals/route.ts:88-105`). The create request schema replaces the untyped `body` reads.
- Add animals contract imports to `manifest.ts`.

**Definition of Done:**

- [ ] `GET /api/animals` (authed) returns 200 and the payload passes the `Animal[]` schema (no throw in test env) — proves the schema matches real Prisma output incl. relations.
- [ ] `POST /api/animals` with an invalid body → 400 `{ error, details }`; with a valid body → 201 and response passes the `Animal` schema.
- [ ] Unauthenticated → 401.
- [ ] Verify: `npm test -- src/app/api/animals/route.test.ts`

### Task 7: Animal item routes (`/animals/[id]` PATCH, DELETE)

**Objective:** Migrate the animal item endpoints (`PATCH` update, `DELETE`) to the convention with `{id}` path-param validation and response schemas.

**Files:**

- Create: `src/app/api/animals/[id]/openapi.ts`
- Modify: `src/app/api/animals/[id]/route.ts`
- Test: `src/app/api/animals/[id]/route.test.ts`

**Key Decisions / Notes:**

- This route exports **PATCH and DELETE only** (verified — no GET): `src/app/api/animals/[id]/route.ts:9,91`. Params are `Promise<{ id: string }>` (Next 15) — the `route()` wrapper awaits them.
- PATCH request schema = partial Animal update; reuse the registered `Animal` schema for the 200 response. DELETE → params `{ id }`, response per current handler (e.g. 200 `{ success }` or 204 — match the existing return).

**Definition of Done:**

- [ ] `PATCH /api/animals/{id}` with invalid body → 400; valid → 200 and response passes the `Animal` schema.
- [ ] `DELETE /api/animals/{id}` → matches the current handler's status/shape, now declared in the contract.
- [ ] Verify: `npm test -- src/app/api/animals/[id]/route.test.ts`

### Task 8: Animal growth sub-resource

**Objective:** Migrate the growth-measurement endpoints to the convention, exercising deeply nested path params.

**Files:**

- Create: `src/app/api/animals/[id]/growth/openapi.ts`
- Modify: `src/app/api/animals/[id]/growth/route.ts`
- Create: `src/app/api/animals/[id]/growth/[measurementId]/openapi.ts`
- Modify: `src/app/api/animals/[id]/growth/[measurementId]/route.ts`
- Test: `src/app/api/animals/[id]/growth/route.test.ts`

**Key Decisions / Notes:**

- Methods (verified): `growth/route.ts` GET + POST; `growth/[measurementId]/route.ts` DELETE. Paths `/api/animals/{id}/growth` and `/api/animals/{id}/growth/{measurementId}`.
- GET returns a plain `prisma.growthMeasurement.findMany` array (no relation includes — see `growth/route.ts:30`), so the response schema is a flat array. POST body fields (verified `growth/route.ts:67-83`): required `date`; nullable `weightGrams`, `headLengthMm`, `earLengthMm`, `armLengthMm`, `legLengthMm`, `footLengthMm`, `tailLengthMm`, `bodyLengthMm`, `wingLengthMm`, `notes`. Define a `GrowthMeasurement` response schema (`date` as ISO string, the `*Mm`/`weightGrams` as `z.number().nullable()`); add both contracts to `manifest.ts`.

**Definition of Done:**

- [ ] `GET /api/animals/{id}/growth` returns 200 and payload passes the measurement-array schema; `POST` validates its body (400 on invalid).
- [ ] `DELETE /api/animals/{id}/growth/{measurementId}` matches current behaviour under the contract.
- [ ] Verify: `npm test -- src/app/api/animals/[id]/growth/route.test.ts`

### Task 9: Animal reminders sub-resource

**Objective:** Migrate the reminders endpoints to the convention, mirroring the growth pattern.

**Files:**

- Create: `src/app/api/animals/[id]/reminders/openapi.ts`
- Modify: `src/app/api/animals/[id]/reminders/route.ts`
- Create: `src/app/api/animals/[id]/reminders/[reminderId]/openapi.ts`
- Modify: `src/app/api/animals/[id]/reminders/[reminderId]/route.ts`
- Test: `src/app/api/animals/[id]/reminders/route.test.ts`

**Key Decisions / Notes:**

- Methods (verified): `reminders/route.ts` GET + POST; `reminders/[reminderId]/route.ts` DELETE. Paths `/api/animals/{id}/reminders` and `/api/animals/{id}/reminders/{reminderId}`.
- Define an `AnimalReminder` response schema from the handler's actual output; add both contracts to `manifest.ts`.

**Definition of Done:**

- [ ] `GET /api/animals/{id}/reminders` returns 200 and payload passes the reminder-array schema; `POST` validates its body (400 on invalid).
- [ ] `DELETE /api/animals/{id}/reminders/{reminderId}` matches current behaviour under the contract.
- [ ] Verify: `npm test -- src/app/api/animals/[id]/reminders/route.test.ts`

### Task 10: Drain `animals` from allowlist + docs sync

**Objective:** Remove all `animals/**` entries from the drift-gate allowlist so the gate now enforces them, regenerate the snapshot, and document the convention for contributors.

**Files:**

- Modify: `src/lib/openapi/route-allowlist.ts`
- Modify: `public/openapi.json` (regenerated)
- Modify: `README.md` (or `CONTRIBUTING.md`) — "Documenting an API route" section

**Key Decisions / Notes:**

- Remove every `animals/**` path from the allowlist; run `npm run openapi:generate` to refresh `public/openapi.json`.
- Docs: a short "How to document a route" section — create `openapi.ts` beside `route.ts` with `defineContract`, wrap handlers with `route()`, import the contract in `manifest.ts`; note the admin-gated `/api/docs`; state that follow-on phases migrate the remaining domains. Per the documentation-sync rule, update in this same change.

**Definition of Done:**

- [ ] `animals/**` no longer in the allowlist; `npm run openapi:check` passes with animals enforced.
- [ ] README/CONTRIBUTING documents the convention and the `/api/docs` route.
- [ ] Verify: `npm run openapi:check && npm test`
