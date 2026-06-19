# Members Domain — OpenAPI Contract Migration Plan

Created: 2026-06-19
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Context

The codebase is rolling out a co-located OpenAPI/Zod contract convention (PRD: `docs/prd/2026-06-18-api-documentation.md`). Phase 0 built the foundation (`src/lib/openapi/*`) and a reference domain (`animals`). Each API route folder gets an `openapi.ts` that declares request + response Zod schemas via `defineContract()`; handlers are wrapped with `route()` (validates request → 400, validates success response against the contract); a CI gate (`scripts/openapi-coverage.ts`) fails if any route method is neither contracted nor allowlisted, if any `openapi.ts` is unwired from the manifest, or if `public/openapi.json` is stale.

This plan migrates the **members domain** — the first domain batch after the animals reference. It covers 8 route files / **11 path+method pairs**. The intent is to **document and validate what each route CURRENTLY returns** — no contract reshaping, no field renames, no status-code changes, no auth changes (per PRD "Out of scope").

**Confirmed design decisions (asked this session):**
1. **Non-JSON (CSV) responses** → extend the convention minimally: `ResponseDef.content?: string` so `defineContract` can emit `text/csv`, and `route()` suppresses its dev-only "2xx raw Response" warning when the success response declares non-JSON content. All members routes (incl. the 2 CSV ones) are wrapped with `route()` consistently. Reusable for future CSV domains (admin/export, nsw-registers).
2. **Request 400s** → follow the animals precedent: required-field validation lives in the Zod request body schema, so invalid bodies return the convention's `{ error: 'Invalid request', details }` 400, and request validation runs **before** the handler's auth check. (Accepted behavior change: malformed unauthenticated requests now get 400 instead of 401; the create/messages 400 body shape changes from a custom message to the convention shape. Domain-level 400s that aren't structural — duplicate email, recipient cap, empty-after-dedup selection, invalid custom fields — remain handler/lib-owned and keep their messages. Specifically for `messages`: today missing `subject`/`body` keys are coerced to `''` (`String(body?.subject ?? '')`) and missing/non-array `memberIds` defaults to `[]`, so omitting them yields a `composeMemberMessages` domain 400; after migration a **missing or wrong-typed key** returns the convention `{ error: 'Invalid request' }` 400 at the boundary, while an **empty-but-present** `subject`/`body`/selection still reaches `composeMemberMessages` and keeps its domain message.)

**Autonomous decisions (documented, not asked):**
- Error responses are **description-only** (no schema), exactly as animals does — no error schema invented.
- `email` is validated as `z.string().min(1)` (presence, not RFC format) to match `createMember`'s current presence-only check — avoids newly rejecting addresses the system accepts today.
- GET query params are documented; only `status` gets enum validation (an improvement — an invalid status currently reaches Prisma and 500s). `search`/`includeArchived`/`limit` stay loose strings so the handler's existing parsing (incl. the `limit` NaN→default fallback and 5000 cap) is preserved byte-for-byte.
- Nested membership/tier objects in the `GET /members/{id}` response are modeled by a **lite** schema with a `SHORTCUT:` marker (tightened when the memberships/tiers domain migrates), mirroring animals' `CarerLite` precedent.

## Summary

**Goal:** Migrate all 8 members route files to the `defineContract`/`route()` convention — author request + response Zod schemas against actual handler output, wrap handlers, add co-located tests, wire 8 `openapi.ts` files into the manifest, drain the 11 members entries from `ROUTE_ALLOWLIST`, and regenerate `public/openapi.json`. The CI gate (`npm run openapi:check`) must pass and the full test suite stays green.

## Feature Inventory (migration map — every method mapped)

| Route file | Methods | Handler output (today) | Task |
|---|---|---|---|
| `members/route.ts` | GET, POST | GET `Member[]` (scalar); POST `Member` 201 | T2 |
| `members/[id]/route.ts` | GET, PATCH, DELETE | GET `Member` + `memberships[].tier` (404 if missing); PATCH `Member` (404/400); DELETE `{ ok:true }` (404) | T3 |
| `members/[id]/invite/route.ts` | POST | `{ ok:true }` or mapped 400/404 by `reason` | T4 |
| `members/impact-stats/route.ts` | GET | `{ animalsHelped, animalsReleased }` | T5 |
| `members/messages/route.ts` | POST | `{ created, emailed }` (400 recipient cap / compose errors) | T5 |
| `members/import/route.ts` | POST | `{ total, created, skipped, failed, results[] }` (multipart OR `{csv}`; 400 no-file/empty/no-rows) | T6 |
| `members/import/sample/route.ts` | GET | `text/csv` (sample template) | T6 |
| `members/export/route.ts` | GET | `text/csv` (members export; `?includeArchived`) | T7 |

All 11 pairs are mapped to a task. None out of scope.

**Authoritative facts (verified):** `MemberStatus = ACTIVE | LAPSED | CANCELLED | DECEASED` (`prisma/schema.prisma`); `Member` has 26 scalar fields (`schema.prisma` Member model); `getMember` includes `memberships: { include: { tier: true }, orderBy: { periodEnd: 'desc' }, take: 20 }` (`src/lib/members.ts:84`); `MemberInput` fields = email, firstName, lastName, phone, addressLine1, addressLine2, suburb, state, postcode, country, memberNumber, status, joinedAt, customFields (`src/lib/members.ts:8`); every handler is gated by `gateFeature(orgId, 'MEMBERSHIP_PLATFORM')` which returns **404** when disabled (`src/lib/features.ts`). No file imports these route handlers (confirmed via grep) — only Next.js + new tests reference them.

## Convention API recap (reuse, do not re-invent)

- `defineContract(config)` — `src/lib/openapi/contract.ts`; import `z` from `@/lib/openapi/registry`.
- `route(contract, handler)` — `src/lib/openapi/route.ts`; ctx = `{ request, params, query, body }`; return `{ data }` / `{ data, status }` for JSON success (validated), or a raw `Response` (passed through; 4xx silent, 2xx warns in dev unless non-JSON content declared — see T1).
- Reference patterns: `src/app/api/animals/openapi.ts` (`isoDate` helper, enum `.openapi('Name')`, scalar `.openapi('Animal')`, `.passthrough()` create/update, description-only error responses), `src/app/api/animals/[id]/openapi.ts` (sub-folder importing parent schemas), `src/app/api/animals/route.test.ts` (vi.hoisted mocks + realistic Prisma object with `Date`s).

---

## Tasks

### [x] T1 — Extend the convention for non-JSON (CSV) responses
**Files:** `src/lib/openapi/contract.ts`, `src/lib/openapi/route.ts`, `src/lib/openapi/route.test.ts`

- `ResponseDef`: add optional `content?: string` (media type; default `application/json`). One-line JSDoc: set to e.g. `'text/csv'` for non-JSON/file responses (no schema validation).
- `defineContract`: in the response-building loop, honor `content` — `schema` present → `{ [mediaType]: { schema } }`; `content` only (no schema) → `{ [mediaType]: {} }`; neither → description-only (unchanged).
- `route()`: in the raw-`Response` branch, suppress the dev-only 2xx warn when `contract.responses[result.status]?.content` is set and ≠ `application/json` (handler is contractually expected to return a raw non-JSON Response). All other warn behavior unchanged.
- **Tests (TDD — write failing first):** in `route.test.ts` add (a) a `text/csv` contract (content set, **no schema**) whose handler returns a raw 200 `Response` → asserts `console.warn` NOT called; (b) assert `generateOpenApiDocument()` emits the path's 200 response as `content['text/csv']` mapped to an **empty object** (`{}`, no `schema` key) — this no-schema branch is the novel one most likely to be implemented wrong (import `generateOpenApiDocument` from `./generate`). Keep existing warn-on-JSON-2xx test passing.
- **DoD:** `npm test src/lib/openapi` green; no behavior change for JSON contracts.

### [x] T2 — `members` shared schemas + list/create contracts
**Files:** `src/app/api/members/openapi.ts` (new), `src/app/api/members/route.ts`, `src/app/api/members/route.test.ts` (new)

- **`openapi.ts`** (pure: only `z` from registry + `defineContract`):
  - `isoDate = () => z.string().openapi({ format: 'date-time' })` (animals helper).
  - `MemberStatusEnum = z.enum(['ACTIVE','LAPSED','CANCELLED','DECEASED']).openapi('MemberStatus')`.
  - `MemberSchema` — **all 26 scalar fields explicitly** (z.object is strict-by-default; a missing field throws on every GET in dev/test). Author them as:
    - **Non-null (11):** `id` `z.string()`, `clerkOrganizationId` `z.string()`, `email` `z.string()`, `firstName` `z.string()`, `lastName` `z.string()`, `country` `z.string()`, `status` `MemberStatusEnum`, `joinedAt` `isoDate()`, `createdAt` `isoDate()`, `updatedAt` `isoDate()`, `customFieldsJson` `z.unknown()`.
    - **Nullable (15):** `clerkUserId`, `clerkInvitationId`, `carerProfileId`, `squareCustomerId`, `squareCardId`, `phone`, `addressLine1`, `addressLine2`, `suburb`, `state`, `postcode`, `memberNumber`, `primaryMemberId` → `z.string().nullable()`; `portalInvitedAt`, `archivedAt` → `isoDate().nullable()`.
    - `.openapi('Member')`. (Verified against `prisma/schema.prisma` Member model — do not omit `clerkOrganizationId` or `primaryMemberId`.)
  - `MembershipWithTierLiteSchema` — `SHORTCUT:` lite shape for membership + nested tier (key fields, `status` as `z.string()`); tighten when memberships/tiers domain migrates.
  - `MemberWithMembershipsSchema = MemberSchema.extend({ memberships: z.array(MembershipWithTierLiteSchema) }).openapi('MemberWithMemberships')`.
  - `MemberCreateSchema` — `email/firstName/lastName` = `z.string().min(1)`; optional `phone…memberNumber` (string, nullable), `status` = `MemberStatusEnum.optional()`, `joinedAt` = `z.union([z.string(), z.null()]).optional()`, `customFields` = `z.record(z.unknown()).nullable().optional()`; `.passthrough()`.
  - `MemberUpdateSchema` — same fields all optional; `.passthrough()`.
  - `MemberListQuerySchema` — `{ search: z.string().optional(), status: MemberStatusEnum.optional(), includeArchived: z.string().optional(), limit: z.string().optional() }`.
  - `OkSchema = z.object({ ok: z.boolean() }).openapi('OkResult')`.
  - `listMembersContract` (`get` `/api/members`, `clerkSession`, tags `['Members']`, query `MemberListQuerySchema`, 200 `z.array(MemberSchema)`, 401/403/404 description-only, successStatus 200).
  - `createMemberContract` (`post` `/api/members`, body `MemberCreateSchema`, 201 `MemberSchema`, 400/401/403/404 description-only, successStatus 201).
- **`route.ts`:** wrap GET+POST with `route()`. GET → keep auth/gate/permission, read `search/status/includeArchived/limit` from `ctx.request` URL as today, `return { data: members }` (keep the 500 catch as raw `NextResponse`). POST → `createMember(orgId, ctx.body)`, keep `logAudit`, `return { data: member, status: 201 }`, keep the create-error catch → raw 400.
- **`route.test.ts`:** mock `@/lib/prisma` (return a complete realistic `Member` row with `Date` objects + object `customFieldsJson`), `@/lib/clerk-server` auth, `@/lib/rbac`, `@/lib/features`, `@/lib/audit`. Cases: GET 200 schema-valid (no validation throw) for a realistic list; GET 401 (no auth); GET 403 (permission throws); GET 404 (gateFeature returns 404); POST 201 schema-valid; POST 400 invalid body (missing `email` → `{ error: 'Invalid request' }`).

### [x] T3 — `members/[id]` get/update/delete contracts
**Files:** `src/app/api/members/[id]/openapi.ts` (new), `src/app/api/members/[id]/route.ts`, `src/app/api/members/[id]/route.test.ts` (new)

- **`openapi.ts`:** import shared schemas from `../openapi` (animals sub-folder style). Contracts (params `{ id: z.string() }`):
  - `getMemberContract` (`get` `/api/members/{id}`, 200 `MemberWithMembershipsSchema`, 401/403/404).
  - `updateMemberContract` (`patch` `/api/members/{id}`, body `MemberUpdateSchema`, 200 `MemberSchema`, 400/401/403/404).
  - `deleteMemberContract` (`delete` `/api/members/{id}`, 200 `OkSchema`, 401/403/404).
  - Note: `updateMember` returns `findUnique` (theoretically null on a delete-race, not org-scoped) — keep PATCH 200 = `MemberSchema` (non-nullable, documents intent) and do NOT add org-scoping (pre-existing, out of scope/lineage); the prod log-and-pass-through failure mode covers the null edge.
- **`route.ts`:** wrap GET/PATCH/DELETE. GET → `getMember`; missing → raw 404 `NextResponse`; else `return { data: member }`. PATCH → `updateMember(id, orgId, ctx.body)`, keep `logAudit`, `return { data: member }`; keep catch → 404 when message is `'Member not found'` else 400 (raw). DELETE → `archiveMember`, keep `logAudit`, `return { data: { ok: true } }`; keep catch → raw 404.
- **`route.test.ts`:** mock `@/lib/prisma` etc. Cases: GET 200 schema-valid (realistic member with one membership+tier), GET 404 (findFirst → null); PATCH 200 schema-valid, PATCH 404 (updateMany count 0 → lib throws 'Member not found'); DELETE 200 `{ ok:true }`, DELETE 404.

### [x] T4 — `members/[id]/invite` contract
**Files:** `src/app/api/members/[id]/invite/openapi.ts` (new), `route.ts`, `route.test.ts` (new)

- **`openapi.ts`:** `invitePortalMemberContract` (`post` `/api/members/{id}/invite`, params `{ id }`, 200 `OkSchema` (import from `../../openapi`), 400/401/403/404, successStatus 200).
- **`route.ts`:** wrap POST. On `result.sent` → `return { data: { ok: true } }`. Keep the `reason → { status, error }` mapping returning raw `NextResponse.json({ error }, { status })` for the 400/404 branches.
- **`route.test.ts`:** mock `@/lib/portal-invite` `invitePortalMember`. Cases: `{ sent: true }` → 200 `{ ok:true }`; `{ sent: false, reason: 'not-found' }` → 404; `{ sent: false, reason: 'already-active' }` → 400.

### [x] T5 — `members/impact-stats` + `members/messages` contracts
**Files:** `members/impact-stats/openapi.ts` + `route.ts` + `route.test.ts`; `members/messages/openapi.ts` + `route.ts` + `route.test.ts` (all new tests)

- **impact-stats `openapi.ts`:** `ImpactStatsSchema = z.object({ animalsHelped: z.number().int(), animalsReleased: z.number().int() }).openapi('ImpactStats')`; `impactStatsContract` (`get` `/api/members/impact-stats`, 200 `ImpactStatsSchema`, 401/403/404). **`route.ts`:** wrap GET → `return { data: stats }`. **test:** mock `@/lib/org-info` `getImpactStats` → 200 schema; 404 gated.
- **messages `openapi.ts`:** `SendMemberMessageSchema = z.object({ memberIds: z.array(z.string()), subject: z.string(), body: z.string(), sendEmail: z.boolean().optional() }).openapi('SendMemberMessage')` (presence+type at boundary; non-empty subject/body/selection stay enforced by `composeMemberMessages` so their domain messages are preserved); `SendMessageResultSchema = z.object({ created: z.number().int(), emailed: z.number().int() }).openapi('SendMessageResult')`; `sendMemberMessagesContract` (`post` `/api/members/messages`, body `SendMemberMessageSchema`, 200 `SendMessageResultSchema`, 400/401/403/404). **`route.ts`:** wrap POST; read `ctx.body` for `memberIds/subject/body/sendEmail`; keep recipient-cap 400 (raw), `composeMemberMessages`/email/audit, **preserve the `isForbiddenError` rethrow** in the permission catch — do NOT collapse it to the bare `catch → 403` used by the other members routes; `route()` wraps the handler with no surrounding try/catch (`route.ts`), so a rethrown non-forbidden error propagates to Next.js as a 500, exactly as today. `return { data: { created, emailed } }`; keep the outer catch → raw 400. **test:** mock `@/lib/member-messages`, `@/lib/org-info`, `@/lib/email/member-broadcast`, `@/lib/prisma`, `@/lib/clerk-server`. Cases: success → 200 `{ created, emailed }`; >100 recipients → 400; invalid body (missing `subject`) → 400 `Invalid request`.

### [x] T6 — `members/import` + `members/import/sample` contracts
**Files:** `members/import/openapi.ts` + `route.ts` + `route.test.ts`; `members/import/sample/openapi.ts` + `route.ts` + `route.test.ts` (all new tests)

- **import `openapi.ts`:** `ImportRowResultSchema = z.object({ row: z.number().int(), email: z.string().optional(), status: z.enum(['created','skipped','failed']), reason: z.string().optional() })`; `ImportResultSchema = z.object({ total: z.number().int(), created: z.number().int(), skipped: z.number().int(), failed: z.number().int(), results: z.array(ImportRowResultSchema) }).openapi('MemberImportResult')`; `importMembersContract` (`post` `/api/members/import`, **no request body schema** — handler parses multipart OR JSON itself, so the wrapper must not consume the body, 200 `ImportResultSchema`, 400/401/403/404). **`route.ts`:** wrap POST as `route(contract, async ({ request }) => …)`; keep content-type branching + the three raw 400s (No CSV file / Empty CSV / CSV has no data rows); success `return { data: { total, created, skipped, failed, results } }`. **test:** mock `@/lib/prisma`, `@/lib/members` `createMember`, `@/lib/forms/form-template-service` `getActiveTemplate`. Cases: JSON `{ csv: '<header+1 row>' }` → 200 schema-valid; `{ csv: '' }` → 400 Empty CSV; header-only csv → 400 no data rows.
- **import/sample `openapi.ts`:** `sampleImportTemplateContract` (`get` `/api/members/import/sample`, 200 `{ description: 'Sample member CSV', content: 'text/csv' }` (uses T1), 401/403/404). **`route.ts`:** wrap GET; success stays the raw `NextResponse(csv)` (no warn — declared text/csv). **test:** mock `getActiveTemplate`; 200 + `content-type: text/csv`; 403 on permission throw.

### [x] T7 — `members/export` contract
**Files:** `members/export/openapi.ts` (new), `route.ts`, `route.test.ts` (new)

- **`openapi.ts`:** `exportMembersContract` (`get` `/api/members/export`, query `z.object({ includeArchived: z.string().optional() })`, 200 `{ description: 'Members CSV export', content: 'text/csv' }`, 401/403/404).
- **`route.ts`:** wrap GET; keep auth/gate/permission, `includeArchived` read from `ctx.request` URL, `listMembers`+`getActiveTemplate`, `toCsv`, `logAudit`; success stays the raw `NextResponse(csv)` with `Content-Disposition` (no warn).
- **`route.test.ts`:** mock `@/lib/prisma`/`listMembers` + `getActiveTemplate`. Cases: 200 + `content-type: text/csv`; 403 on permission throw.

### [x] T8 — Wire manifest, drain allowlist, regenerate snapshot
**Files:** `src/lib/openapi/manifest.ts`, `src/lib/openapi/route-allowlist.ts`, `public/openapi.json`

- **manifest.ts:** add a `// Members domain` block with 8 side-effect imports: `@/app/api/members/openapi`, `@/app/api/members/[id]/openapi`, `@/app/api/members/[id]/invite/openapi`, `@/app/api/members/export/openapi`, `@/app/api/members/impact-stats/openapi`, `@/app/api/members/import/openapi`, `@/app/api/members/import/sample/openapi`, `@/app/api/members/messages/openapi`.
- **route-allowlist.ts:** remove the 11 members entries (`DELETE/GET/PATCH /api/members/{id}`, `GET/POST /api/members`, `GET /api/members/export`, `GET /api/members/impact-stats`, `GET /api/members/import/sample`, `POST /api/members/{id}/invite`, `POST /api/members/import`, `POST /api/members/messages`). **Leave `membership-tiers`/`membership-grants` untouched** (different domain). Then run `npm run openapi:check -- --init` to confirm the allowlist is exactly the remaining uncontracted set (it should drop exactly these 11).
- **Regenerate snapshot:** `npm run openapi:generate` → refresh `public/openapi.json`.
- **DoD:** `npm run openapi:check` passes (coverage + wiring + freshness all green).

---

## Verification

Run from repo root (npm; `package.json` scripts confirmed):

1. **Typecheck:** `npm run typecheck` → 0 errors.
2. **Unit/route tests:** `npm test` → full suite, 0 failures (not just members files). The route response-validation tests are the core guarantee: a realistic Prisma row must pass each success schema (no `validateResponse` throw under `NODE_ENV=test`).
3. **Contract gate:** `npm run openapi:check` → coverage (11 members pairs now contracted, removed from allowlist), wiring (8 new `openapi.ts` imported), freshness (`public/openapi.json` matches) all green.
4. **Spec contents spot-check:** confirm `public/openapi.json` now contains the 11 members paths, that `/api/members/export` and `/api/members/import/sample` show `text/csv` (not `application/json`), and `GET /api/members/{id}` references `MemberWithMemberships`.
5. **Live E2E (members UI + Scalar docs) — 4-tier probe, record each outcome:**
   - Tier 1: reuse a running dev server (curl the configured port); Tier 2: `npm run dev` in background, poll until ready; then with a browser tool (Claude Code Chrome → Chrome DevTools MCP → playwright-cli → agent-browser): load `/api/docs` (Scalar) and confirm the Members tag + the 11 operations render; if a Clerk session with `MEMBERSHIP_PLATFORM` enabled is available, open the members list page (snapshot → it loads via `GET /api/members` → confirm rows), open a member detail (`GET /api/members/{id}`), and trigger the CSV export (download = `text/csv`). Because dev runs `NODE_ENV !== production`, any response-schema mismatch throws on the live request — exercising these endpoints is itself the validation.
   - If members UI is unreachable (no authed Clerk session / feature off), record the probe outcome and fall back to hitting `/api/openapi` + `/api/docs` (both reachable) to prove the contracts are published and the doc generates; note the auth gap explicitly rather than claiming full UI E2E.

## Out of scope (per PRD)

Contract reshaping, field renames, status-code changes, auth/permission changes, new endpoints, external publishing, client SDK generation, frontend migration, and migrating the memberships/tiers domain (the nested membership/tier lite schema is a deliberate `SHORTCUT:` until that batch). The import route's `STATUS_VALUES` duplication and other pre-existing internals are left as-is (lineage).
