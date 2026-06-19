# Portal Domain — OpenAPI Contract Migration Plan

Created: 2026-06-19
Author: josh@luongo.com.au
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Context

The codebase is rolling out a co-located OpenAPI/Zod contract convention (PRD: `docs/prd/2026-06-18-api-documentation.md`). Phase 0 built the foundation (`src/lib/openapi/*`) and a reference domain (`animals`); the **members** domain followed (`docs/plans/2026-06-19-migrate-members-openapi.md`, VERIFIED). Each API route folder gets an `openapi.ts` that declares request + response Zod schemas via `defineContract()`; handlers are wrapped with `route()` (validates request → 400, validates the success response against the contract under `NODE_ENV !== production`); a CI gate (`scripts/openapi-coverage.ts`) fails if any route method is neither contracted nor allowlisted, if any `openapi.ts` is unwired from the manifest, or if `public/openapi.json` is stale.

This plan migrates the **portal domain** — the member-facing API under `src/app/api/portal/**`. It covers **14 route files / 18 path+method pairs**. The intent — identical to the members migration — is to **document and validate what each route CURRENTLY returns**: no contract reshaping, no field renames, no status-code changes, no auth/permission changes (per PRD "Out of scope").

### Portal auth differs from members (verified)

Portal routes do **not** use the admin `auth() → { userId, orgId }` + `requirePermission` RBAC pattern. They use the member-portal pattern:

1. `const { userId } = await auth()` → `401 { error: 'Unauthorized' }` when absent.
2. `const session = await getPortalMember(userId)` (`src/lib/portal.ts`) → `404 { error: 'No membership found' }` when null. `session = { member: Member, email: string }` where `member` is the full Prisma `Member` row.
3. **Most** routes then call `gateFeature(session.member.clerkOrganizationId, 'MEMBERSHIP_PLATFORM')` → returns a **404** response when the feature is disabled. The org comes from the resolved member, never from `auth()`.

Three sub-patterns exist (all verified by reading each handler):

| Pattern | Routes | Notes |
|---|---|---|
| **A** — auth + getPortalMember, **no** gateFeature | `carer-interest` GET/POST, `square-config` GET | `square-config` adds a **503** when Square isn't connected / no app id |
| **B** — auth + getPortalMember + `gateFeature` (404) | `me` GET/PATCH, `messages` GET, `messages/{id}/read` POST, `news` GET, `tiers` GET, `subscriptions` GET, `subscriptions/{id}/cancel` POST, `subscriptions/{id}/card` POST, `checkout/donation` POST, `checkout/membership` POST, `checkout/recurring-donation` POST | the common case |
| **C** — `requirePrimary()` helper (auth + getPortalMember + two 403 guards), **no** gateFeature | `household` GET/POST/DELETE | 403 when the member is a secondary (`primaryMemberId` set) or lacks an own ACTIVE membership |

The `security` field on every contract is `'clerkSession'` (Clerk session cookie — same registered scheme members uses; it is documentation metadata only and does not change runtime auth). All contracts are tagged `['Portal']`.

### Confirmed design decisions (follow the VERIFIED members precedent — "following from the last spec")

1. **Request-shape 400s move into Zod where they are structural** (the members precedent). For the **write** routes whose handlers reject missing/mistyped scalars before doing work — `checkout/donation` (`amountCents` number, `sourceId`), `checkout/membership` (`tierId`, `sourceId`), `checkout/recurring-donation` (`amountCents` number, `interval` ∈ {MONTHLY,ANNUAL}, `sourceId`), `subscriptions/{id}/card` (`sourceId`) — those presence/type checks become the Zod request body, so an invalid body returns the convention's `{ error: 'Invalid request', details }` 400 and request validation runs **before** the handler's auth check. **Accepted behaviour change** (same class members accepted): a malformed *unauthenticated* request now gets 400 instead of 401, and the specific message (`'amountCents required'`, `'interval must be MONTHLY or ANNUAL'`, `'sourceId required'`, …) becomes the generic convention shape. The 400 **status is preserved**. Verified safe: no frontend reads these specific strings — every portal/admin caller does `body?.error || '<fallback>'` then `toast.error(...)` (grep over `src`, 0 hits for the literals). **Implement-time guard:** before deleting each moved inline 400, re-run the literal-string grep **repo-wide** (include `tests/`, `e2e/`, any mobile/integration dirs — not just `src/`) for that route's message; record the per-route 0-hit result in the task's deviation note. If any non-frontend consumer keys on the exact string, STOP and surface it before proceeding.
2. **Domain 400s/404s/503s stay handler/lib-owned and keep their messages** — `validateAmount` min/max (`'Minimum is $X'`), `'Tier not found'` 404, `'Subscription not found'` 404, Square/bookkeeping failures, `square-config`'s 503, and `household`'s lib messages all remain exactly as today. Error responses are **description-only** (no error schema), exactly as animals/members do.

### Autonomous decisions (documented, not asked)

- **`household` POST/DELETE and `me` PATCH and `carer-interest` POST keep handler-owned body/query parsing for their domain-validated inputs.**
  - `household` POST coerces `String(body.firstName ?? '')` and the lib (`addHouseholdMember`) throws the user-facing `'First name, last name and email are required'`. To preserve that message and the coercion byte-for-byte, **no request body schema** is declared (response-only contract; mirrors the members `import` precedent). Same reasoning: `household` DELETE keeps its handler `'id required'` 400 — query schema declares `id` as **optional** so the handler's explicit check (and its order *after* `requirePrimary`) is preserved.
  - `me` PATCH and `carer-interest` POST declare **all-optional** `.passthrough()` body schemas (documentation value, no required fields), so an empty/partial body still reaches the handler and its domain 400 (`'No editable fields supplied'`) / lib 400 is preserved unchanged.
- **`me` GET/PATCH response is a dedicated `PortalMe` schema** (16 fields), matching the route's `serialize()` projection — NOT the full 26-field `Member`. The portal exposes a narrow subset (no Clerk/Square ids beyond `clerkOrganizationId`, no timestamps beyond `joinedAt`).
- **`status`/`kind`/`interval` enums are inlined** (`z.enum([...])` with no `.openapi(name)`) to avoid claiming cross-domain component names (`MemberStatus` is already owned by members; `SubscriptionKind`/`BillingInterval`/`SubStatus` belong to the not-yet-migrated subscriptions/tiers domains). Portal-owned response shapes ARE named components.
- **`tiers` and `subscriptions` GET model the route's projection, not the full Prisma row** (the handlers hand-pick fields + compute `label`). `benefits`/`benefitsJson` → `z.array(z.unknown())`. These are portal-specific view schemas, not the membership-tiers domain's eventual `Tier`.
- **`carer-interest` GET returns the full `CarerInterest` row** (`{ open: CarerInterest | null }`); it is modelled precisely as `CarerInterest` (the admin carer-interest domain is not yet migrated, but this row shape is verified against `prisma/schema.prisma`).
- **A shared `src/app/api/portal/openapi.ts`** holds portal-wide schemas (`PortalOk`, `CheckoutResult`, `SubscriptionResult`) re-used across sub-routes. It registers no path (there is no `portal/route.ts`) — the coverage gate only requires every `openapi.ts` to be wired into the manifest, which it is.

## Summary

**Goal:** Migrate all 14 portal route files to the `defineContract`/`route()` convention — author request + response Zod schemas against actual handler output, wrap each handler (success path returns `{ data }` so the response is validated; 4xx/503 early returns stay raw `NextResponse`), add co-located tests, wire 15 `openapi.ts` files (1 shared + 14 route folders) into the manifest, drain the 18 portal entries from `ROUTE_ALLOWLIST`, and regenerate `public/openapi.json`. The CI gate (`npm run openapi:check`) must pass and the full test suite stays green.

## Feature Inventory (migration map — every method mapped)

| Route file | Methods | Handler output today (success) | Auth | Task |
|---|---|---|---|---|
| `portal/me/route.ts` | GET, PATCH | `PortalMe` (16-field `serialize()`); PATCH same | B | T2 |
| `portal/carer-interest/route.ts` | GET, POST | GET `{ open: CarerInterest \| null }`; POST `{ id }` (200) | A | T3 |
| `portal/household/route.ts` | GET, POST, DELETE | GET `{ members: HouseholdMember[] }`; POST `{ id }`; DELETE `{ ok:true }` | C | T4 |
| `portal/messages/route.ts` | GET | `{ messages: PortalMessage[], nextCursor: string\|null }` | B | T5 |
| `portal/messages/[id]/read/route.ts` | POST | `{ ok: boolean }` | B | T5 |
| `portal/news/route.ts` | GET | `PortalNewsPost[]` | B | T6 |
| `portal/tiers/route.ts` | GET | `PortalTier[]` | B | T6 |
| `portal/subscriptions/route.ts` | GET | `PortalSubscription[]` | B | T6 |
| `portal/square-config/route.ts` | GET | `{ applicationId, locationId }` (+401/404/**503**) | A | T7 |
| `portal/checkout/donation/route.ts` | POST | `CheckoutResult` | B | T8 |
| `portal/checkout/membership/route.ts` | POST | `SubscriptionResult` | B | T8 |
| `portal/checkout/recurring-donation/route.ts` | POST | `SubscriptionResult` | B | T8 |
| `portal/subscriptions/[id]/cancel/route.ts` | POST | `{ ok:true }` (+404 not-found) | B | T9 |
| `portal/subscriptions/[id]/card/route.ts` | POST | `{ ok:true }` (+404 not-found) | B | T9 |

18 pairs, all mapped to a task. None out of scope.

**Authoritative facts (verified this session):**
- `getPortalMember(userId): Promise<{ member: Member, email: string } | null>` (`src/lib/portal.ts`); `pickPortalEditable` whitelists `firstName,lastName,phone,addressLine1,addressLine2,suburb,state,postcode,country`.
- Lib return shapes (returned to the client directly): `createDonationPayment → { paymentId, squarePaymentId, status, receiptNumber: string|null }` (`square/checkout.ts`); `createRecurringSubscription → { subscriptionId, status, firstPaymentId: string|null, receiptNumber: string|null }` (`square/subscriptions.ts`); `cancelSubscription → void`; `markMessageRead → boolean`; `listHouseholdMembers →` rows selecting `{ id, firstName, lastName, email, clerkUserId }`; `addHouseholdMember → { id }`; `getOpenInterest →` full `CarerInterest | null`; `createCarerInterest →` full row (route returns only `{ id }`).
- Enums (`prisma/schema.prisma`): `CarerInterestStatus = NEW|CONTACTED|APPROVED|DECLINED`; `SubscriptionKind = DONATION|MEMBERSHIP`; `BillingInterval = ONE_OFF|MONTHLY|ANNUAL|LIFETIME`; `SubStatus = PENDING|ACTIVE|PAST_DUE|CANCELLED`; `MemberStatus = ACTIVE|LAPSED|CANCELLED|DECEASED`.
- Nullability: `MembershipTier.description` nullable, `currency`/`name`/`amountCents`/`billingInterval`/`benefitsJson` non-null; `SquareConnection.locationId` non-null; `RecurringSubscription.nextChargeAt`/`startedAt` **non-null**, `tierId` nullable; `MemberMessage.sentByName`/`readAt` nullable; `NewsPost.authorName`/`publishedAt` nullable; `CarerInterest.memberId`/`phone`/`experience`/`availability`/`message` nullable.
- Every portal POST returns **200** on success (`NextResponse.json(...)` default) — none return 201. So `successStatus: 200` everywhere.
- The 18 portal allowlist entries to drain are present in `src/lib/openapi/route-allowlist.ts` (1 DELETE, 8 GET, 1 PATCH, 8 POST).
- No file imports these route handlers except Next.js routing and the new tests (grep-confirmed); no frontend reads the route 400 message strings.

## Convention API recap (reuse, do not re-invent)

- `defineContract(config)` — `src/lib/openapi/contract.ts`; import `z` from `@/lib/openapi/registry`. Supports `request.params/query/body`, `responses` (`schema` → validated JSON, `content` → non-JSON, neither → description-only), `successStatus`, `security`, `tags`.
- `route(contract, handler)` — `src/lib/openapi/route.ts`; ctx = `{ request, params, query, body }`. Return `{ data }` / `{ data, status }` for a validated JSON success, or a raw `Response` (passed through; 4xx/5xx silent, 2xx warns in dev). **Success path must return `{ data }`** to get response validation; keep 4xx/503 early returns as raw `NextResponse`.
- Reference: `src/app/api/members/openapi.ts` (shared schemas + list/create contracts), `src/app/api/members/[id]/openapi.ts` (sub-folder importing parent schemas), `src/app/api/members/route.ts` (`export const GET = route(contract, async ({ ... }) => ...)`), `src/app/api/members/route.test.ts` (`vi.hoisted` mocks + realistic Prisma row with `Date`s; asserts 200 schema-valid + 401/403/404/400 branches).

---

## Tasks

### [x] T1 — Shared portal schemas (`portal/openapi.ts`)
**Files:** `src/app/api/portal/openapi.ts` (new)

Pure module (only `z` from registry; no `defineContract`, no route registration). Export:
- `isoDate = () => z.string().openapi({ format: 'date-time' })` (animals/members helper).
- `PortalOkSchema = z.object({ ok: z.boolean() }).openapi('PortalOk')` — used by `household` DELETE, `subscriptions/{id}/cancel`, `subscriptions/{id}/card`, `messages/{id}/read`.
- `CheckoutResultSchema = z.object({ paymentId: z.string(), squarePaymentId: z.string(), status: z.string(), receiptNumber: z.string().nullable() }).openapi('CheckoutResult')`.
- `SubscriptionResultSchema = z.object({ subscriptionId: z.string(), status: z.string(), firstPaymentId: z.string().nullable(), receiptNumber: z.string().nullable() }).openapi('SubscriptionResult')`.
- **DoD:** typechecks; imported (transitively) by later tasks. No test of its own (pure schema module; exercised via the route tests).

### [x] T2 — `portal/me` (GET, PATCH)
**Files:** `src/app/api/portal/me/openapi.ts` (new), `src/app/api/portal/me/route.ts`, `src/app/api/portal/me/route.test.ts` (new)

- **`openapi.ts`:** import `isoDate` from `../openapi`.
  - `PortalMeSchema = z.object({ id, email, firstName, lastName, country: z.string(), phone, addressLine1, addressLine2, suburb, state, postcode, memberNumber: z.string().nullable() (the 6 nullable), status: z.enum(['ACTIVE','LAPSED','CANCELLED','DECEASED']) (inline, no name), joinedAt: isoDate(), clerkOrganizationId: z.string(), customFieldsJson: z.unknown() }).openapi('PortalMe')` — exactly the 16 keys `serialize()` emits.
  - `PortalProfileUpdateSchema = z.object({ firstName, lastName, phone, addressLine1, addressLine2, suburb, state, postcode, country }` — every field `z.string().nullable().optional()`).passthrough().openapi('PortalProfileUpdate')`.
  - `getPortalMeContract` (`get /api/portal/me`, `clerkSession`, tags `['Portal']`, 200 `PortalMeSchema`, 401/404 description-only, successStatus 200).
  - `updatePortalMeContract` (`patch /api/portal/me`, body `PortalProfileUpdateSchema`, 200 `PortalMeSchema`, 400/401/404, successStatus 200).
- **`route.ts`:** keep `serialize()`. Wrap GET → after auth/getPortalMember/gate, `return { data: serialize(session) }`. Wrap PATCH → `pickPortalEditable(ctx.body)`, keep `'No editable fields supplied'` 400 (raw), keep `prisma.member.update` + `logAudit`, `return { data: serialize({ member: updated, email: session.email }) }`; keep the outer catch → raw 400. Auth/gate 401/404 stay raw `NextResponse`.
- **`route.test.ts`:** mock `@/lib/clerk-server` (`auth`), `@/lib/portal` (`getPortalMember`, real `pickPortalEditable` — re-export or mock to passthrough), `@/lib/features` (`gateFeature`), `@/lib/prisma`, `@/lib/audit`. Realistic `member` has `joinedAt: new Date(...)`. Cases: GET 200 schema-valid (`joinedAt` is ISO string); GET 401 (no userId); GET 404 (gateFeature returns 404); PATCH 200 schema-valid; PATCH 400 empty/no-editable body.

### [x] T3 — `portal/carer-interest` (GET, POST)
**Files:** `src/app/api/portal/carer-interest/openapi.ts` (new), `route.ts`, `route.test.ts` (new)

- **`openapi.ts`:** `CarerInterestSchema = z.object({ id, clerkOrganizationId, name, email: z.string(), memberId, phone, experience, availability, message: z.string().nullable() (the 5 nullable), status: z.enum(['NEW','CONTACTED','APPROVED','DECLINED']) (inline), createdAt: isoDate(), updatedAt: isoDate() }).openapi('CarerInterest')`.
  - `getCarerInterestContract` (`get /api/portal/carer-interest`, 200 `z.object({ open: CarerInterestSchema.nullable() }).openapi('CarerInterestOpen')`, 401/404).
  - `CarerInterestSubmitSchema = z.object({ phone: z.string().optional(), experience: z.string().optional(), availability: z.string().optional(), message: z.string().optional() }).passthrough().openapi('CarerInterestSubmit')` (all-optional — preserves behaviour).
  - `submitCarerInterestContract` (`post /api/portal/carer-interest`, body `CarerInterestSubmitSchema`, 200 `z.object({ id: z.string() }).openapi('CreatedId')`, 400/401/404, successStatus 200).
  - Note: Pattern A — **no** 404-when-gated; the only 404 is `'No membership found'`.
- **`route.ts`:** wrap GET → `return { data: { open } }`. Wrap POST → read `ctx.body`, keep `sanitizePlainText` + `createCarerInterest`, `return { data: { id: created.id } }`; keep the catch → raw 400. `CreatedId` is shared across T3/T4 — export it from `../openapi` (move the literal there) to avoid a duplicate component name; declare it once in `portal/openapi.ts` and import in both.
- **`route.test.ts`:** mock `@/lib/clerk-server`, `@/lib/portal`, `@/lib/carer-interest` (`getOpenInterest`, `createCarerInterest`), `@/lib/sanitize`. Cases: GET 200 with a schema-valid `open` row (Dates → ISO); GET 200 `{ open: null }`; GET 401; POST 200 `{ id }`; POST 400 when `createCarerInterest` throws `'You already have an application in progress'`.

> Move `CreatedIdSchema = z.object({ id: z.string() }).openapi('CreatedId')` into T1's `portal/openapi.ts` (used by T3 carer-interest POST and T4 household POST). Update T1's DoD to include it.

### [x] T4 — `portal/household` (GET, POST, DELETE)
**Files:** `src/app/api/portal/household/openapi.ts` (new), `route.ts`, `route.test.ts` (new)

- **`openapi.ts`:** `HouseholdMemberSchema = z.object({ id, firstName, lastName, email: z.string(), clerkUserId: z.string().nullable() })`; `HouseholdListSchema = z.object({ members: z.array(HouseholdMemberSchema) }).openapi('HouseholdMembers')`.
  - `getHouseholdContract` (`get /api/portal/household`, 200 `HouseholdListSchema`, 401/403/404).
  - `addHouseholdMemberContract` (`post /api/portal/household`, **no request body schema** — handler coerces `String(body.x ?? '')` and the lib owns the `'... are required'` 400, 200 `CreatedIdSchema` from `../openapi`, 400/401/403/404, successStatus 200).
  - `removeHouseholdMemberContract` (`delete /api/portal/household`, query `z.object({ id: z.string().optional() })` (loose — preserve handler `'id required'` 400 + its order after `requirePrimary`), 200 `PortalOkSchema`, 400/401/403/404).
- **`route.ts`:** keep `requirePrimary()`. GET → `return { data: { members } }`. POST → `addHouseholdMember(...)` with the same `String(...)` coercion reading `ctx.body` (or `ctx.request.json()` — keep current parse), `return { data: result }`; keep catch → raw 400. DELETE → read `id` from `ctx.request` URL (or `ctx.query.id`), keep `'id required'` raw 400, `removeHouseholdMember`, `return { data: { ok: true } }`; keep catch → raw 400. `requirePrimary` 401/403/404 stay raw.
- **`route.test.ts`:** mock `@/lib/clerk-server`, `@/lib/portal`, `@/lib/prisma` (the `requirePrimary` `membership.findFirst` + household libs), `@/lib/household`, `@/lib/sanitize`. Cases: GET 200 schema-valid list; GET 403 (secondary member — `primaryMemberId` set); GET 403 (no own active membership — `findFirst` null); POST 200 `{ id }`; DELETE 200 `{ ok:true }`; DELETE 400 `'id required'` (no `?id=`); **DELETE 401 when unauthenticated, no `?id=`** — pins that the optional query schema still lets `requirePrimary`'s 401 run *before* the handler's `'id required'` 400 (auth-first ordering preserved).

### [x] T5 — `portal/messages` (GET) + `portal/messages/[id]/read` (POST)
**Files:** `messages/openapi.ts` + `route.ts` + `route.test.ts`; `messages/[id]/read/openapi.ts` + `route.ts` + `route.test.ts` (all tests new)

- **messages `openapi.ts`:** `PortalMessageSchema = z.object({ id, subject, body: z.string(), sentByName: z.string().nullable(), readAt: isoDate().nullable(), createdAt: isoDate() })`; `PortalMessagesSchema = z.object({ messages: z.array(PortalMessageSchema), nextCursor: z.string().nullable() }).openapi('PortalMessages')`. `listPortalMessagesContract` (`get /api/portal/messages`, query `z.object({ limit: z.string().optional(), cursor: z.string().optional() })`, 200 `PortalMessagesSchema`, 401/404).
  - **`route.ts`:** keep `parseLimit`; read `limit`/`cursor` (pass `ctx.query.cursor ?? null` to `listMemberMessages`), keep the `+1`/`hasMore`/`slice` paging, `return { data: { messages, nextCursor } }`.
  - **test:** mock `@/lib/member-messages` (`listMemberMessages`). Cases: 200 schema-valid (rows with `Date`s; assert `readAt`/`createdAt` ISO and `nextCursor`); 401; 404 gated.
- **messages/[id]/read `openapi.ts`:** `markMessageReadContract` (`post /api/portal/messages/{id}/read`, params `z.object({ id: z.string() })`, 200 `PortalOkSchema` (import `../../openapi`), 401/404, successStatus 200).
  - **`route.ts`:** wrap POST; `const updated = await markMessageRead(ctx.params.id, session.member.id)`; `return { data: { ok: updated } }`.
  - **test:** mock `@/lib/member-messages` (`markMessageRead`). Cases: 200 `{ ok:true }`; 200 `{ ok:false }` (already read → count 0); 401.

### [x] T6 — `portal/news` + `portal/tiers` + `portal/subscriptions` (all GET)
**Files:** `news/openapi.ts` + `route.ts` + `route.test.ts`; `tiers/openapi.ts` + `route.ts` + `route.test.ts`; `subscriptions/openapi.ts` + `route.ts` + `route.test.ts` (all tests new)

- **news:** `PortalNewsPostSchema = z.object({ id, title, body: z.string(), authorName: z.string().nullable(), publishedAt: isoDate().nullable() }).openapi('PortalNewsPost')`. `listPortalNewsContract` (`get /api/portal/news`, 200 `z.array(PortalNewsPostSchema)`, 401/404). `route.ts` → keep the `.map(...)` projection, `return { data: posts.map(...) }`. test: mock `@/lib/news` (`listPublishedNews`); 200 schema-valid; 401; 404 gated.
- **tiers:** `PortalTierSchema = z.object({ id, name, description: z.string().nullable(), amountCents: z.number().int(), currency: z.string(), billingInterval: z.enum(['ONE_OFF','MONTHLY','ANNUAL','LIFETIME']) (inline), benefits: z.array(z.unknown()) }).openapi('PortalTier')`. `listPortalTiersContract` (`get /api/portal/tiers`, 200 `z.array(PortalTierSchema)`, 401/404). `route.ts` → keep projection (`benefits: Array.isArray(t.benefitsJson) ? t.benefitsJson : []`), `return { data: ... }`. test: mock `@/lib/prisma` (`membershipTier.findMany`); 200 schema-valid (one tier with `benefitsJson: []` and one with array); 401.
- **subscriptions:** `PortalSubscriptionSchema = z.object({ id, kind: z.enum(['DONATION','MEMBERSHIP']) (inline), label: z.string(), amountCents: z.number().int(), currency: z.string(), interval: z.enum(['ONE_OFF','MONTHLY','ANNUAL','LIFETIME']) (inline), status: z.enum(['PENDING','ACTIVE','PAST_DUE','CANCELLED']) (inline), nextChargeAt: isoDate(), startedAt: isoDate() }).openapi('PortalSubscription')`. `listPortalSubscriptionsContract` (`get /api/portal/subscriptions`, 200 `z.array(PortalSubscriptionSchema)`, 401/404). `route.ts` → keep the sub+tier-name join projection, `return { data: ... }`. test: mock `@/lib/prisma` (`recurringSubscription.findMany`, `membershipTier.findMany`); 200 schema-valid (a MEMBERSHIP sub with a tier name + a DONATION sub; `nextChargeAt`/`startedAt` Dates → ISO); 401.

### [x] T7 — `portal/square-config` (GET)
**Files:** `square-config/openapi.ts` (new), `route.ts`, `route.test.ts` (new)

- **`openapi.ts`:** `SquareConfigSchema = z.object({ applicationId: z.string(), locationId: z.string() }).openapi('SquareConfig')`. `getSquareConfigContract` (`get /api/portal/square-config`, 200 `SquareConfigSchema`, 401 'Unauthorized', 404 'No membership found', **503** — description-only). The route emits **two distinct 503s** (verified): `'Payments not configured'` (when `getConnection` returns null or `conn.revokedAt`) and `'Square application id not configured'` (when neither `NEXT_PUBLIC_SQUARE_APPLICATION_ID` nor the `SQUARE_APPLICATION_ID` fallback is set). One 503 response entry; describe both branches in its `description`. Pattern A — no gateFeature.
- **`route.ts`:** wrap GET; keep `getConnection`, keep both 503 early returns as raw `NextResponse`, keep the `applicationId = NEXT_PUBLIC_SQUARE_APPLICATION_ID ?? SQUARE_APPLICATION_ID ?? null` fallback, `return { data: { applicationId, locationId: conn.locationId } }`. (503 ≥ 300 → no 2xx warn.)
- **`route.test.ts`:** mock `@/lib/clerk-server`, `@/lib/portal`, `@/lib/square/oauth` (`getConnection`). Set `process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID` (and clear `SQUARE_APPLICATION_ID`) for the success case. Cases: 200 `{ applicationId, locationId }`; 401; **503 connection-missing** (`getConnection` returns null/revoked); **503 app-id-missing** (`getConnection` returns a valid conn but both app-id env vars are unset).

### [x] T8 — `portal/checkout/*` (donation, membership, recurring-donation — all POST)
**Files:** `checkout/donation/openapi.ts` + `route.ts` + `route.test.ts`; `checkout/membership/openapi.ts` + `route.ts` + `route.test.ts`; `checkout/recurring-donation/openapi.ts` + `route.ts` + `route.test.ts` (all tests new)

- **donation `openapi.ts`:** `DonationCheckoutSchema = z.object({ amountCents: z.number(), message: z.string().nullable().optional(), isAnonymous: z.boolean().optional(), sourceId: z.string().min(1), verificationToken: z.string().nullable().optional() }).passthrough().openapi('DonationCheckout')`. `donationCheckoutContract` (`post /api/portal/checkout/donation`, body `DonationCheckoutSchema`, 200 `CheckoutResultSchema` (`../../openapi`), 400/401/404, successStatus 200). `route.ts` → drop the inline `amountCents`/`sourceId` 400s (now Zod), read `ctx.body`, keep `createDonationPayment`, `return { data: result }`; keep the catch → raw 400 (preserves `validateAmount` domain messages). test: mock `@/lib/square/checkout` (`createDonationPayment`); 200 schema-valid; 400 invalid body (missing `amountCents` → `'Invalid request'`, `createDonationPayment` not called); 404 gated.
- **membership `openapi.ts`:** `MembershipCheckoutSchema = z.object({ tierId: z.string().min(1), coverFees: z.boolean().optional(), sourceId: z.string().min(1), verificationToken: z.string().nullable().optional() }).passthrough().openapi('MembershipCheckout')`. `membershipCheckoutContract` (… body, 200 `SubscriptionResultSchema`, 400/401/404). `route.ts` → drop inline 400s, keep `prisma.membershipTier.findFirst` + `'Tier not found'` raw 404, keep `totalWithCoveredFees` fee-grossing (server-derived from `tier.amountCents`), keep `createRecurringSubscription`, `return { data: result }`; catch → raw 400. test: mock `@/lib/prisma`, `@/lib/square/subscriptions`, `@/lib/fees`; 200 schema-valid; 404 `'Tier not found'` (`findFirst` null); 400 missing `tierId`.
- **recurring-donation `openapi.ts`:** `RecurringDonationCheckoutSchema = z.object({ amountCents: z.number(), interval: z.enum(['MONTHLY','ANNUAL']), isAnonymous: z.boolean().optional(), sourceId: z.string().min(1), verificationToken: z.string().nullable().optional() }).passthrough().openapi('RecurringDonationCheckout')`. `recurringDonationCheckoutContract` (… 200 `SubscriptionResultSchema`, 400/401/404). `route.ts` → drop inline 400s (incl. the `interval` check, now the enum), keep `createRecurringSubscription`, `return { data: result }`; catch → raw 400. test: mock `@/lib/square/subscriptions`; 200 schema-valid; 400 bad `interval` (e.g. `'WEEKLY'`); 404 gated.

### [x] T9 — `portal/subscriptions/[id]/cancel` + `portal/subscriptions/[id]/card` (POST)
**Files:** `subscriptions/[id]/cancel/openapi.ts` + `route.ts` + `route.test.ts`; `subscriptions/[id]/card/openapi.ts` + `route.ts` + `route.test.ts` (all tests new)

- **cancel `openapi.ts`:** `cancelSubscriptionContract` (`post /api/portal/subscriptions/{id}/cancel`, params `z.object({ id: z.string() })`, 200 `PortalOkSchema` (`../../../openapi`), 401/404 — 404 covers both 'No membership found' and 'Subscription not found', description-only). `route.ts` → wrap; keep the `recurringSubscription.findFirst` ownership scope → raw 404 `'Subscription not found'`, keep `cancelSubscription`, `return { data: { ok: true } }`. test: mock `@/lib/prisma`, `@/lib/square/subscriptions` (`cancelSubscription`); 200 `{ ok:true }`; 404 not-owned (`findFirst` null); 401.
- **card `openapi.ts`:** `UpdateCardSchema = z.object({ sourceId: z.string().min(1), verificationToken: z.string().nullable().optional() }).passthrough().openapi('UpdateSubscriptionCard')`. `updateSubscriptionCardContract` (`post /api/portal/subscriptions/{id}/card`, params `{ id }`, body `UpdateCardSchema`, 200 `PortalOkSchema`, 400/401/404). **Accepted ordering change:** with a body schema, `route()` validates the body **before** the handler's ownership 404 — a missing `sourceId` on a non-owned sub now returns 400 (was 404). `route.ts` → drop the inline `sourceId` 400, keep `recurringSubscription.findFirst` 404, keep `getValidAccessToken`/`saveCardOnFile`/the two `update`s, `return { data: { ok: true } }`; keep catch → raw 400. test: mock `@/lib/prisma`, `@/lib/square/oauth`, `@/lib/square/cards`; 200 `{ ok:true }`; 404 not-owned; 400 missing `sourceId`.

### [x] T10 — Wire manifest, drain allowlist, regenerate snapshot
**Files:** `src/lib/openapi/manifest.ts`, `src/lib/openapi/route-allowlist.ts`, `public/openapi.json`

- **manifest.ts:** add a `// Portal domain` block with **15** side-effect imports: `@/app/api/portal/openapi` (shared) + the 14 route folders: `me`, `carer-interest`, `household`, `messages`, `messages/[id]/read`, `news`, `tiers`, `subscriptions`, `square-config`, `checkout/donation`, `checkout/membership`, `checkout/recurring-donation`, `subscriptions/[id]/cancel`, `subscriptions/[id]/card` (each `.../openapi`).
- **route-allowlist.ts:** remove the **18** portal entries (`DELETE /api/portal/household`; `GET` ×8: `/api/portal/{carer-interest,household,me,messages,news,square-config,subscriptions,tiers}`; `PATCH /api/portal/me`; `POST` ×8: `/api/portal/carer-interest`, `/api/portal/checkout/{donation,membership,recurring-donation}`, `/api/portal/household`, `/api/portal/messages/{id}/read`, `/api/portal/subscriptions/{id}/cancel`, `/api/portal/subscriptions/{id}/card`). Leave every non-portal entry untouched. Then run `npm run openapi:check -- --init` and confirm it produces **no diff** (i.e. the allowlist is already exactly the remaining uncontracted set — the 18 portal pairs are now contracted).
- **Regenerate snapshot:** `npm run openapi:generate` (alias for `... -- --write`) → refresh `public/openapi.json`.
- **DoD:** `npm run openapi:check` passes (coverage + wiring + freshness all green).

---

## Verification

Run from repo root (npm; `package.json` scripts confirmed):

1. **Typecheck:** `npm run typecheck` → 0 errors.
2. **Unit/route tests:** `npm test` → full suite, 0 failures (not just portal files). The response-validation tests are the core guarantee: a realistic Prisma row must pass each success schema (no `validateResponse` throw under `NODE_ENV=test`). Pay special attention to the Date→ISO fields (`joinedAt`, `createdAt`, `readAt`, `nextChargeAt`, `startedAt`, `publishedAt`) and the nullable projections.
3. **Contract gate:** `npm run openapi:check` → coverage (18 portal pairs now contracted, removed from allowlist), wiring (15 new `openapi.ts` imported), freshness (`public/openapi.json` matches) all green. `--init` produces no diff.
4. **Spec contents spot-check:** confirm `public/openapi.json` now contains the 18 portal paths under the `Portal` tag; `GET /api/portal/square-config` lists a **503**; `GET /api/portal/me` references `PortalMe` (16 fields, not the 26-field `Member`); the checkout POSTs reference `CheckoutResult` / `SubscriptionResult`.
5. **Live E2E (portal UI + Scalar docs) — 4-tier probe, record each outcome:**
   - Tier 1: reuse a running dev server (curl the configured port); Tier 2: `npm run dev` in background, poll until ready; then with a browser tool (Claude Code Chrome → Chrome DevTools MCP → playwright-cli → agent-browser): load `/api/docs` (Scalar) and confirm the **Portal** tag + the 18 operations render. If a portal Clerk session bound to a Member with `MEMBERSHIP_PLATFORM` enabled is available, open the member portal, load the profile (`GET /api/portal/me`), the messages/news/tiers/subscriptions panels, and confirm they render (each hits its endpoint; because dev runs `NODE_ENV !== production`, any response-schema mismatch throws on the live request — exercising the endpoint IS the validation).
   - If the portal UI is unreachable (no bound portal session / feature off), record the probe outcome and fall back to hitting `/api/openapi` + `/api/docs` to prove the contracts are published and the doc generates; note the auth gap explicitly rather than claiming full UI E2E.

## Out of scope (per PRD)

Contract reshaping, field renames, status-code changes, auth/permission changes, new endpoints, external publishing, client SDK generation, frontend migration. Migrating the membership-tiers, subscriptions, news, and carer-interest **admin** domains (the portal tiers/subscriptions/news schemas here are deliberate portal-projection view schemas, not those domains' eventual canonical schemas). Pre-existing handler internals (the `requirePrimary` 403 logic, the Square fee-grossing, the donation inline-bookkeeping reconciliation) are left as-is (lineage).
