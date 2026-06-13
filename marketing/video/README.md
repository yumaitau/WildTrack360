# WildTrack360 Marketing Shorts

Vertical product videos for YouTube Shorts, Instagram Reels, Facebook Reels and TikTok. The pipeline records the real WildTrack360 app in screenshot mode with seeded demo data, then renders 1080x1920 MP4s with Remotion.

Agents: see [AGENTS.md](./AGENTS.md) for the full regeneration runbook, geometry contract, verification steps and known gotchas.

## Outputs

Rendered files are written to `out/`:

- `wildtrack360-overview.mp4` - whole-platform rescue and compliance overview
- `wildtrack360-animal-lifecycle.mp4` - rescue, care records, growth and release
- `wildtrack360-compliance.mp4` - compliance hub, readiness and register
- `wildtrack360-nsw-report.mp4` - NSW annual reporting workflow
- `wildtrack360-call-logs.mp4` - rescue calls and shared handoffs
- `wildtrack360-carers-training.mp4` - carers, licences and training
- `wildtrack360-release-readiness.mp4` - pre-release checklist and evidence
- `wildtrack360-custom-reporting.mp4` - read-only query workbench and widgets
- `wildtrack360-wally.mp4` - Wally AI assistant
- `wildtrack360-feed-roster.mp4` - daily feeding schedule
- `wildtrack360-feed-calculators.mp4` - flying fox and macropod feed tools
- `wildtrack360-admin-control.mp4` - roles, assets and audit logs
- `wildtrack360-membership-payments.mp4` - supporters, memberships and payments
- `wildtrack360-assets-audit.mp4` - asset traceability and audit trail
- `wildtrack360-daily-dashboard.mp4` - morning dashboard workflow
- `wildtrack360-quick-tour.mp4` - fast multi-scene tour

`out/` and `public/clips/` are generated artifacts and are ignored by git. The recorder script and `src/shorts.ts` are the source of truth.

## Regenerate From Scratch

Run from the repo root unless noted.

```bash
# 1. Disposable demo database on port 5435
docker run -d --name wildtrack360-marketing-db \
  -e POSTGRES_PASSWORD=wildtrack360 \
  -e POSTGRES_DB=wildtrack360_marketing \
  -p 5435:5432 postgres:16-alpine

# 2. Migrate and seed deterministic screenshot data
set -a && source .env.marketing.local && set +a
npx prisma migrate deploy
npm run db:seed:screenshots

# 3. Start the app in screenshot mode on port 3002
set -a && source .env.marketing.local && set +a
npx next dev --hostname 127.0.0.1 --port 3002

# 4. Record Playwright clips into marketing/video/public/clips/
set -a && source .env.marketing.local && set +a
npm run record:clips

# 5. Render videos
cd marketing/video
npm install
npm run render:all
```

Useful partial reruns:

```bash
WILDTRACK360_CLIP_FILTER=wally,custom-reporting npm run record:clips
cd marketing/video && npx remotion render Wally out/wildtrack360-wally.mp4
cd marketing/video && npm run dev
```

## Editing

- Copy, scene order and timing: `src/shorts.ts`.
- Composition list and IDs: `src/Root.tsx`.
- Brand colors: `src/brand.ts`.
- Hook, clip and end-card components: `src/components/`.
- Recorder routes and interactions: `../../scripts/record-product-clips.ts`.

Every scene uses `startFrom` and `duration` in frames at 30fps. Keep `startFrom + duration + 10` below the source clip length in frames, or Remotion can seek beyond the webm.
