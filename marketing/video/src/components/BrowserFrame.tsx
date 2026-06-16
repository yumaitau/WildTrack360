import { COLORS } from "../brand"

const DOT = (color: string) => ({
  width: 16,
  height: 16,
  borderRadius: 8,
  backgroundColor: color,
})

export const BrowserFrame: React.FC<{
  width: number
  height: number
  children: React.ReactNode
}> = ({ width, height, children }) => (
  <div
    style={{
      width,
      borderRadius: 14,
      overflow: "hidden",
      boxShadow: "0 34px 80px rgba(34,52,40,0.28), 0 8px 24px rgba(34,52,40,0.16)",
      border: `1px solid rgba(34,52,40,0.16)`,
      backgroundColor: "#fff",
    }}
  >
    <div
      style={{
        height: 52,
        display: "flex",
        alignItems: "center",
        gap: 12,
        paddingLeft: 26,
        backgroundColor: COLORS.forestDeep,
      }}
    >
      <div style={DOT("#E0604C")} />
      <div style={DOT("#E8B33C")} />
      <div style={DOT("#5FA86F")} />
    </div>
    <div style={{ width, height, overflow: "hidden", position: "relative" }}>{children}</div>
  </div>
)
