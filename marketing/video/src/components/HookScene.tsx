import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion"
import { COLORS, FONT_BODY, FONT_HEADLINE } from "../brand"
import { ForestBackground } from "./Background"

export const HookScene: React.FC<{ lines: string[]; accent?: string }> = ({ lines, accent }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const markIn = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 20 })

  return (
    <ForestBackground>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: FONT_BODY }}>
        <div
          style={{
            width: 390,
            height: 408,
            borderRadius: 72,
            backgroundColor: COLORS.cream,
            border: `3px solid ${COLORS.sand}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 52,
            opacity: markIn,
            transform: `scale(${interpolate(markIn, [0, 1], [0.7, 1])})`,
            boxShadow: "0 30px 70px rgba(0,0,0,0.28), 0 0 0 12px rgba(245,241,222,0.08)",
          }}
        >
          <Img
            src={staticFile("brand/logo.svg")}
            style={{
              width: 308,
              height: 330,
              objectFit: "contain",
              filter: "drop-shadow(0 14px 24px rgba(2,69,63,0.12))",
            }}
          />
        </div>
        <div style={{ width: 900, textAlign: "center" }}>
          {lines.map((line, i) => {
            const s = spring({ frame: frame - 8 - i * 7, fps, config: { damping: 200 }, durationInFrames: 26 })
            return (
              <div
                key={line}
                style={{
                  fontSize: 96,
                  fontWeight: 900,
                  lineHeight: 1.06,
                  letterSpacing: 0,
                  color: COLORS.cream,
                  fontFamily: FONT_HEADLINE,
                  opacity: s,
                  transform: `translateY(${interpolate(s, [0, 1], [60, 0])}px)`,
                }}
              >
                {line}
              </div>
            )
          })}
          {accent ? (
            <div
              style={{
                marginTop: 44,
                fontSize: 42,
                fontWeight: 700,
                color: COLORS.sand,
                fontFamily: FONT_BODY,
                opacity: spring({ frame: frame - 8 - lines.length * 7, fps, config: { damping: 200 }, durationInFrames: 26 }),
              }}
            >
              {accent}
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
    </ForestBackground>
  )
}
