# Migrate All Remaining API Routes to OpenAPI Contract Convention

Created: 2026-06-19
Author: josh@luongo.com.au
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Context

Per the API Documentation PRD (`docs/prd/2026-06-18-api-documentation.md`), every
`src/app/api/**` route method must be either contracted via the `defineContract()`/
`route()` convention or listed in `ROUTE_ALLOWLIST`. The allowlist is a **shrinking
gate**: it shipped seeded to "all routes except the reference domain" and drains as
each domain migrates. Phase 0 (animals), Phase 1 (members), and the portal phase are
done. **138 (path, method) pairs across ~25 domain folders remain** in
`src/lib/openapi/route-allowlist.ts` — this is the final phase that drains the
allowlist to empty so the CI gate (`npm run openapi:check`) enforces full coverage
and the Scalar reference (`/api/docs`) documents every route.

This plan migrates all 138 remaining methods in one comprehensive pass, grouped into
14 batch tasks by domain affinity and auth class. The work is mechanical and
homogeneous — the convention is proven across 40 already-contracted operations — but
the volume is large, so tasks are sized to coherent domain clusters.

## Summary

**Goal:** Migrate every remaining `src/app/api/**` route method to the
`defineContract()`/`route()` convention so `ROUTE_ALLOWLIST` becomes `[]`, every route
is contracted, `public/openapi.json` covers all routes, and `npm run openapi:check`
passes reporting `0 allowlisted`.

**Scope boundary (from PRD "Explicitly Out of Scope"):** document and validate what
each route *currently* returns. Do **not** reshape response envelopes, rename fields,
change status codes, or alter auth/RBAC behaviour. Security schemes are *described*,
not modified.

---

## The Proven Convention (reference before each task)

Replicate the established pattern. Reference implementations:

- **Contract** — `src/app/api/members/openapi.ts`: Zod request/response schemas +
  `defineContract({ method, path, summary, tags, security, request, responses, successStatus })`.
- **Handler wrap** — `src/app/api/members/route.ts`: `export const GET = route(contract, async ({ query, params, body, request }) => {...})`.
  Auth/RBAC/gating runs inside the handler; early returns use raw `NextResponse`
  (4xx/5xx pass through unvalidated); success returns `{ data, status? }` which the
  wrapper validates against the response schema and serialises.
- **One root `openapi.ts` per domain** — like `src/app/api/animals/peek-id/route.ts`
  importing `peekAnimalIdContract` from `../openapi`. Prefer a single domain-root
  `openapi.ts` declaring ALL the domain's contracts (collection + `[id]` + sub-actions),
  imported by each sub-route's `route.ts` via a relative path. This minimises the
  number of `openapi.ts` files and manifest imports. (Per-folder `openapi.ts`, as in
  members, is also acceptable where a domain is large.)
- **Wiring** — every new `openapi.ts` file gets a side-effect import in
  `src/lib/openapi/manifest.ts` (the coverage script asserts this).
- **Allowlist** — remove each migrated `(path, method)` from
  `src/lib/openapi/route-allowlist.ts`.
- **Security scheme names** (from `src/lib/openapi/contract.ts` `SecurityName`):
  `'clerkSession'` | `'internalSecret'` | `'squareSignature'` | `'public'`.

### Key wrapper facts (from `src/lib/openapi/route.ts`)

- `ctx.request` is always available — handlers needing the raw request (multipart
  `formData()`, HMAC raw `text()`) read it directly and declare **no** `request.body`
  in the contract (a declared body triggers `request.json()` parsing).
- Request-shape validation (400) precedes the handler's auth check (401/403).
- A handler may return a raw `Response` for redirects / binary / HTML / CSV; declare a
  non-JSON `content` on that response def to suppress the dev "not validated" warning.
- `validateResponse` (`src/lib/openapi/response.ts`) does `JSON.parse(JSON.stringify())`
  first, so Prisma `Date` → ISO string. Author response schemas leniently
  (`z.string().openapi({ format: 'date-time' })` for dates) and **against actual handler
  output** — read each handler before writing its response schema.

### ⛔ Hand-validated routes — do NOT route their body through Zod (zero-behaviour-change rule)

Some handlers run **ordered, hand-rolled validations that return specific status codes
and messages** (e.g. `public/checkout/donation` returns a `404` for unknown org *before*
per-field `400`s; `pin/{id}/submit` returns `401/404/409` before its `400`s). Declaring a
required `request.body` schema makes the wrapper validate the body **first** and reject
with a generic `{ error: 'Invalid request' }` `400` — this **reorders the 404 and
collapses the specific messages**, a status/envelope change the PRD forbids.

For these routes: **keep the handler's parsing and field validation verbatim** (handler
reads `ctx.request.json()` / `searchParams` itself) and **either omit `request.body`** or
declare a **fully permissive** schema (all fields `.optional()`, loose types, no `.min()`)
purely for documentation — it must never reject anything the handler would accept. Document
the real body shape in the contract `summary`/`description`. This applies to
`public/checkout/donation`, `public/checkout/membership`, and `pin/{id}/submit`. Most plain
CRUD POSTs (which just `catch` and echo `error.message`) can safely use a normal request
schema as members/portal already do — the rule targets routes whose pre-handler error
ordering or messages are load-bearing.

### Special handling (read the handler; do not assume)

| Route(s) | Special concern | Approach |
|----------|-----------------|----------|
| `upload`, `upload/document`, `upload/image` | multipart `formData()` | No `request.body`; handler reads `ctx.request.formData()`; clerkSession; 201 response = created record schema |
| `square/webhook` | raw body HMAC verify | No `request.body`; `security: 'squareSignature'`; handler reads `ctx.request.text()` |
| `square/oauth/authorize`, `square/oauth/callback` | HTTP redirect | Raw `Response` (302); document 302 with no schema |
| `square/embed` | confirm Content-Type from handler | Raw `Response` + matching `content` (likely `text/html`); spot-check the response header |
| `photos/serve` | binary image | Raw `Response` + non-JSON `content` (read the handler's actual `Content-Type`); spot-check header |
| `docs` | Scalar HTML page | Raw `Response` + `content: 'text/html'`; spot-check header |
| `openapi` | the generated spec itself | `200` schema **`z.unknown()`** (NOT `z.record(...)` — avoids registering a circular schema that can crash generation) |
| `admin/export`, `admin/export/nsw-registers`, `admin/eofy` | possibly CSV/file | Read the handler's actual `Content-Type`: if non-JSON, raw `Response` + matching `content` (e.g. `text/csv`); if JSON, normal schema. Spot-check the header |
| `internal/*`, `keepalive` | CRON_SECRET bearer auth | `security: 'internalSecret'`; do NOT change the existing `authorised()` check |
| `public/checkout/donation`, `public/checkout/membership` | unauthenticated, subdomain-resolved org, **hand-validated** | `security: 'public'`; follow the hand-validated-routes rule above — keep handler checks, permissive/omitted body schema |
| `pin/{id}/submit` | **public via PIN token** (`?t=` query), hand-validated JSON body, distinct 401/404/409/400 | `security: 'public'`; query schema for `t`; follow the hand-validated-routes rule (no enforcing body schema); keep 401/404/409/400 verbatim |
| `pin/{id}/upload` | **public via PIN token**, multipart, distinct 401/404/409/400/500 | `security: 'public'`; query schema for `t`; no `request.body`; handler reads `ctx.request.formData()`; response `{ url }` |

---

## Feature Inventory (all 138 allowlist entries mapped to a task)

Source of truth: `src/lib/openapi/route-allowlist.ts` (18 DELETE, 60 GET, 18 PATCH,
41 POST, 1 PUT = 138). Every entry maps to exactly one task; none is "Out of Scope".

| Task | Domain(s) | Methods (paths relative to `/api`) | Auth class |
|------|-----------|------------------------------------|-----------|
| 1 | assets, carer-training, hygiene, incidents | assets `GET POST`, assets/{id} `PATCH DELETE`; carer-training `GET POST`, carer-training/{id} `GET DELETE`; hygiene `GET POST`, hygiene/{id} `GET PATCH DELETE`; incidents `GET POST`, incidents/{id} `GET PATCH DELETE` | clerkSession |
| 2 | post-release-monitoring, transfers, permanent-care-applications, release-checklists | post-release-monitoring `GET POST`, …/{id} `GET PATCH DELETE`; transfers `GET POST`, …/{id} `GET PATCH DELETE`; permanent-care-applications `GET POST`, …/{id} `GET PATCH`; release-checklists `GET POST` | clerkSession |
| 3 | call-logs, call-log-lookups | call-logs `GET POST`, …/{id} `GET PATCH DELETE`; call-log-lookups `GET POST PATCH DELETE`, …/seed-defaults `POST` | clerkSession |
| 4 | species, growth-references | species `GET POST PATCH DELETE`, …/{id} `GET PATCH DELETE`, …/bulk-delete `POST`, …/seed `POST`; growth-references `GET`, …/species `GET`, …/estimate-birth-date `POST` | clerkSession |
| 5 | membership-tiers, news, carers | membership-tiers `GET POST`, …/{id} `PATCH DELETE`; news `GET POST`, …/{id} `GET PATCH DELETE`, …/{id}/publish `POST`; carers `GET`, …/{id} `GET PATCH`, …/map `GET` | clerkSession |
| 6 | report-queries, reports | report-queries `GET POST`, …/{id} `PATCH DELETE`, …/dashboard `GET`, …/preview `POST`; reports/carer-contacts `GET`, reports/map `GET` | clerkSession |
| 7 | admin/*, audit-logs, membership-grants, admin-notification-dismissals | admin/carer-interest `GET PATCH`, admin/eofy `GET`, admin/export `GET`, admin/export/nsw-registers `GET`, admin/onboarding `GET`, admin/org-settings `GET PATCH`, admin/users/{userId} `DELETE`, admin/invite `POST`; audit-logs `GET`; membership-grants `POST`; admin-notification-dismissals `POST` | clerkSession + admin RBAC |
| 8 | rbac/* | rbac/coordinator-assignments `POST DELETE`, rbac/my-role `GET`, rbac/provision `POST`, rbac/roles `GET POST`, rbac/species-groups `GET POST`, …/{id} `PATCH DELETE` | clerkSession |
| 9 | pindrop, pin, form-templates, records, wally | pindrop `POST`, …/{id} `GET DELETE`; pin/{id}/submit `POST`, pin/{id}/upload `POST`; form-templates/{entityType} `GET PUT`; records `POST`; wally `POST` | mixed (verify per handler) |
| 10 | upload, photos | upload `POST`, upload/document `POST`, upload/image `POST`; photos/delete/{id} `DELETE`, photos/serve `GET` | clerkSession + special body/response |
| 11 | square/* | square/connection/status `GET`, square/connection/disconnect `POST`, square/embed `GET`, square/oauth/authorize `GET`, square/oauth/callback `GET`, square/webhook `POST` | mixed (clerkSession / public / squareSignature) |
| 12 | internal/*, keepalive, payments, feed-roster, sms-status, weather, features/me | internal/health `GET`, internal/membership-lifecycle `GET POST`, internal/nsw-reminders `GET POST`, internal/ping `GET`, keepalive `GET`; payments `GET`, feed-roster `GET`, sms-status `GET`, weather `GET`, features/me `GET` | internalSecret (internal/keepalive) + clerkSession (rest) |
| 13 | public/checkout, docs, openapi | public/checkout/donation `POST`, public/checkout/membership `POST`; docs `GET`; openapi `GET` | public |
| 14 | — (cleanup/verification) | none — drains allowlist to `[]`, regenerates spec, runs full gate | — |

---

## Tasks

> **Per-task mechanical loop** (applies to Tasks 1–13): for each route in the batch —
> (1) read the handler to learn its real auth class, request shape, and response shape;
> (2) author Zod request/response schemas in the domain-root `openapi.ts` against the
> *actual* output; (3) `defineContract(...)` each `(method, path)`; (4) wrap the
> handler with `route(contract, …)` keeping all auth/RBAC/gating and 4xx/5xx early
> returns unchanged; (5) add the domain's `openapi.ts` import to `manifest.ts`;
> (6) delete the batch's entries from `route-allowlist.ts`; (7) add the representative
> domain test (see Testing Strategy). Do not change handler behaviour, status codes,
> or field names.
>
> **⛔ Per-task coverage gate (step 8 of every task — catches a missed route the same
> task, not at Task 14):** after the edits above, run `npm run openapi:check` and confirm
> there are **zero `Undocumented route` / coverage FAIL lines for this task's domain(s)**.
> Because each task removes its allowlist entries but the committed snapshot is only
> regenerated in Task 14, the gate will still print ONE expected **freshness** failure
> (`public/openapi.json` out of date) and exit non-zero mid-migration — that single
> freshness line is the *only* acceptable failure. Any `Undocumented route` line means a
> route in this batch was left uncontracted (or its allowlist entry was removed without a
> contract) → fix before closing the task. (Optionally run `npm run openapi:generate`
> within the task to clear even the freshness line for a fully-green gate.)

### Task 1 — Core care resources A: assets, carer-training, hygiene, incidents
- **Files:** `src/app/api/{assets,carer-training,hygiene,incidents}/openapi.ts` (new, one per domain), each domain's `route.ts` + `[id]/route.ts` (wrap), `src/lib/openapi/manifest.ts`, `src/lib/openapi/route-allowlist.ts`
- **Steps:** Standard CRUD migration per the mechanical loop. Schemas mirror the Prisma models (Asset, CarerTraining, Hygiene/HusbandryRecord, Incident); list endpoints get a query schema for their existing filters.
- **DoD:** 18 methods contracted; their allowlist entries removed; new `openapi.ts` wired; representative tests green; `tsc --noEmit` clean.
- **Verify:** `npm test -- src/app/api/assets src/app/api/incidents --silent` (+ the new domain tests); `npx tsc --noEmit`

### Task 2 — Care resources B: post-release-monitoring, transfers, permanent-care-applications, release-checklists
- **Files:** `src/app/api/{post-release-monitoring,transfers,permanent-care-applications,release-checklists}/openapi.ts` (new) + their `route.ts`/`[id]/route.ts`, `manifest.ts`, `route-allowlist.ts`
- **Steps:** CRUD migration per the loop.
- **DoD:** 16 methods contracted + delisted; tests green; tsc clean.
- **Verify:** `npm test -- src/app/api/transfers src/app/api/permanent-care-applications --silent`; `npx tsc --noEmit`

### Task 3 — Call logs & lookups: call-logs, call-log-lookups
- **Files:** `src/app/api/call-logs/openapi.ts`, `src/app/api/call-log-lookups/openapi.ts` (new) + `route.ts`/`[id]/route.ts`/`seed-defaults/route.ts`, `manifest.ts`, `route-allowlist.ts`
- **Steps:** CRUD + a no-body `seed-defaults` POST (response = seeded lookups summary).
- **DoD:** 10 methods contracted + delisted; tests green; tsc clean.
- **Verify:** `npm test -- src/app/api/call-logs src/app/api/call-log-lookups --silent`; `npx tsc --noEmit`

### Task 4 — Species & growth references
- **Files:** `src/app/api/species/openapi.ts`, `src/app/api/growth-references/openapi.ts` (new) + `species/route.ts`, `species/[id]/route.ts`, `species/bulk-delete/route.ts`, `species/seed/route.ts`, `growth-references/route.ts`, `growth-references/species/route.ts`, `growth-references/estimate-birth-date/route.ts`, `manifest.ts`, `route-allowlist.ts`
- **Steps:** species collection has unusual `GET POST PATCH DELETE` directly on `/api/species` (not just `[id]`) — contract each as it actually behaves. `bulk-delete` and `seed` are action POSTs. `estimate-birth-date` is a compute POST (body in, computed result out).
- **DoD:** 12 methods contracted + delisted; tests green; tsc clean.
- **Verify:** `npm test -- src/app/api/species src/app/api/growth-references --silent`; `npx tsc --noEmit`

### Task 5 — Membership tiers, news, carers
- **Files:** `src/app/api/{membership-tiers,news,carers}/openapi.ts` (new) + their `route.ts`/`[id]/route.ts`/`[id]/publish/route.ts`/`map/route.ts`, `manifest.ts`, `route-allowlist.ts`
- **Steps:** CRUD + `news/{id}/publish` action POST. `carers/map` returns geo/marker data — schema against actual shape (likely `z.array(...)`).
- **DoD:** 14 methods contracted + delisted; tests green; tsc clean.
- **Verify:** `npm test -- src/app/api/news src/app/api/carers --silent`; `npx tsc --noEmit`

### Task 6 — Report queries & reports
- **Files:** `src/app/api/report-queries/openapi.ts`, `src/app/api/reports/openapi.ts` (new) + `report-queries/route.ts`, `report-queries/[id]/route.ts`, `report-queries/dashboard/route.ts`, `report-queries/preview/route.ts`, `reports/carer-contacts/route.ts`, `reports/map/route.ts`, `manifest.ts`, `route-allowlist.ts`
- **Steps:** CRUD + `dashboard` GET + `preview` POST (body = query def, response = preview rows). reports endpoints are read-only aggregates.
- **DoD:** 8 methods contracted + delisted; tests green; tsc clean.
- **Verify:** `npm test -- src/app/api/report-queries src/app/api/reports --silent`; `npx tsc --noEmit`

### Task 7 — Admin domain
- **Files:** `src/app/api/admin/openapi.ts` (new, covers all admin sub-paths) + each admin sub-route's `route.ts`; `src/app/api/audit-logs/openapi.ts`, `src/app/api/membership-grants/openapi.ts`, `src/app/api/admin-notification-dismissals/openapi.ts` (new) + their `route.ts`; `manifest.ts`, `route-allowlist.ts`
- **Steps:** All clerkSession + admin RBAC. **For `admin/export`, `admin/export/nsw-registers`, `admin/eofy`: read each handler to confirm the exact `Content-Type` it sets** (do not guess CSV vs JSON) — if non-JSON, return a raw `Response` and declare a matching `content` (e.g. `text/csv`); if JSON, use a normal response schema. The CI gate cannot catch a wrong `content` declaration, so **spot-check the live `Content-Type` header at runtime** (see Verification §5). `admin/onboarding`, `admin/org-settings` GET return config objects; `org-settings` PATCH + `carer-interest` PATCH update settings.
- **DoD:** 13 methods contracted + delisted; tests green; tsc clean.
- **Verify:** `npm test -- src/app/api/admin src/app/api/audit-logs --silent`; `npx tsc --noEmit`

### Task 8 — RBAC domain
- **Files:** `src/app/api/rbac/openapi.ts` (new, covers all rbac sub-paths) + each rbac sub-route's `route.ts`, `manifest.ts`, `route-allowlist.ts`
- **Steps:** `coordinator-assignments` POST/DELETE, `my-role` GET, `provision` POST, `roles` GET/POST, `species-groups` GET/POST + `[id]` PATCH/DELETE. Mirror existing permission checks exactly.
- **DoD:** 10 methods contracted + delisted; tests green; tsc clean.
- **Verify:** `npm test -- src/app/api/rbac --silent`; `npx tsc --noEmit`

### Task 9 — Pindrop, PIN, form-templates, records, wally
- **Files:** `src/app/api/{pindrop,records,wally}/openapi.ts`, `src/app/api/pin/openapi.ts` (no colocated route at `pin/` — a shared contract file imported by both PIN sub-routes via `../../openapi`; a folder may hold an `openapi.ts` with no `route.ts` as long as it is wired into the manifest), `src/app/api/form-templates/openapi.ts` (new) + the corresponding `route.ts` files (`pindrop/route.ts`, `pindrop/[id]/route.ts`, `pin/[id]/submit/route.ts`, `pin/[id]/upload/route.ts`, `form-templates/[entityType]/route.ts`, `records/route.ts`, `wally/route.ts`), `manifest.ts`, `route-allowlist.ts`
- **Steps (verified facts):**
  - **`pin/{id}/submit`** (`POST`) — **public via PIN token**: auth is the `?t=` query param + `getSessionForPublicAccess(sessionId, token)`, NOT Clerk. `security: 'public'`; add a query schema for `t`. Hand-validated JSON body with distinct status codes — `401` (missing token), `404` (invalid/expired), `409` (already submitted), `400` (invalid body / missing lat-lng) and per-field `.slice()` caps. Follow the hand-validated-routes rule: **do not declare an enforcing `request.body`** — keep the handler's `request.json()` + checks verbatim; `200` response `{ success: true }`.
  - **`pin/{id}/upload`** (`POST`) — **public via PIN token** (same `?t=`/`getSessionForPublicAccess`), **multipart** (`request.formData()`, `file` field, type/size/limit checks). `security: 'public'`; query schema for `t`; **no `request.body`**; handler reads `ctx.request.formData()`. Distinct `401/404/409/400/500`; `200` response `{ url }`.
  - **`pindrop`** (`POST`) + **`pindrop/{id}`** (`GET`, `DELETE`) — read the handlers to confirm auth class (likely clerkSession) and shapes; standard contracts.
  - **`form-templates/{entityType}`** (`GET`, `PUT`) — keyed on the `entityType` path param; contract GET (read) + PUT (upsert) per their actual bodies/auth.
  - **`records`** (`POST`), **`wally`** (`POST`) — contract per their actual request/response shapes and auth (read handlers first).
- **DoD:** 9 methods contracted + delisted; both PIN routes carry `security: 'public'` and preserve their 401/404/409/400(/500) responses unchanged; tests green; tsc clean.
- **Verify:** `npm test -- src/app/api/pindrop src/app/api/pin src/app/api/form-templates --silent`; `npx tsc --noEmit`

### Task 10 — Upload & photos (multipart + binary)
- **Files:** `src/app/api/upload/openapi.ts`, `src/app/api/photos/openapi.ts` (new) + `upload/route.ts`, `upload/document/route.ts`, `upload/image/route.ts`, `photos/delete/[id]/route.ts`, `photos/serve/route.ts`, `manifest.ts`, `route-allowlist.ts`
- **Steps:** uploads = multipart (no `request.body`; `ctx.request.formData()`; document `multipart/form-data` in summary; 201 response = created record). `photos/serve` returns binary → raw `Response` + non-JSON `content`; its query (e.g. `key`) gets a query schema. `photos/delete/{id}` standard DELETE.
- **DoD:** 5 methods contracted + delisted; targeted upload + serve tests green; tsc clean.
- **Verify:** `npm test -- src/app/api/upload src/app/api/photos --silent`; `npx tsc --noEmit`

### Task 11 — Square integration (mixed auth + redirects)
- **Files:** `src/app/api/square/openapi.ts` (new, covers all square sub-paths) + `square/connection/status/route.ts`, `square/connection/disconnect/route.ts`, `square/embed/route.ts`, `square/oauth/authorize/route.ts`, `square/oauth/callback/route.ts`, `square/webhook/route.ts`, `manifest.ts`, `route-allowlist.ts`
- **Steps:** `connection/status` GET + `connection/disconnect` POST = clerkSession. `webhook` POST = `squareSignature`, no `request.body`, reads `ctx.request.text()`. `oauth/authorize` + `oauth/callback` = redirects (raw 302 `Response`); `callback` is public. `embed` likely HTML (`content: 'text/html'`). Preserve the existing `verifyAndConstruct`/HMAC flow untouched.
- **DoD:** 6 methods contracted + delisted; webhook signature test green; tsc clean.
- **Verify:** `npm test -- src/app/api/square --silent`; `npx tsc --noEmit`

### Task 12 — Internal/cron, keepalive, and read-only singletons
- **Files:** `src/app/api/internal/openapi.ts` (new, covers internal sub-paths) + `internal/{health,membership-lifecycle,nsw-reminders,ping}/route.ts`, `src/app/api/{keepalive,payments,feed-roster,sms-status,weather}/openapi.ts` + their `route.ts`, `src/app/api/features/me/openapi.ts` + `features/me/route.ts`, `manifest.ts`, `route-allowlist.ts`
- **Steps:** internal/* + keepalive = `security: 'internalSecret'`; keep the existing `CRON_SECRET` `authorised()` bearer check inside the handler (do NOT move it into the wrapper). `membership-lifecycle` and `nsw-reminders` expose both GET and POST that run the **same job and return the same shape** — author ONE response schema per domain mirroring the job's actual return type (read `src/lib/membership-lifecycle.ts` and the nsw-reminders lib for the exact fields; `validateResponse` will throw in dev/test on any mismatch) and reuse it for both the GET and POST contract of that route. `internal/health` returns `{ status }` (200) / 503 — give 503 a documented error response. payments/feed-roster/sms-status/weather/features/me = clerkSession read-only.
- **DoD:** 12 methods contracted + delisted; `membership-lifecycle` & `nsw-reminders` GET+POST share a response schema that matches the lib return type (no `validateResponse` throw when run); tests green; tsc clean.
- **Verify:** `npm test -- src/app/api/internal src/app/api/features --silent`; `npx tsc --noEmit`

### Task 13 — Public checkout & self-documentation routes
- **Files:** `src/app/api/public/checkout/openapi.ts` (new) + `public/checkout/donation/route.ts`, `public/checkout/membership/route.ts`; `src/app/api/docs/openapi.ts` + `docs/route.ts`; `src/app/api/openapi/openapi.ts` + `openapi/route.ts`; `manifest.ts`, `route-allowlist.ts`
- **Steps:**
  - **`public/checkout/donation`** + **`public/checkout/membership`** (`POST`) = `security: 'public'`. ⛔ **Follow the hand-validated-routes rule — do NOT move the field validation into an enforcing Zod body schema.** `donation` returns a `404` for unknown org *before* its per-field `400`s (e.g. `amountCents`), and routing the body through Zod would reject body-first with a generic `{ error: 'Invalid request' }` `400`, reordering the `404` and collapsing the specific messages — a status/envelope change the PRD forbids. **Keep the handler's `request.json()` parsing, ordered checks, the 254-char email cap, and ReDoS defence verbatim.** Either omit `request.body` or declare a fully-permissive (all-`.optional()`, no-`.min()`) schema purely to document the shape; document the real body in the contract `description`. Verify the migrated route returns byte-identical status codes/messages to the pre-migration handler (the targeted tests below assert this).
  - **`docs`** (`GET`) — returns the Scalar HTML page → raw `Response` + `content: 'text/html'`; spot-check the response `Content-Type` header.
  - **`openapi`** (`GET`) — returns the generated spec document → `200` response schema **`z.unknown()`** (NOT `z.record(...)`, which registers a complex/circular schema that can crash generation).
- **DoD:** 4 methods contracted + delisted; public-checkout routes preserve their exact `404`/`400`/`200` status codes and messages (no Zod-collapsed envelope); `openapi` uses `z.unknown()`; public checkout 400/200 + ordering tests green; tsc clean.
- **Verify:** `npm test -- src/app/api/public src/app/api/docs --silent`; `npx tsc --noEmit`

### Task 14 — Drain allowlist, regenerate spec, full gate green
- **Files:** `src/lib/openapi/route-allowlist.ts` (→ empty array), `public/openapi.json` (regenerated)
- **Steps:**
  1. Confirm `ROUTE_ALLOWLIST` is `[]` (all batches removed their entries).
  2. Run `npm run openapi:check -- --init` — it must rewrite the allowlist to **empty**
     (proves every route is contracted; if it writes any entry, that route was missed →
     loop back).
  3. Regenerate the snapshot: `npm run openapi:generate` (or `npm run openapi:check -- --write`).
  4. Run `npm run openapi:check` — must print `… N contracted, 0 allowlisted` and
     `openapi:check passed.`
  5. Full suite + typecheck + lint.
- **DoD:** `npm run openapi:check` exits 0 with `0 allowlisted`; `public/openapi.json`
  committed and fresh; full test suite green; `tsc --noEmit` clean.
- **Verify:** `npm run openapi:check`; `npm test --silent`; `npx tsc --noEmit`

---

## Assumptions / Autonomous Decisions

- **One root `openapi.ts` per domain** (declaring all the domain's contracts), imported
  by each sub-route's `route.ts`, to minimise file/manifest churn — mirrors
  `animals/peek-id`. Per-folder files are acceptable where a domain is large.
- **Full drain, including awkward routes** (`square/webhook`, `square/oauth/*`,
  `upload/*`, `photos/serve`, `docs`, `openapi`): the user requires the allowlist to
  reach empty, so these are contracted using raw-`Response`/non-JSON-`content`/no-body
  techniques the wrapper already supports — none stay allowlisted.
- **Auth class and response shape are determined by reading each handler**, not assumed
  — faithful to the PRD's "schemas authored against actual handler output". The table
  above records the *expected* class; the implementer confirms per route.
- **No behaviour change**: status codes, field names, response envelopes, and auth
  checks are preserved exactly (PRD out-of-scope).
- **Snapshot regenerated once, in Task 14** (not per task) to avoid 13 intermediate
  `public/openapi.json` diffs; each task still edits the allowlist so the final
  `--init` produces empty. Mid-migration, `npm run openapi:check` reports exactly ONE
  expected **freshness** failure (stale snapshot) — but it still prints `Undocumented
  route` lines for any uncontracted route, so the **per-task coverage gate (loop step 8)
  detects a missed route in the same task** rather than deferring all detection to Task
  14. The freshness line is the only acceptable mid-migration failure; an implementer who
  prefers a fully-green per-task gate may run `npm run openapi:generate` inside each task.
- **Worktree: No** (branch isolation disabled) — work on the current branch.

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Response schema mismatch throws in dev/test | Medium | Author schemas against actual handler output; run the route/test; lenient date-as-string; prod fail-mode is log-and-pass |
| Special route given a JSON body schema breaks multipart/HMAC | Medium | Table above mandates no `request.body` for upload/webhook; handler uses `ctx.request` |
| A route missed → allowlist not empty | Medium | Task 14 `--init` is the objective check: any leftover entry = a missed route, loop back |
| Non-JSON responses (CSV/HTML/binary) mis-validated | Low | Raw `Response` + non-JSON `content`; wrapper skips validation for those |
| CRON_SECRET / squareSignature auth altered accidentally | Low | Keep existing in-handler auth checks verbatim; only add `security:` metadata |
| Large diff hard to review | High (inherent) | 14 domain-scoped tasks, each independently tested and delisted; per-task DoD |

## Goal Verification

Truths to confirm at completion:

1. `src/lib/openapi/route-allowlist.ts` exports `ROUTE_ALLOWLIST = []`.
2. `npm run openapi:check -- --init` leaves the allowlist empty (no route uncontracted).
3. `npm run openapi:check` exits 0 and prints `… 0 allowlisted` + `openapi:check passed.`
4. `public/openapi.json` is fresh (freshness check passes) and committed.
5. Every new `openapi.ts` is imported in `src/lib/openapi/manifest.ts` (wiring check passes).
6. Full test suite green; `npx tsc --noEmit` clean.
7. Scalar `/api/docs` renders against the dev server with every domain tag present.

## Testing Strategy (Representative per domain)

Per the parsimony decision: **one `route.test.ts` per domain** (at the collection route),
not one per route folder. Each domain test asserts the CRUD/contract shape through the
wrapper:

- **Zod 400** — an invalid body/query is rejected before business logic (mock the lib
  layer; assert `res.status === 400` and the lib mock was not called).
- **Success schema-valid** — a valid request returns the success status with a
  schema-valid JSON body (mock the lib to return a representative record).

Lean on the **already-unit-tested wrapper** (`src/lib/openapi/route.test.ts`) and
**spec generation** (`src/lib/openapi/generate.test.ts`) — do not re-assert wrapper
behaviour per route. Follow the mock style in
`src/app/api/portal/checkout/membership/route.test.ts` (`vi.hoisted` + module mocks).

**Targeted per-route tests** (real logic beyond the CRUD shape) for:
`square/webhook` (signature path), `upload`/`upload/image` (multipart + file
validation), `public/checkout/donation` + `public/checkout/membership` (public auth +
subdomain org resolution + email validation).

## Verification (end-to-end)

1. **Gate:** `npm run openapi:check` → `0 allowlisted`, exit 0.
2. **Types/lint:** `npx tsc --noEmit`; `npm run lint` (errors block).
3. **Suite:** `npm test --silent` → 0 failures.
4. **Runtime (API profile):** start the dev server (`nohup npm run dev > /tmp/wt360-dev.log 2>&1 &`;
   note the port — 3000 or auto-selected 3002), then:
   - `curl -s localhost:<port>/api/openapi | head` → returns the generated spec JSON
     covering the new paths.
   - Browser (Chrome DevTools MCP / playwright-cli): open `localhost:<port>/api/docs`,
     confirm the Scalar reference renders and the newly migrated domain tags (Admin,
     RBAC, Square, Internal, Public, Reports, …) appear with their operations.
5. **Spot-check** migrated endpoints to confirm validation + serialization behave:
   - a clerkSession GET → schema-valid JSON;
   - the public checkout POST with an invalid body → confirms the **handler's** specific
     `400`/`404` status + message (NOT a Zod-collapsed generic `400`) — proves the
     hand-validated-routes rule held;
   - **every non-JSON route** (`docs`, `openapi`, `photos/serve`, `square/embed`, and any
     `admin/export*`/`eofy` that returns a file) → `curl -sI localhost:<port>/api/<path>`
     and confirm the live `Content-Type` header matches the declared `content` (the CI
     gate cannot verify this — it must be checked at runtime).

## Progress Tracking

Done: 14 | Left: 0

- [x] Task 1: assets, carer-training, hygiene, incidents (19 methods contracted)
- [x] Task 2: post-release-monitoring, transfers, permanent-care-applications, release-checklists (16 methods contracted)
- [x] Task 3: call-logs, call-log-lookups (10 methods contracted)
- [x] Task 4: species, growth-references (12 methods contracted)
- [x] Task 5: membership-tiers, news, carers (14 methods contracted)
- [x] Task 6: report-queries, reports (8 methods contracted)
- [x] Task 7: admin/*, audit-logs, membership-grants, admin-notification-dismissals (13 methods contracted)
- [x] Task 8: rbac/* (10 methods contracted)
- [x] Task 9: pindrop, pin, form-templates, records, wally (9 methods contracted)
- [x] Task 10: upload, photos (5 methods contracted)
- [x] Task 11: square/* (6 methods contracted)
- [x] Task 12: internal/*, keepalive, payments, feed-roster, sms-status, weather, features/me
- [x] Task 13: public/checkout, docs, openapi
- [x] Task 14: drain allowlist, regenerate spec, full gate green
