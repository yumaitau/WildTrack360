# Agent Runbook - WildTrack360 Marketing Shorts

Instructions for regenerating or extending the WildTrack360 short-form marketing videos. The pipeline is deterministic: seeded local app -> Playwright webm clips -> Remotion compositions -> MP4 renders. No production data, real Clerk session, Square account or AWS credentials are required.

## Architecture

| Piece | Path / value | Notes |
|---|---|---|
| Demo database | Docker `wildtrack360-marketing-db`, postgres:16-alpine, port 5435 | Disposable. Re-seed freely. |
| Env file | `<repo>/.env.marketing.local` | Sets screenshot mode, dummy Clerk/Square/AWS values and app port 3002. Ignored by git. |
| Screenshot mode | `src/lib/screenshot-mode.ts` | Fixed org is Illawarra Wildlife Rescue. Fixed date is `2026-06-10T10:30:00+10:00`. |
| Auth bypass | `src/middleware.ts`, `src/lib/clerk-server.ts`, `src/lib/clerk-client.tsx` | Only active when `WILDTRACK360_SCREENSHOT_MODE=true`; guarded against production. |
| Seed | `npm run db:seed:screenshots` | Writes rich demo animals, carers, call logs, compliance, members, payments and admin data. |
| Recorder | `scripts/record-product-clips.ts` | Playwright webm clips into `marketing/video/public/clips/`. |
| Video project | `marketing/video/` | Remotion 4 project. Specs live in `src/shorts.ts`. |
| Outputs | `marketing/video/out/*.mp4` | Generated, gitignored. |

## Full Pipeline

Run from the repo root unless noted.

```bash
# 1. Database
docker run -d --name wildtrack360-marketing-db \
  -e POSTGRES_PASSWORD=wildtrack360 \
  -e POSTGRES_DB=wildtrack360_marketing \
  -p 5435:5432 postgres:16-alpine

# 2. Migrate and seed
set -a && source .env.marketing.local && set +a
npx prisma migrate deploy
npm run db:seed:screenshots

# 3. Dev server
set -a && source .env.marketing.local && set +a
npx next dev --hostname 127.0.0.1 --port 3002

# 4. Record all clips, or a filtered subset
set -a && source .env.marketing.local && set +a
npm run record:clips
WILDTRACK360_CLIP_FILTER=wally,admin-people npm run record:clips

# 5. Render
cd marketing/video
npm install
npm run compositions
npm run render:all
```

## Recording Conventions

- Viewport is 1160x1360. `ClipScene.tsx` assumes that exact source size.
- The app uses document and nested scroll containers depending on the route. The recorder finds the largest scrollable element and drives `scrollTop` with an eased animation.
- Each clip uses a fresh browser context with `recordVideo`, `Australia/Sydney`, `en-AU`, light mode and the fixed screenshot init script.
- A warm-up pass visits every route before recording, so Next.js first compile does not become blank footage.
- `WILDTRACK360_CLIP_FILTER` accepts comma-separated clip names.
- Wally is mocked in screenshot mode through `src/lib/wally/screenshot-reply.ts` and the Wally API route, so the assistant scene streams without Bedrock.
- Google Maps renders a screenshot-mode fallback when no key is present, so map-dependent UI can load without a vendor dialog.
- Generated `page@*.webm` files are Playwright leftovers. Delete them if they appear.

Current clip names:

`dashboard`, `dashboard-widgets`, `animals`, `animal-detail`, `animal-growth`, `compliance`, `compliance-overview`, `register`, `call-logs`, `carers`, `training`, `release-checklist`, `nsw-report`, `tools`, `custom-reporting`, `feed-roster`, `flying-fox-calculator`, `macropod-calculator`, `admin`, `admin-people`, `admin-assets`, `admin-audit`, `members`, `payments`, `wally`.

## Composition Conventions

- `src/shorts.ts` is the only normal editing surface for copy, order and timing.
- All durations are frames at 30fps. Scenes overlap by `TRANSITION_FRAMES`.
- Clip-length rule: `startFrom + duration + 10` must be less than the source clip length in frames.
- `src/Root.tsx` exposes 16 compositions: Overview, AnimalLifecycle, Compliance, NswReport, CallLogs, CarersTraining, ReleaseReadiness, CustomReporting, Wally, FeedRoster, FeedCalculators, AdminControl, MembershipPayments, AssetsAudit, DailyDashboard and QuickTour.
- The render script maps composition IDs to `out/wildtrack360-<kebab-id>.mp4`.
- Brand assets are local: `public/brand/logo.svg`, `public/brand/wally-avatar.svg`, and Google-font TTFs in `public/fonts/google/`.

## Verify Before Declaring Done

Renders passing is not enough. Extract frames and look at them.

```bash
cd marketing/video
npx remotion still Overview --frame=180 /tmp/wildtrack-overview.png
npx remotion ffmpeg -y -ss 00:00:07 -i out/wildtrack360-overview.mp4 -frames:v 1 /tmp/wildtrack-overview-frame.png
```

Checklist:

- Hook text fits and does not wrap mid-word.
- Every clip scene shows real UI, not loading skeletons or blank first-compile frames.
- Left edge of product UI is not clipped by the portrait crop.
- Captions do not overlap the browser frame.
- Wally and custom-reporting scenes start after streamed/generated content is visible.
- End card logo, wordmark and tagline are intact.
- Every rendered MP4 is under 60 seconds.

## Gotchas

- `npx remotion ...` only works inside `marketing/video/`.
- `remotion.config.ts` raises the delay-render timeout to 120 seconds for font and media loading under render load.
- `TransitionSeries` children must remain a flat array of sequences/transitions.
- Re-recording clips can change webm durations by a few frames. Re-check `START` offsets after any re-record.
- Root `tsconfig.json` intentionally does not include `marketing/video`; typecheck the video project separately.
- `marketing/video/public/clips/`, `marketing/video/out/` and `marketing/video/node_modules/` are gitignored. Do not commit generated clips or MP4s.
