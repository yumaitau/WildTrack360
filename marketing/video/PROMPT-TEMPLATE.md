# Reusable Prompt - Short-Form Product Video Pipeline

Paste this into a coding agent at the root of another product repo. Fill the placeholders first.

Reference implementation: `~/code-projects/WildTrack360/marketing/video/` and `~/code-projects/WildTrack360/scripts/record-product-clips.ts`.

---

I want you to build an automated short-form marketing video pipeline for this product: <<one-line product description>>.

Use the WildTrack360 implementation as the reference. The pipeline is: disposable seeded database -> demo mode app -> Playwright webm recordings -> Remotion compositions -> MP4 renders -> content calendar. Everything must be deterministic and re-runnable, with no production data and no real credentials.

## 1. Demo Environment

- Stand up a disposable database on a free port. Check existing Docker containers first.
- Create or extend a screenshot/demo mode env flag that bypasses auth with a fixed demo user/org, is guarded so it cannot run in production, and freezes the date in recorded pages.
- Seed rich, realistic demo data for every feature that will be filmed. Empty tables and absurd demo numbers are not acceptable on camera.
- Run the app on a dedicated port with `.env.<demo>.local`. Do not overwrite `.env` or `.env.local`.

## 2. External-Service Mocks

- Any paid or external AI/API feature shown on camera needs a demo-mode-only branch in the API route.
- Stream canned AI replies word-by-word when a live response is part of the product story.
- Keep mock text in its own `lib/**` file and leave production paths untouched.
- Avoid vendor dialogs in recordings. Provide a demo fallback for maps or skip map scenes.

## 3. Playwright Recorder

- Adapt the WildTrack360 recorder pattern: one webm per clip, fresh context per clip, fixed viewport, fixed date init script, dev UI cleanup CSS and a warm-up pass over every route.
- Find the real scroll container before writing scroll actions. Many app shells do not scroll on `window`.
- Use a filter env var so one or two clips can be re-recorded after a UI change.
- Record real interactions: search, tabs, typed inputs, preview buttons, streamed assistant responses and forms against demo mocks.
- Verify clips by extracting frames and looking at them before rendering.

## 4. Remotion Project

- Copy the WildTrack360 Remotion structure and rebrand it:
  - `src/brand.ts` from the product palette.
  - Product fonts into `public/fonts/`.
  - Product logo into `public/brand/`.
  - Copy and timing in `src/shorts.ts`.
- Keep the scene grammar: hook -> product clip scenes -> end card.
- Keep `SRC_W/SRC_H` aligned with the recorder viewport.
- Keep `startFrom + duration + 10` below the source clip length in frames.
- Generate compositions from one `ALL_SHORTS` array in `src/Root.tsx`.

## 5. Videos

Build <<N, for example 16>> videos covering the full platform. Each video should have a clear pain-led hook, two to four real product scenes, honest captions and a closing tagline. Flagship workflows get dedicated videos; finish with a fast quick-tour montage.

## 6. Render And Verify

- Render with the Remotion CLI from inside the video project.
- Render in the foreground or in controlled chunks so failures are visible.
- Extract frames from every MP4 at scene midpoints and inspect them.
- Check for blank scenes, clipped text, bad crops, overlapping captions, incomplete streamed content and broken end cards.

## 7. Deliverables

1. MP4s in `marketing/video/out/`.
2. `marketing/video/AGENTS.md` with the exact regeneration runbook and gotchas.
3. `marketing/video/CONTENT-CALENDAR.md` with posting cadence, captions, hashtags and a module coverage map.
4. A filterable clip recorder so any video can be regenerated after UI changes.

Work autonomously: inventory the app from navigation and routes, seed what the camera needs, fix what frame checks reveal and do not declare done until every rendered video passes visual QA.
