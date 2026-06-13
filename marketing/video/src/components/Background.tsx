import { AbsoluteFill } from "remotion"
import { COLORS } from "../brand"

export const CreamBackground: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ backgroundColor: COLORS.cream }}>
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, rgba(123,166,76,0.18) 0%, transparent 34%),
          linear-gradient(180deg, rgba(2,93,85,0.07) 0%, transparent 45%),
          repeating-linear-gradient(90deg, rgba(34,52,40,0.03) 0 1px, transparent 1px 34px)`,
      }}
    />
    {children}
  </AbsoluteFill>
)

export const ForestBackground: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ backgroundColor: COLORS.forest }}>
    <AbsoluteFill
      style={{
        background: `linear-gradient(140deg, rgba(123,166,76,0.34) 0%, transparent 42%),
          linear-gradient(0deg, rgba(169,96,32,0.2) 0%, transparent 38%),
          repeating-linear-gradient(90deg, rgba(245,241,222,0.055) 0 1px, transparent 1px 42px)`,
      }}
    />
    {children}
  </AbsoluteFill>
)
