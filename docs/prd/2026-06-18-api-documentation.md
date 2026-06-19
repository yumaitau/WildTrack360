# API Documentation (OpenAPI + Scalar, Zod-derived)

Created: 2026-06-18
Author: josh@luongo.com.au
Agent: Claude Code
Category: Documentation
Status: Final
Research: None

## Problem Statement

WildTrack360 exposes ~116 API route handlers under `src/app/api/` (Next.js 15 App Router) covering animals, carers, members, the public/portal donation + membership surface, Square OAuth/webhooks, RBAC, reporting, and internal cron endpoints. None of it is documented: there is no machine-readable contract, no browsable reference, and no enforced link between a route's real behaviour and any description of it. New contributors must read each handler to understand request shapes, auth requirements, and responses, and there is no safety net catching when a route's contract changes.

Today the handlers also validate requests ad-hoc — `zod` is installed but the routes parse `request.json()` into untyped objects and hand-roll checks (e.g. `animals/route.ts`, `public/checkout/donation/route.ts`). Response shapes are inconsistent (a raw array here, `{ error }` there). This means there is no single source of truth to generate docs from.

We want a **drift-proof, internally-facing API reference** that is generated from the code itself, so that documentation and runtime behaviour can never silently diverge. The chosen mechanism — per-route Zod schemas for both requests and responses — additionally hardens the API by validating inputs and outputs against an explicit contract.

## Core User Flows

Audience is **internal developers** (contributors maintaining and extending WildTrack360), so the "users" below are developers, not end users.

### Flow 1: Browse the API reference
1. A developer opens the in-app Scalar reference (e.g. `/api/docs`) in their browser.
2. Endpoints are grouped by domain tag (Animals, Members, Portal, Public, Square, RBAC, Admin, Internal, …).
3. For each endpoint they see: method + path, summary, auth requirement, request schema (params/query/body), response schema(s) per status code, and example values.
4. They use the built-in request client to try an endpoint against a running dev server.

### Flow 2: Add or change a route (the source-of-truth convention)
1. A developer adds a new `route.ts` handler (or changes an existing one's contract).
2. They define the route's Zod request and response schemas via the project convention and register the route (method, path, tags, summary, security).
3. The OpenAPI document regenerates from the registry; Scalar reflects the change with no separate doc edit.
4. If they forget to register a schema for a route (or the committed spec is stale), the **CI gate fails the build** — undocumented routes cannot merge.

### Flow 3: Runtime validation (request + response)
1. An incoming request is parsed against the route's Zod request schema; invalid input is rejected with a structured `400` validation error before business logic runs.
2. The handler's response is validated against the route's Zod response schema.
3. **Validation failure mode:** in `development`/`test`, a response that fails its schema **throws** (loud, catches contract bugs early). In `production`, the violation is **logged to Sentry and the response is still returned** — a docs/schema mismatch never becomes a 500 for a real user.

## Scope

### In Scope
- An **OpenAPI 3.1** document generated from per-route Zod schemas, covering **all ~116 routes** (delivered in phases — see Technical Context → Phased Rollout).
- A **per-route schema + registration convention** (a `defineRoute`/registry-style helper, or co-located schema exports) that is the single source of truth for request shape, response shape(s), method, path, tags, summary, and security scheme.
- **Request validation** at the boundary for every documented route (replacing/augmenting the current hand-rolled checks), returning a structured `400` on invalid input.
- **Response runtime validation** against the route's response schema, with the environment-dependent failure mode described in Flow 3 (throw in dev/test; log-to-Sentry + pass-through in prod). Includes a shared serialization helper to reconcile Prisma output (`Date` → ISO string, `Decimal` → string/number, nested relation includes) with the schemas.
- **Scalar** mounted as an in-app route serving the generated spec.
- **Security schemes** modelled in the spec: Clerk session auth (the default for most routes), public/unauthenticated (e.g. `public/checkout/*`), and internal (cron-secret / webhook-signature endpoints under `internal/*`, `square/webhook`).
- A **CI drift gate**: a script that (a) enumerates every `route.ts` and its exported HTTP methods, (b) fails if any is missing a registered schema, and (c) regenerates the spec and fails if the committed `openapi.json` is stale. Because **no CI workflow exists today**, this includes standing up a GitHub Actions workflow (running typecheck + tests + the coverage script). The gate uses a **shrinking allowlist** so it can be enabled on day one without blocking un-migrated domains.

### Explicitly Out of Scope
- **Reshaping existing API contracts** — we document and validate what each route *currently* returns; we do not standardise response envelopes, rename fields, or change status codes. (A consistency pass could be a later PRD.)
- **Auth / RBAC behaviour changes** — security schemes are *described*, not modified.
- **New endpoints, versioning, rate-limiting, or pagination redesign.**
- **Public/external publishing or hosting** of the docs beyond the in-app Scalar route (and the generated `openapi.json` artifact). No external developer portal.
- **Client SDK / typed-client generation** from the spec — valuable follow-on, but not part of this effort.
- **Migrating the front-end's data-fetching** to consume the generated schemas.

## Technical Context

Lightweight notes for `/spec`; this is not the full technical design.

- **Stack:** Next.js 15 App Router, TypeScript (strict), `zod` ^3.25, `@clerk/nextjs` auth, Prisma 6, `@sentry/nextjs` (already wired — the prod validation-failure sink), Vitest. Deploy target is **Vercel** (`vercel.json` defines crons).
- **Spec generation:** a Zod→OpenAPI generator compatible with Zod 3 (e.g. `@asteasolutions/zod-to-openapi`). `/spec` selects and pins the exact library. Output is a committed `openapi.json` (generated by a build/script step), consumed by both Scalar and the CI drift check.
- **Convention shape:** routes register request + response schemas and metadata into a central registry; a generator walks the registry to emit the spec. A shared wrapper applies request parsing, response serialization + validation, and the failure-mode policy so individual handlers stay thin.
- **Auth reality (must be captured per route, not assumed uniform):** most routes call Clerk `auth()` and enforce RBAC via `getUserRole`/`hasPermission`; `public/checkout/*` is intentionally unauthenticated and resolves the org from the subdomain handle; `internal/*` + `square/webhook` rely on cron secret / signature verification. The spec's security schemes and per-route tags must reflect these three classes.
- **Response validation risk:** Prisma returns `Date`, `Decimal`, and nested relation objects (e.g. `animals` GET includes `carer`, `records`, `photos`). Naive response schemas will mismatch and — under strict runtime validation — could 500 a working endpoint. The serialization helper + the prod log-and-pass-through failure mode exist specifically to contain this; response schemas are authored against *actual* handler output, verified per route.
- **CI is greenfield:** `.github/` currently holds only PR/issue templates — there is **no** GitHub Actions workflow. The drift gate requires creating one. A local `npm` script (+ optional pre-push hook) provides the same check for developers before CI exists.
- **Prior art:** a previous session began a Zod-schema-based OpenAPI effort under `src/lib/openapi/` with a drift-check, but **none of it is present in the repo** — implementation starts from zero.

### Phased Rollout (each phase is a shippable `/spec` chunk)
- **Phase 0 — Foundation + reference domain:** install/pin libraries; build the registration convention, shared request/response wrapper, serialization helper, and spec generator; mount Scalar at the docs route; stand up the CI workflow + drift script with an allowlist seeded to "all routes except the reference domain". Fully migrate **one reference domain end-to-end** (recommend `animals`) as the worked example, including request + response schemas and tests. Deliverable: a working docs site with one fully-documented, fully-validated domain and the convention proven.
- **Phases 1–N — Domain migration:** migrate route groups in batches (e.g. Carers, Members, Portal, Public, Square, RBAC, Admin, Reporting, Internal, misc). Each batch authors request + response schemas, wraps handlers, adds/updates tests, and **removes its routes from the CI allowlist** so the gate enforces them going forward.
- **Final:** allowlist empty → CI gate blocks any undocumented or stale-spec change; spec covers all ~116 routes.

## Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Documentation tooling | OpenAPI 3.1 generated from code, rendered by **Scalar** | Modern reference UX with a built-in request client; mounts cleanly in a Next.js route. Spec-from-code prevents hand-written docs from drifting. |
| Coverage | **All ~116 routes**, internal-developer audience | User chose full reference for the whole team, not just the external surface. |
| Source of truth | **Per-route Zod schemas** (request + response) feeding a central registry | Single source for docs *and* validation; structurally drift-resistant — a route can't be documented one way and behave another. |
| Response handling | **Document + runtime-validate** responses | Strongest contract guarantee; catches output drift, not just input. Chosen deliberately over docs-only. |
| Response validation failure mode | Throw in **dev/test**; **log to Sentry + return** in **prod** | Catches contract bugs loudly in development without letting a schema mismatch turn a working endpoint into a production 500. Sentry is already in the stack. |
| Drift enforcement | **CI gate blocks** undocumented routes / stale spec, via a shrinking allowlist | User chose hard enforcement. Allowlist lets the gate ship on day one while domains migrate incrementally. |
| CI substrate | New **GitHub Actions** workflow (none exists today) + local npm script | The chosen gate has no pipeline to attach to; standing one up is part of scope. Local script gives developers the check pre-CI. |
| Existing contracts | Documented as-is; **not reshaped** | Keeps this effort to documentation + validation; avoids bundling a risky API redesign. |
| Rollout | **Phased by domain**, Phase 0 foundation + reference domain | ~116 routes with a full Zod refactor is too large for one plan; phasing lands value incrementally and keeps each `/spec` run reviewable. |
