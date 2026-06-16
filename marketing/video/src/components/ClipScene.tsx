import {
  AbsoluteFill,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion"
import { COLORS, FONT_BODY, FONT_HEADLINE } from "../brand"
import { CreamBackground } from "./Background"
import { BrowserFrame } from "./BrowserFrame"

export type ClipSceneProps = {
  clip: string
  kicker: string
  title: string
  caption?: string
  startFrom?: number
  focusX?: number
  focusY?: number
}

const SRC_W = 1160
const SRC_H = 1360
const WIN_W = 980
const WIN_H = 1150

export const ClipScene: React.FC<ClipSceneProps> = ({
  clip,
  kicker,
  title,
  caption,
  startFrom = 10,
  focusX = 0.58,
  focusY = 0.4,
}) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()

  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 24 })
  const textY = interpolate(enter, [0, 1], [46, 0])
  const frameIn = spring({ frame: frame - 6, fps, config: { damping: 200 }, durationInFrames: 28 })
  const frameY = interpolate(frameIn, [0, 1], [110, 0])
  const captionIn = spring({ frame: frame - 18, fps, config: { damping: 200 }, durationInFrames: 24 })

  const baseScale = WIN_H / SRC_H
  const zoom = interpolate(frame, [0, durationInFrames], [1.1, 1.17])
  const scale = baseScale * zoom
  const scaledW = SRC_W * scale
  const scaledH = SRC_H * scale
  const SIDEBAR_PX = 0
  const tx = Math.min(0, Math.max(WIN_W - scaledW, -SIDEBAR_PX * scale))
  const ty = Math.min(0, Math.max(WIN_H - scaledH, WIN_H / 2 - focusY * scaledH))

  return (
    <CreamBackground>
      <AbsoluteFill style={{ alignItems: "center", fontFamily: FONT_BODY }}>
        <div style={{ marginTop: 110, width: 940, opacity: enter, transform: `translateY(${textY}px)` }}>
          <div
            style={{
              display: "inline-block",
              padding: "10px 26px",
              borderRadius: 999,
              backgroundColor: "rgba(2,93,85,0.12)",
              color: COLORS.forest,
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: 0,
              textTransform: "uppercase",
            }}
          >
            {kicker}
          </div>
          <div
            style={{
              marginTop: 22,
              fontSize: 76,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: 0,
              color: COLORS.ink,
              fontFamily: FONT_HEADLINE,
            }}
          >
            {title}
          </div>
        </div>

        <div style={{ marginTop: 44, opacity: frameIn, transform: `translateY(${frameY}px)` }}>
          <BrowserFrame width={WIN_W} height={WIN_H}>
            <OffthreadVideo
              src={staticFile(clip)}
              startFrom={startFrom}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: SRC_W,
                height: SRC_H,
                transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                transformOrigin: "0 0",
              }}
            />
          </BrowserFrame>
        </div>

        {caption ? (
          <div
            style={{
              position: "absolute",
              bottom: 90,
              opacity: captionIn,
              transform: `translateY(${interpolate(captionIn, [0, 1], [30, 0])}px)`,
              backgroundColor: COLORS.forest,
              color: COLORS.cream,
              fontSize: 38,
              fontWeight: 700,
              padding: "22px 44px",
              borderRadius: 999,
              maxWidth: 920,
              textAlign: "center",
              boxShadow: "0 16px 40px rgba(16,33,26,0.3)",
            }}
          >
            {caption}
          </div>
        ) : null}
      </AbsoluteFill>
    </CreamBackground>
  )
}
