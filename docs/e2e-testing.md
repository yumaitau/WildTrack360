# E2E testing

Two Playwright suites, run separately:

| Suite | Config | Target | Runs | Writes? |
|-------|--------|--------|------|---------|
| **Prod monitor** | `playwright.config.ts` (`e2e/`) | LIVE prod tenant | on demand | no (read-only) |
| **Staging full** | `playwright.staging.config.ts` (`e2e-staging/`) | STAGING tenant | on demand | yes (CRUD) |

Neither suite is currently wired into GitHub Actions. The checked-in `ci.yml`
workflow runs the deterministic unit, integration, type, OpenAPI, and security
checks; these environment-backed E2E suites are run explicitly when required.

The app is multi-tenant by subdomain, so every target URL must be a **tenant
subdomain host**, not the apex.

---

## Suite A — prod monitor (read-only)

Drives the live product, logs in with a real Clerk session, asserts the key
authenticated pages render.

- `e2e/clerk-global-setup.ts` — derives `CLERK_FAPI` from the publishable key.
- `e2e/clerk-auth.ts` — `signIn()`: **password** strategy when a `*_PASSWORD` env
  var is set (simplest for local runs; needs a Clerk dev instance), else a
  Backend-API **sign-in token** (ticket strategy; works on a production instance).
- `e2e/auth.setup.ts` → saves session to `playwright/.clerk/user.json`.
- `e2e/smoke.spec.ts` — read-only heartbeat over key pages.

Secrets: `E2E_CLERK_SECRET_KEY`, `E2E_CLERK_PUBLISHABLE_KEY`,
`E2E_CLERK_USER_EMAIL`, optional `E2E_BASE_URL`. Set `DEFAULT_BASE_URL` in
`playwright.config.ts`.

## Suite B — staging full CRUD + five-role RBAC

Runs against a **dedicated staging tenant** (never prod — specs create/delete
real records). Five seeded users cover every application role.

- Projects (`playwright.staging.config.ts`): one authentication setup and one
  browser project for each of `ADMIN`, `COORDINATOR_ALL`, `COORDINATOR`,
  `CARER_ALL`, and `CARER`, followed by the `cleanup` safety sweep.
- `e2e-staging/access.admin.spec.ts` — ADMIN can view every authed page.
- `e2e-staging/access.carer.spec.ts` — CARER is redirected from every
  `/admin/*` and `/compliance/*` page (layout gate = `requireMinimumRole
  (COORDINATOR)`), and can view the allowed pages.
- `e2e-staging/role-matrix.spec.ts` — nine shared end-to-end capabilities run
  as all five roles: exact role resolution, authenticated UI, section gates,
  reporting permission, desktop/mobile navigation, animal data scope, animal
  creation permission, and cross-tenant rejection.
- `e2e-staging/crud/*.spec.ts` — admin full CRUD per resource. `ui.ts` holds the
  shared shadcn/Radix helpers (`selectOption`, `pickDate`, `expectToast`).
- `e2e-staging/{constants,helpers,global.teardown}.ts` — the `E2E-STAGING`
  marker + safety-net API sweep of leftover records.

Secrets: `E2E_STAGING_BASE_URL`, `E2E_STAGING_CLERK_SECRET_KEY`,
`E2E_STAGING_CLERK_PUBLISHABLE_KEY`, plus email/password pairs using these
prefixes: `E2E_ADMIN`, `E2E_COORDINATOR_ALL`, `E2E_COORDINATOR`,
`E2E_CARER_ALL`, and `E2E_CARER`.

### Coverage contract

`npx playwright test --config playwright.staging.config.ts --list` enumerates
**107 tests**. The 90% target is an E2E product-surface measure, not JavaScript
line coverage:

- all five application roles are authenticated and asserted end to end;
- all 45 cells in the five-role × nine-capability RBAC matrix run;
- every stable authenticated static admin/coordinator route is exercised by the
  admin page sweep, with representative allow/deny gates repeated for every
  lower role;
- core animal and incident CRUD workflows run against real persistence;
- destructive records carry the `E2E-STAGING` marker and are swept last using
  the admin session.

Community, Square payments, and member-portal flows are excluded from this
denominator when their feature flags or external sandboxes are disabled. They
must not be counted as covered merely because a route returns a non-error page.

### CRUD coverage status

Implemented as proven references: **animals** (dialog CRUD, UI delete) and
**incidents** (page CRUD; UI has no delete, so the "D" goes through the REST API).

Not yet written (one spec each, following the two references): carers, hygiene,
call-logs, release-checklist, preserved-specimens, permanent-care, transfers,
members, news, membership-tiers, species, growth-references, reminders,
post-release-monitoring, assets, report-queries. Note **not every resource has a
UI delete** — use the incidents pattern (delete via API) where the UI lacks one.

## Run locally

```bash
npx playwright install --with-deps chromium
npm run test:e2e            # prod monitor (needs E2E_CLERK_* + prod URL)
npm run test:e2e:staging    # staging suite (needs E2E_STAGING_* + staging URL)
npm run test:e2e:staging:headed # same staging suite with visible browsers
npm run test:e2e:staging:ui # Playwright UI runner
```

## Provisioning (you)

1. **Staging tenant** — a persistent non-prod deploy on its own subdomain, with a
   seeded org. Set `E2E_STAGING_BASE_URL` (and `baseURL` default in the config).
2. **Five users** on the staging Clerk instance, mapped in the staging DB to
   `ADMIN`, `COORDINATOR_ALL`, `COORDINATOR`, `CARER_ALL`, and `CARER` for that
   org (the app resolves role from the `OrgMember` row, not Clerk).
   The coordinator fixture must be assigned the Koala species group; the role
   matrix also expects the deterministic `E2E-RBAC-*` animals described in
   `e2e-staging/constants.ts`.
3. **Species seeded** on the staging tenant (the animal create form's Species
   select must have options).
4. **Environment variables** listed above for each suite, supplied through the
   local shell or an external secret manager.

After provisioning, run `npm run test:e2e:staging`. The full 107-test suite has
been validated against a live non-production deployment in headed Chromium.
