import { Composition } from "remotion"
import "./fonts"
import { Short, shortDuration, type ShortSpec } from "./Short"
import {
  ADMIN_CONTROL,
  ANIMAL_LIFECYCLE,
  ASSETS_AUDIT,
  CALL_LOGS,
  CARERS_TRAINING,
  COMPLIANCE,
  CUSTOM_REPORTING,
  DAILY_DASHBOARD,
  FEED_CALCULATORS,
  FEED_ROSTER,
  MEMBERSHIP_PAYMENTS,
  NSW_REPORT,
  OVERVIEW,
  QUICK_TOUR,
  RELEASE_READINESS,
  WALLY,
} from "./shorts"

const FPS = 30

export const ALL_SHORTS: Array<{ id: string; spec: ShortSpec }> = [
  { id: "Overview", spec: OVERVIEW },
  { id: "AnimalLifecycle", spec: ANIMAL_LIFECYCLE },
  { id: "Compliance", spec: COMPLIANCE },
  { id: "NswReport", spec: NSW_REPORT },
  { id: "CallLogs", spec: CALL_LOGS },
  { id: "CarersTraining", spec: CARERS_TRAINING },
  { id: "ReleaseReadiness", spec: RELEASE_READINESS },
  { id: "CustomReporting", spec: CUSTOM_REPORTING },
  { id: "Wally", spec: WALLY },
  { id: "FeedRoster", spec: FEED_ROSTER },
  { id: "FeedCalculators", spec: FEED_CALCULATORS },
  { id: "AdminControl", spec: ADMIN_CONTROL },
  { id: "MembershipPayments", spec: MEMBERSHIP_PAYMENTS },
  { id: "AssetsAudit", spec: ASSETS_AUDIT },
  { id: "DailyDashboard", spec: DAILY_DASHBOARD },
  { id: "QuickTour", spec: QUICK_TOUR },
]

export const RemotionRoot: React.FC = () => (
  <>
    {ALL_SHORTS.map(({ id, spec }) => (
      <Composition
        key={id}
        id={id}
        component={Short}
        durationInFrames={shortDuration(spec)}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ spec }}
      />
    ))}
  </>
)
