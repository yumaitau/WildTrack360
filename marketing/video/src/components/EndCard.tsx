import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion"
import { COLORS, FONT_BODY, FONT_HEADLINE, PRODUCT_NAME } from "../brand"
import { CreamBackground } from "./Background"

export const EndCard: React.FC<{ tagline: string }> = ({ tagline }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const logoIn = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 26 })
  const textIn = spring({ frame: frame - 14, fps, config: { damping: 200 }, durationInFrames: 26 })

  return (
    <CreamBackground>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: FONT_BODY }}>
        <Img
          src={staticFile("brand/logo.svg")}
          style={{
            width: 420,
            height: 450,
            objectFit: "contain",
            opacity: logoIn,
            transform: `scale(${interpolate(logoIn, [0, 1], [0.85, 1])})`,
            filter: "drop-shadow(0 28px 46px rgba(34,52,40,0.2))",
          }}
        />
        <div
          style={{
            marginTop: 34,
            fontSize: 96,
            fontWeight: 900,
            letterSpacing: 0,
            color: COLORS.forest,
            fontFamily: FONT_HEADLINE,
            opacity: logoIn,
          }}
        >
          {PRODUCT_NAME}
        </div>
        <div
          style={{
            marginTop: 44,
            width: 860,
            textAlign: "center",
            fontSize: 52,
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: 0,
            color: COLORS.ink,
            fontFamily: FONT_HEADLINE,
            opacity: textIn,
            transform: `translateY(${interpolate(textIn, [0, 1], [30, 0])}px)`,
          }}
        >
          {tagline}
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 36,
            fontWeight: 700,
            color: COLORS.leaf,
            fontFamily: FONT_BODY,
            opacity: textIn,
          }}
        >
          Built for wildlife rescue teams and rehabilitators.
        </div>
      </AbsoluteFill>
    </CreamBackground>
  )
}
