# E2E testing

Two Playwright suites, different jobs:

| Suite            | Config                                          | Target           | Runs                        | Writes?        |
| ---------------- | ----------------------------------------------- | ---------------- | --------------------------- | -------------- |
| **Prod monitor** | `playwright.config.ts` (`e2e/`)                 | LIVE prod tenant | daily 06:00 AEST + dispatch | no (read-only) |
| **Staging full** | `playwright.staging.config.ts` (`e2e-staging/`) | STAGING tenant   | daily 06:00 AEST + dispatch | yes (CRUD)     |

Neither suite runs on PR or merge — both are scheduled (20:00 UTC = 06:00 AEST)
plus manual `workflow_dispatch`.

The app is multi-tenant by subdomain, so every target URL must be a **tenant
subdomain host**, not the apex.

---

## Suite A — prod daily monitor (read-only)

Drives the live product, logs in with a real Clerk session, asserts the key
authenticated pages render. A failed run fails the workflow → GitHub emails repo
watchers.

- Workflow: `.github/workflows/e2e-daily.yml` — cron `0 20 * * *` (06:00 AEST).
- `e2e/clerk-global-setup.ts` — derives `CLERK_FAPI` from the publishable key.
- `e2e/clerk-auth.ts` — `signIn()`: **password** strategy when a `*_PASSWORD` env
  var is set (simplest for local runs; needs a Clerk dev instance), else a
  Backend-API **sign-in token** (ticket strategy; works on a production instance).
- `e2e/auth.setup.ts` → saves session to `playwright/.clerk/user.json`.
- `e2e/smoke.spec.ts` — read-only heartbeat over key pages.

Secrets: `E2E_CLERK_SECRET_KEY`, `E2E_CLERK_PUBLISHABLE_KEY`,
`E2E_CLERK_USER_EMAIL`, optional `E2E_BASE_URL`. Set `DEFAULT_BASE_URL` in
`playwright.config.ts`.

## Suite B — staging full CRUD + RBAC

Runs against a **dedicated staging tenant** (never prod — specs create/delete
real records). Two seeded users drive two roles.

- Workflow: `.github/workflows/e2e-staging.yml` — daily 06:00 AEST + dispatch.
- Projects (`playwright.staging.config.ts`): `setup-admin`, `setup-carer`,
  `admin` (CRUD + admin page access), `carer` (RBAC), `cleanup` (teardown sweep).
- `e2e-staging/access.admin.spec.ts` — ADMIN can view every authed page.
- `e2e-staging/access.carer.spec.ts` — CARER is redirected from every
  `/admin/*` and `/compliance/*` page (layout gate = `requireMinimumRole
(COORDINATOR)`), and can view the allowed pages.
- `e2e-staging/crud/*.spec.ts` — admin full CRUD per resource. `ui.ts` holds the
  shared shadcn/Radix helpers (`selectOption`, `pickDate`, `expectToast`).
- `e2e-staging/{constants,helpers,global.teardown}.ts` — the `E2E-STAGING`
  marker + safety-net API sweep of leftover records.

Secrets: `E2E_STAGING_BASE_URL`, `E2E_STAGING_CLERK_SECRET_KEY`,
`E2E_STAGING_CLERK_PUBLISHABLE_KEY`, `E2E_STAGING_ADMIN_EMAIL`,
`E2E_STAGING_CARER_EMAIL`.

### CRUD coverage status

Implemented as proven references: **animals** (API create/update, UI read/delete),
**incidents** (page CRUD; UI has no delete, so the "D" goes through the REST API),
and **custom forms** (UI create/build/publish/fill, photo rendering, submission
delete, and form delete).

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
npm run test:e2e:staging:ui # Playwright UI runner
```

## Provisioning (you)

1. **Staging tenant** — a persistent non-prod deploy on its own subdomain, with a
   seeded org. Set `E2E_STAGING_BASE_URL` (and `baseURL` default in the config).
2. **Two users** on the staging Clerk instance, mapped in the staging DB to
   `OrgRole` **ADMIN** and **CARER** for that org (the app resolves role from the
   `OrgMember` row, not Clerk). Seed via `prisma/seed.ts` or the admin UI.
3. **Species seeded** on the staging tenant (the animal create form's Species
   select must have options).
4. **GitHub Actions secrets** listed above for each suite.

After provisioning, run `npm run test:e2e:staging` locally and iterate the CRUD
specs to green — they're written against the real DOM but have not been run against
a live app yet.
