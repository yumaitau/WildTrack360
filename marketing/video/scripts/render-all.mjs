import { spawnSync } from "node:child_process"
import { mkdirSync } from "node:fs"

const ids = [
  "Overview",
  "AnimalLifecycle",
  "Compliance",
  "NswReport",
  "CallLogs",
  "CarersTraining",
  "ReleaseReadiness",
  "CustomReporting",
  "Wally",
  "FeedRoster",
  "FeedCalculators",
  "AdminControl",
  "MembershipPayments",
  "AssetsAudit",
  "DailyDashboard",
  "QuickTour",
]

function kebab(id) {
  return id
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase()
}

mkdirSync("out", { recursive: true })

for (const id of ids) {
  const output = `out/wildtrack360-${kebab(id)}.mp4`
  console.log(`Rendering ${id} -> ${output}`)
  const result = spawnSync("npx", ["remotion", "render", id, output], {
    stdio: "inherit",
    shell: process.platform === "win32",
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}
