# Custom Forms

Org-defined data-collection forms, ported from WildForm360. Coordinators build
forms (11 field types + capture toggles), publish them, and users with the
`form:submit` permission can submit responses from the web app or (soon) the
iOS/Android apps.

## Feature flag

The whole surface is gated by the `CUSTOM_FORMS` org feature flag (see
`src/lib/features.ts`). Routes return 404 and the Forms nav entry is hidden
until the flag is enabled for the org. Enable it by inserting an
`org_feature_flags` row (`feature = 'CUSTOM_FORMS'`, `enabled = true`) via the
WildTrack360-Admin app, or SQL for local dev:

```sql
INSERT INTO org_feature_flags (id, clerk_organization_id, feature, enabled, created_at, updated_at)
VALUES (gen_random_uuid()::text, '<org id>', 'CUSTOM_FORMS', true, now(), now())
ON CONFLICT (clerk_organization_id, feature) DO UPDATE SET enabled = true;
```

## Permissions

| Permission | ADMIN | COORDINATOR(_ALL) | CARER(_ALL) |
|---|---|---|---|
| `form:manage` (create/edit/publish/delete/versions) | ✓ | ✓ | |
| `form:view_submissions` (all submissions + export) | ✓ | ✓ | |
| `form:submit` (see published forms, submit, view own) | ✓ | ✓ | ✓ |

## Data model (`prisma/schema.prisma`)

- `CustomForm` — org-scoped; `definitionJson` holds the current
  `CustomFormDefinition` (capture toggles + fields); `status`
  DRAFT/PUBLISHED/ARCHIVED; `currentVersion` counter.
- `CustomFormVersion` — immutable snapshot per save. Rollback creates a NEW
  version copied from an old snapshot; history is never rewritten.
- `CustomFormSubmission` — captured values keyed by field id, plus observedAt,
  location, photo URLs, weather, notes, device metadata. Unique
  `(org, submitter, clientSubmissionId)` gives offline sync idempotency.

Domain logic lives in `src/lib/forms/custom-forms.ts` (shared
normalisation/validation), `custom-form-service.ts` (Prisma service),
`custom-form-exports.ts` (CSV/JSON export).

## API (all Clerk session auth)

The wire shapes intentionally mirror WildForm360's mobile API so the iOS and
Android clients can be ported against the same payloads.

| Method + path | Who | Notes |
|---|---|---|
| GET `/api/custom-forms` | form:submit | Published only unless form:manage |
| POST `/api/custom-forms` | form:manage | `{ title, description?, status?, schema? }` |
| GET `/api/custom-forms/{id}` | form:submit | Drafts 404 for non-managers |
| PATCH `/api/custom-forms/{id}` | form:manage | Full/partial patch; bumps version, snapshots |
| DELETE `/api/custom-forms/{id}` | form:manage | Cascades submissions |
| GET `/api/custom-forms/{id}/versions` | form:manage | |
| GET `/api/custom-forms/{id}/versions/{versionId}` | form:manage | |
| POST `/api/custom-forms/{id}/versions/{versionId}/rollback` | form:manage | |
| GET `/api/custom-forms/{id}/submissions/export?format=csv\|json` | form:view_submissions | File download |
| GET `/api/custom-forms/submissions?formId=&from=&to=&limit=` | form:submit | Carers see only their own |
| POST `/api/custom-forms/submissions` | form:submit | 201 CREATED / 200 DEDUPLICATED / 400 REJECTED |
| POST `/api/custom-forms/submissions/batch` | form:submit | ≤50 records, `clientSubmissionId` required per record |

Submission result shape (per record): `{ clientSubmissionId, submissionId,
status: 'CREATED'|'DEDUPLICATED'|'REJECTED', errorCode, message, issues? }`.

### Mobile offline sync contract

1. Capture offline with a client-generated UUID as `clientSubmissionId`.
2. Replay via the batch endpoint when back online.
3. Treat `CREATED` and `DEDUPLICATED` both as success (safe to delete the
   local queue entry); `REJECTED` carries `errorCode` + validation `issues`.

## Web UI

- `/forms` — list; managers can create/delete/publish.
- `/forms/{id}/edit` — builder (fields, capture toggles, preview, versions).
- `/forms/{id}/fill` — submit a response (geolocation, manual weather, photo URLs).
- `/forms/{id}/submissions` — table + CSV/JSON export.

## Not ported from WildForm360 (yet)

- Share links + per-form access grants (WildTrack360 relies on org roles).
- R2 presigned photo uploads — submissions accept https photo URLs for now.
- ZIP export with embedded photos; the query workbench (`your-own-ql`).
- Wildlife starter templates.
