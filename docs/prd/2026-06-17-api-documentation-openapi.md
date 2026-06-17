# API Documentation (OpenAPI) for `src/app/api/`

Created: 2026-06-17
Author: josh@luongo.com.au
Agent: Claude Code
Category: Documentation
Status: Final
Research: Standard

## Problem Statement

WildTrack360 exposes **116 route files (~175 handlers)** under `src/app/api/` covering ~30 resource areas (animals + growth/reminders, carers, species, incidents, transfers, releases/post-release-monitoring, hygiene, members + membership tiers/grants, permanent-care applications, the member `portal/*`, unauthenticated `public/*` checkout, Square payments/OAuth/webhook, RBAC + species-based access control, reports/report-queries, admin, exports, and cron `internal/*`). Today the only written description of this API is the RBAC/species tables in `README.md` plus the prose feature notes in `.product/FEATURES.md` — useful for orientation, but not a machine-readable contract, not browsable per-endpoint, and easy to let drift.

Two audiences are blocked by this gap:

- **Internal developers** (the immediate consumers — the app's own frontend and anyone maintaining the API) need an accurate, browsable reference: request bodies, query params, status codes, response shapes, and the role/permission gate per endpoint.
- **External integrators, later** — the API already has a deliberately external-facing surface (`public/*` embeddable donate/join checkout, `portal/*` member endpoints, the Square webhook). A standard OpenAPI contract is the foundation for opening any of these to third parties without re-documenting from scratch.

The goal is a **complete OpenAPI 3.1 description of all 116 routes, committed to the repo as a static artifact and rendered to browsable HTML**, with CI guaranteeing it cannot silently fall out of step with the route surface. Because WildTrack360 has almost no request-validation schemas to derive from (only 4 of 116 routes use zod), the request/response *bodies* are authored-and-reviewed against the handlers rather than machine-derived — a boundary this PRD states explicitly rather than overclaiming "generated, cannot drift."

## Core User Flows

### Flow 1: Developer reads the reference
1. Developer opens the rendered docs (`docs/api/index.html`, a committed static Scalar render of the spec).
2. Browses endpoints grouped by domain tag (Animals, Carers, Species, Incidents, Members, Portal, Public, Payments, RBAC, Reports, Admin, …).
3. For an endpoint, reads: HTTP method + path, security scheme + minimum role/permission, path/query params, request body schema, every status code the handler can return, and the response body schema.

### Flow 2: Developer changes the route surface and keeps docs honest
1. Developer adds, removes, or renames a `route.ts`, or adds a new returned status code.
2. Runs `npm run docs:api` → regenerates the committed `openapi.json` and re-renders the static HTML.
3. Commits the code + regenerated docs together.
4. CI **fails the build** if the committed `openapi.json` is stale, if a `route.ts` has no documented path+method, or if a handler returns a status code the spec doesn't document — so the *route map and status codes* can never silently drift.

### Flow 3: Integrator (or frontend dev) verifies a contract for an external surface
1. Dev opens the **Public** or **Portal** or **Payments** tag.
2. Finds e.g. `POST /api/public/checkout/donation` → reads the request body schema, the response schema, the security model (no Clerk session; org resolved from subdomain; Square + server-side amount validation), and all error responses.
3. Implements the client against the documented contract.

## Scope

### In Scope
- Adopt **`zod-openapi` v4** (programmatic `createDocument`) as the generation engine, assembled by `scripts/generate-openapi.ts` in a new `src/lib/openapi/` module tree, rendered to a committed static HTML by **Scalar**. (Engine rationale and the pre-authorized renderer fallback are in Technical Context.)
- **Document every one of the 116 routes.** Functional domains get **full depth** (request body schema where applicable, query params, all status codes, response body schema, security, role). Genuine plumbing — `internal/*` cron, `keepalive`, `internal/health`, `internal/ping`, `sms-status` — gets a **skeleton** (path, method, security, status codes, short description) and is exempt from full-schema authoring.
- **Author zod request + response schemas in `src/lib/openapi/` as the documentation source of truth.** Because handlers read `body.field` untyped and return raw Prisma models, schemas are authored from reading each handler (and its Prisma `select`/`include`) — **doc-only, no runtime wiring**. Response schemas mirror Prisma model shapes (a `Base` + `WithRelations` composition reused across list/detail/create). Where the 4 existing zod schemas exist (`wally`, `report-queries`), reuse them.
- **Response Sets** for the common error envelopes — `{ error: string }` (the dominant 400/401/403/404/500 shape, confirmed in handlers) and any confirmed non-uniform alternates (e.g. `422` unique-constraint messages, `409`, `429`, `502`, `503`) — defined once and referenced per route after a per-route status audit.
- **Doc-only query-param schemas** for GET routes that parse `searchParams` manually (e.g. `orgId`, `status`, date ranges, `species`, filters) so filters/pagination are documented. These describe params for the docs only; they do **not** change runtime behaviour.
- **Security schemes modelled accurately** (verified from `src/middleware.ts` + handlers — see Technical Context): Clerk session (default), unauthenticated public checkout, member-portal self-auth, `Bearer ${CRON_SECRET}` for `internal/*`, Square HMAC webhook signature, Square OAuth signed-state callback, and the PIN-access routes.
- **Money/units annotations** via schema descriptions — Square money fields (amounts and their currency/units) and any cents-vs-dollars fields — so consumers don't misread them.
- **Render to a committed static artifact**: `docs/api/openapi.json` (source of truth) + `docs/api/index.html` (Scalar static render). Add a `docs:api` npm script.
- **CI integration**: a CI step that (a) regenerates the spec and drift-guards it (fail on diff vs committed `openapi.json`), (b) runs a route-coverage test (every `route.ts` ⇒ a documented path+method), and (c) runs a status-code coverage test (every literal status a handler returns is documented).
- **Pilot-then-fan-out**: validate the full pipeline on ~6–7 representative routes (a GET list with doc-only query, a POST create, an `[id]` GET/PATCH/DELETE, an unauthenticated `public/*` checkout, the Square HMAC webhook, a CSV/binary export) to lock conventions before documenting the remaining ~110.

### Explicitly Out of Scope
- **Wiring zod into runtime validation (API hardening).** Schemas authored here are doc-only; no handler gains request-rejection logic. *(Why: lineage — this task documents the API, it doesn't re-spec it. Adding runtime validation across ~110 handlers is behaviour-changing and risks breaking the app's own frontend, which posts these bodies untyped today. It is a deliberate **follow-up PRD**, see Key Decisions.)*
- **A live in-app `/api-docs` route.** Delivery is a committed static artifact; no docs UI is served at runtime or gated behind Clerk. *(Why: the immediate audience is internal; a committed artifact is the lowest-risk first step. A live, public-facing docs site becomes a follow-up when the API is actually opened to third parties.)*
- **"Try it out" / live request execution.** The static render is a read-only reference. *(Why: no live route; external execution isn't needed for the internal audience.)*
- **Client SDK generation, API versioning policy, public hosting, auth tutorials, rate-limit docs for third parties.** *(Why: external-integrator concerns beyond a first reference. The OpenAPI artifact this PRD produces is the prerequisite for all of them; they become follow-up work if/when the API is opened up.)*
- **Rewriting `README.md` / `.product/FEATURES.md`.** They stay as the high-level narrative and are a seed source for endpoint descriptions. *(Why: they serve a different purpose; the OpenAPI spec becomes the per-endpoint contract.)*

## Technical Context

*Lightweight notes for `/spec` — not a technical design.*

- **Stack reality:** Next.js 15 App Router route handlers (`export async function GET/POST/PATCH/PUT/DELETE`), TypeScript, `@prisma/client` 6 models as responses, `zod ^3.25.76` present but used in only **4 of 116 routes** (`wally`, `report-queries` ×3) plus `src/lib/forms/form-templates.ts`. `@/*` path alias. Local **Node v22** (no `engines` pin; Dockerfile takes a `NODE_VERSION` build arg).
- **Engine choice — why not `next-openapi-gen`:** the most capable App Router scanner (`next-openapi-gen`) requires **Node ≥24**; this project is on Node 22. Its sibling project RangerOS hit the same wall and fell back to `zod-openapi` — adopt that directly. **`zod-openapi` v4** is zod-3 compatible (peer `zod ^3.21.4`, engines node ≥18) and runs on this project as-is. v4 API: `import 'zod-openapi/extend'` augments zod 3 `ZodType` with `.openapi(...)`; `createDocument({ openapi: '3.1.0', info, servers, components: { securitySchemes, schemas }, security, paths })`. **Do NOT pin v5** (v5 uses zod-4 `.meta()`). **Do NOT bump zod.**
- **The drift-guarantee boundary (state honestly, do not overclaim):** unlike RangerOS — where the OpenAPI imports each route's *existing* runtime zod schema, so a changed request schema produces a diff — WildTrack360 has almost no runtime zod to import. Therefore request **and** response bodies are **author-and-review-verified**, not drift-proof. The CI teeth that *do* hold: (a) committed-artifact freshness/determinism, (b) route+method coverage (every `route.ts` is documented), (c) status-code coverage (every literal `status: NNN` is documented). Body fidelity is a reviewer/`/spec` responsibility, mitigated by authoring each response schema directly beside its route's Prisma `select`/`include` for 1:1 diffing.
- **Auth model (verified from `src/middleware.ts` + `src/app/api/internal/nsw-reminders/route.ts` + `src/app/api/square/webhook/route.ts` + `src/app/api/animals/route.ts`):**
  - **Default — Clerk session:** most `/api/*` routes call `auth()` (`@/lib/clerk-server`) → 401 (no `userId`) / 403 (org mismatch or missing permission). Multi-tenant: subdomain → `org_url` session claim; org passed/derived as `clerkOrganizationId`.
  - **RBAC + SBAC:** roles `ADMIN`, `COORDINATOR_ALL`, `CARER_ALL`, `COORDINATOR`, `CARER` via `@/lib/rbac` (`getUserRole`, `hasPermission`, `getAuthorisedSpecies`); COORDINATOR access is species-scoped (SBAC). Document the minimum role/permission per route.
  - **Public (unauthenticated)** routes from `isPublicRoute`: `/api/keepalive`, `/api/internal/(.*)`, `/api/weather(.*)`, `/api/pin(.*)`, `/api/portal(.*)`, `/api/public/(.*)`, `/api/square/webhook`, `/api/square/oauth/callback`. These bypass Clerk org enforcement and run their own in-handler gates.
  - **`internal/*` cron:** `Authorization: Bearer ${CRON_SECRET}` (env `CRON_SECRET`; when unset, allowed only in non-production).
  - **Member portal (`/api/portal/*`):** members are NOT in a Clerk Organization — they bind to a wildlife org via `Member.clerkOrganizationId`; portal handlers run their own auth + membership checks.
  - **Public checkout (`/api/public/*`, `/donate`, `/join`):** no Clerk; org resolved from subdomain; rely on Square + server-side amount validation.
  - **Square webhook:** `x-square-hmacsha256-signature` HMAC verified in-handler against the raw body (`SQUARE_WEBHOOK_NOTIFICATION_URL`). **Square OAuth callback:** signed-state verification.
  - Model these as distinct security schemes: `clerkSession`, `cronSecret`, `squareWebhookSignature`, `squareOAuthState`, `pinAccess`, plus a "public/none" for unauthenticated checkout.
- **Response shapes:** handlers return Prisma models, frequently with relation `include`s (e.g. `animals` include `carer`, `records`, `photos`). Author a **shared zod response-schema module** mirroring those shapes (`Base` + `WithRelations`, composed and reused across list/detail/create) so each shape is authored once. Confirmed status surface across handlers: 200, 201, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503 — the `errorResponses(codes)` helper must accept any of these.
- **Domain tags (grouping):** Animals, Growth/References, Carers, Carer Training, Species, Incidents, Transfers, Releases/Post-Release, Hygiene, Records, Members, Membership Tiers/Grants, Permanent Care, Portal, Public Checkout, Payments/Square, RBAC, Reports/Report Queries, Admin, Audit, Uploads/Photos, PIN, Weather, Wally (AI), Internal/Cron, Misc.
- **Seed source:** no `CLAUDE.md` API catalog exists. Author summaries from reading each handler, the README RBAC/species tables, and `.product/FEATURES.md`. Expect per-route authoring to be slower than RangerOS (which had a near-complete catalog to seed from).
- **Output paths:** `docs/api/openapi.json` (committed source of truth) + `docs/api/index.html` (committed Scalar render). Add `docs:api` (+ `:json`, `:html`, `:check`) to `package.json` scripts; wire generate + drift + coverage into `.github/workflows/`. Pin generation deps with `--save-exact` so a CI patch bump can't spuriously fail the drift-guard (`npm ci`).
- **Volume:** 116 routes is large. Treat the documentation pass as a repeatable mechanical task per route after the pilot locks conventions; batch by domain tag.

## Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Generation engine | `zod-openapi` v4 registry (programmatic `createDocument`) | `next-openapi-gen` needs Node ≥24 (project is Node 22); `zod-openapi` v4 is zod-3/Node-18+ compatible and runs as-is. Same engine RangerOS settled on for the identical constraint. |
| Documentation format | OpenAPI 3.1 | Standard, machine-readable contract; renders in any viewer; the prerequisite for future SDK generation / public docs if the API is opened up. |
| Request/response schema source | Author zod schemas in `src/lib/openapi/`, **doc-only** | Handlers have almost no zod to derive from; authoring schemas as the doc source of truth gives full request/response docs without changing runtime behaviour. |
| Runtime validation (hardening) | **Out of scope — follow-up PRD** | Lineage discipline (matches the endorsed RangerOS PRD). Wiring zod into ~110 handlers is behaviour-changing and risks breaking the app's own frontend; it deserves its own scoped `/spec` with client-break regression testing. |
| Depth | Full schemas for all functional domains; skeleton for cron/health plumbing | User chose deep across all domains; only genuine infra plumbing (`internal/*`, `keepalive`, health/ping, `sms-status`) is exempt from full-schema authoring. |
| Renderer | Scalar (committed static HTML); Redoc single-file is the pre-authorized fallback | User leaned Scalar for the polished, public-ready look. Redoc's `@redocly/cli build-docs` single-file output is the sanctioned fallback if a fully offline single-file artifact is required — output paths and the rest of the plan are unchanged. |
| Delivery | Committed static artifact (`docs/api/`), no live route | Immediate audience is internal; a committed artifact avoids shipping a docs UI behind Clerk. A live/public docs site is a follow-up when the API is opened up. |
| Drift prevention | CI: artifact freshness + route-coverage + status-code coverage | Gives the "complete / can't silently drift" guarantee teeth for the route map and status codes. **Honest boundary:** request/response *bodies* are author-and-review-verified, NOT CI-asserted (no runtime zod to diff against). Stated, not hidden. |
| Query-param docs | Doc-only zod schemas | Documents existing `searchParams` filters/pagination without changing runtime behaviour (lineage). |
| Rollout | Pilot ~6–7 routes, then fan out by domain | Locks conventions (schema authoring, response sets, the 6+ security schemes, CSV/binary, Square HMAC) before the ~110-route pass. |
