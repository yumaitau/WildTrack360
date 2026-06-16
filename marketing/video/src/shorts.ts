import type { ShortSpec } from "./Short"

const START = {
  dashboard: 300,
  dashboardWidgets: 210,
  animals: 80,
  animalDetail: 210,
  animalGrowth: 150,
  compliance: 30,
  complianceOverview: 210,
  register: 60,
  callLogs: 50,
  carers: 60,
  training: 60,
  release: 30,
  nswReport: 270,
  tools: 120,
  customReporting: 270,
  feedRoster: 60,
  flyingFox: 120,
  macropod: 210,
  adminPeople: 150,
  adminAssets: 150,
  adminAudit: 150,
  members: 60,
  payments: 60,
  wally: 210,
}

export const OVERVIEW: ShortSpec = {
  hook: {
    lines: ["Wildlife care", "without the", "spreadsheet drift."],
    accent: "Animals, carers, compliance and reporting in one workspace",
    duration: 72,
  },
  scenes: [
    {
      clip: "clips/dashboard.webm",
      kicker: "Daily Command",
      title: "See every urgent care and compliance signal",
      caption: "NSW reporting, call logs and feed risk on one dashboard",
      duration: 150,
      startFrom: START.dashboard,
      focusY: 0.42,
    },
    {
      clip: "clips/animals.webm",
      kicker: "Animal Register",
      title: "Search every animal in care in seconds",
      caption: "Species, status, carer and date found stay together",
      duration: 130,
      startFrom: START.animals,
    },
    {
      clip: "clips/compliance.webm",
      kicker: "Compliance",
      title: "Turn operational records into audit-ready views",
      duration: 120,
      startFrom: START.compliance,
    },
  ],
  end: {
    tagline: "Run rescue work from one living record.",
    duration: 90,
  },
}

export const ANIMAL_LIFECYCLE: ShortSpec = {
  hook: {
    lines: ["One animal.", "Every care", "decision."],
    accent: "Rescue through release, transfer or permanent care",
    duration: 72,
  },
  scenes: [
    {
      clip: "clips/animal-detail.webm",
      kicker: "Animal Profile",
      title: "Keep rescue details, carer and NSW data together",
      caption: "Location, encounter type, weight and condition are visible",
      duration: 160,
      startFrom: START.animalDetail,
      focusY: 0.34,
    },
    {
      clip: "clips/animal-growth.webm",
      kicker: "Growth",
      title: "Track care records and growth without leaving the profile",
      duration: 130,
      startFrom: START.animalGrowth,
      focusY: 0.42,
    },
    {
      clip: "clips/release-checklist.webm",
      kicker: "Release",
      title: "Move from care to release with a standard checklist",
      duration: 110,
      startFrom: START.release,
    },
  ],
  end: {
    tagline: "Every outcome has the context behind it.",
    duration: 90,
  },
}

export const COMPLIANCE: ShortSpec = {
  hook: {
    lines: ["Compliance", "that updates", "with the work."],
    accent: "Registers, incidents, hygiene, carers and releases",
    duration: 72,
  },
  scenes: [
    {
      clip: "clips/compliance.webm",
      kicker: "Hub",
      title: "Open every compliance workflow from one place",
      duration: 120,
      startFrom: START.compliance,
    },
    {
      clip: "clips/compliance-overview.webm",
      kicker: "Readiness",
      title: "Spot missing evidence before submission week",
      caption: "Scores, alerts and upcoming deadlines stay visible",
      duration: 90,
      startFrom: START.complianceOverview,
    },
    {
      clip: "clips/register.webm",
      kicker: "Register",
      title: "Maintain the wildlife admission and outcome register",
      duration: 130,
      startFrom: START.register,
    },
  ],
  end: {
    tagline: "Less chasing. Cleaner records.",
    duration: 90,
  },
}

export const NSW_REPORT: ShortSpec = {
  hook: {
    lines: ["NSW annual", "reporting,", "ready faster."],
    accent: "Built around the wildlife rehabilitation reporting period",
    duration: 72,
  },
  scenes: [
    {
      clip: "clips/dashboard.webm",
      kicker: "Reminder",
      title: "Know what is missing before the period closes",
      caption: "Required NSW fields are flagged from live records",
      duration: 130,
      startFrom: START.dashboard,
    },
    {
      clip: "clips/nsw-report.webm",
      kicker: "Report Builder",
      title: "Generate the combined report from structured data",
      duration: 85,
      startFrom: START.nswReport,
      focusY: 0.42,
    },
    {
      clip: "clips/register.webm",
      kicker: "Source Register",
      title: "Review admissions, outcomes and excluded rows first",
      duration: 120,
      startFrom: START.register,
    },
  ],
  end: {
    tagline: "Keep the annual report close to daily work.",
    duration: 90,
  },
}

export const CALL_LOGS: ShortSpec = {
  hook: {
    lines: ["Every rescue", "call has", "a trail."],
    accent: "Caller, species, reason, location and assignment",
    duration: 72,
  },
  scenes: [
    {
      clip: "clips/call-logs.webm",
      kicker: "Call Log",
      title: "Capture incoming wildlife calls in a shared queue",
      caption: "Open and closed calls are visible across the team",
      duration: 120,
      startFrom: START.callLogs,
    },
    {
      clip: "clips/dashboard-widgets.webm",
      kicker: "Dashboard",
      title: "Bring call activity into the morning view",
      duration: 120,
      startFrom: START.dashboardWidgets,
    },
    {
      clip: "clips/animal-detail.webm",
      kicker: "Context",
      title: "Link the call trail back to the animal record",
      duration: 120,
      startFrom: START.animalDetail,
    },
  ],
  end: {
    tagline: "No handoff gets lost between phone and care.",
    duration: 90,
  },
}

export const CARERS_TRAINING: ShortSpec = {
  hook: {
    lines: ["Know who", "can care for", "what."],
    accent: "Licences, species skills and training records",
    duration: 72,
  },
  scenes: [
    {
      clip: "clips/carers.webm",
      kicker: "Carers",
      title: "See licences, species authorisations and workload",
      duration: 140,
      startFrom: START.carers,
    },
    {
      clip: "clips/training.webm",
      kicker: "Training",
      title: "Track expiring certificates before they become blockers",
      caption: "Expired and expiring-soon training are surfaced clearly",
      duration: 140,
      startFrom: START.training,
    },
    {
      clip: "clips/admin-people.webm",
      kicker: "Roles",
      title: "Manage roles and profiles from the admin workspace",
      duration: 110,
      startFrom: START.adminPeople,
    },
  ],
  end: {
    tagline: "Capacity planning starts with trusted carer data.",
    duration: 90,
  },
}

export const RELEASE_READINESS: ShortSpec = {
  hook: {
    lines: ["Release", "readiness", "without guesswork."],
    accent: "Assessments, dates, locations and sign-off",
    duration: 72,
  },
  scenes: [
    {
      clip: "clips/release-checklist.webm",
      kicker: "Assessment",
      title: "Standardise pre-release checks across the team",
      duration: 120,
      startFrom: START.release,
    },
    {
      clip: "clips/animal-detail.webm",
      kicker: "Animal Context",
      title: "Keep release history attached to the animal profile",
      duration: 130,
      startFrom: START.animalDetail,
    },
    {
      clip: "clips/compliance-overview.webm",
      kicker: "Compliance",
      title: "See release evidence inside the broader readiness picture",
      duration: 85,
      startFrom: START.complianceOverview,
    },
  ],
  end: {
    tagline: "Better releases. Better evidence.",
    duration: 90,
  },
}

export const CUSTOM_REPORTING: ShortSpec = {
  hook: {
    lines: ["Ask better", "questions of", "your data."],
    accent: "Safe read-only reporting for operational teams",
    duration: 72,
  },
  scenes: [
    {
      clip: "clips/custom-reporting.webm",
      kicker: "Workbench",
      title: "Preview a report without exporting a spreadsheet",
      caption: "Results stay inside your organisation data",
      duration: 120,
      startFrom: START.customReporting,
      focusY: 0.46,
    },
    {
      clip: "clips/dashboard-widgets.webm",
      kicker: "Pinned Widgets",
      title: "Put saved queries back on the dashboard",
      duration: 120,
      startFrom: START.dashboardWidgets,
    },
    {
      clip: "clips/wally.webm",
      kicker: "Wally",
      title: "Turn plain English into the next report question",
      duration: 120,
      startFrom: START.wally,
    },
  ],
  end: {
    tagline: "Use reports as a tool, not a monthly chore.",
    duration: 90,
  },
}

export const WALLY: ShortSpec = {
  hook: {
    lines: ["Meet Wally.", "Your wildlife", "workspace AI."],
    accent: "Australian-hosted assistance grounded in your records",
    duration: 72,
  },
  scenes: [
    {
      clip: "clips/wally.webm",
      kicker: "Ask Wally",
      title: "Ask what to fix before NSW annual reporting",
      caption: "Wally answers from workspace context and product docs",
      duration: 150,
      startFrom: START.wally,
      focusY: 0.52,
    },
    {
      clip: "clips/custom-reporting.webm",
      kicker: "Reporting Help",
      title: "Move from advice to a safe query workflow",
      duration: 120,
      startFrom: START.customReporting,
    },
    {
      clip: "clips/dashboard.webm",
      kicker: "Grounded Context",
      title: "Keep advice tied to the same operational dashboard",
      duration: 110,
      startFrom: START.dashboard,
    },
  ],
  end: {
    tagline: "Your data already knows the next priority.",
    duration: 90,
  },
}

export const FEED_ROSTER: ShortSpec = {
  hook: {
    lines: ["Feeding", "status at", "a glance."],
    accent: "Daily roster, overdue feeds and quick log actions",
    duration: 72,
  },
  scenes: [
    {
      clip: "clips/feed-roster.webm",
      kicker: "Feed Roster",
      title: "See overdue and upcoming feeds for animals in care",
      caption: "Each row keeps animal, carer, last feed and next due together",
      duration: 120,
      startFrom: START.feedRoster,
    },
    {
      clip: "clips/dashboard-widgets.webm",
      kicker: "Dashboard",
      title: "Bring feeding risk into the same daily view",
      duration: 120,
      startFrom: START.dashboardWidgets,
    },
    {
      clip: "clips/animal-detail.webm",
      kicker: "Animal Record",
      title: "Log care without losing the animal context",
      duration: 120,
      startFrom: START.animalDetail,
    },
  ],
  end: {
    tagline: "Care schedules stay visible to the whole team.",
    duration: 90,
  },
}

export const FEED_CALCULATORS: ShortSpec = {
  hook: {
    lines: ["Built-in", "care", "calculators."],
    accent: "Guideline tools for flying fox pups and macropod joeys",
    duration: 72,
  },
  scenes: [
    {
      clip: "clips/flying-fox-calculator.webm",
      kicker: "Flying Fox",
      title: "Estimate daily milk volume from age or forearm length",
      duration: 120,
      startFrom: START.flyingFox,
    },
    {
      clip: "clips/macropod-calculator.webm",
      kicker: "Macropod",
      title: "Calculate formula stage, feed volume and feeds per day",
      duration: 120,
      startFrom: START.macropod,
    },
    {
      clip: "clips/tools.webm",
      kicker: "Tools",
      title: "Keep field-friendly tools next to operational records",
      duration: 105,
      startFrom: START.tools,
    },
  ],
  end: {
    tagline: "Helpful numbers, right where carers need them.",
    duration: 90,
  },
}

export const ADMIN_CONTROL: ShortSpec = {
  hook: {
    lines: ["Control", "access and", "data setup."],
    accent: "Roles, species, assets, audit logs and organisation settings",
    duration: 72,
  },
  scenes: [
    {
      clip: "clips/admin-people.webm",
      kicker: "People",
      title: "Assign roles, profiles and species group access",
      duration: 120,
      startFrom: START.adminPeople,
    },
    {
      clip: "clips/admin-assets.webm",
      kicker: "Assets",
      title: "Track equipment and supplies used in wildlife care",
      duration: 120,
      startFrom: START.adminAssets,
    },
    {
      clip: "clips/admin-audit.webm",
      kicker: "Audit",
      title: "Keep an immutable record of important actions",
      duration: 110,
      startFrom: START.adminAudit,
    },
  ],
  end: {
    tagline: "Set the rules once, then let the work flow.",
    duration: 90,
  },
}

export const MEMBERSHIP_PAYMENTS: ShortSpec = {
  hook: {
    lines: ["Supporters", "and payments", "in the same app."],
    accent: "Membership tiers, supporter roster and receipt ledger",
    duration: 72,
  },
  scenes: [
    {
      clip: "clips/members.webm",
      kicker: "Members",
      title: "Manage supporters, portal status and membership tiers",
      duration: 110,
      startFrom: START.members,
    },
    {
      clip: "clips/payments.webm",
      kicker: "Payments",
      title: "Review donations, memberships, fees and receipts",
      duration: 100,
      startFrom: START.payments,
    },
    {
      clip: "clips/admin.webm",
      kicker: "Admin",
      title: "Keep fundraising tools beside operational admin",
      duration: 48,
      startFrom: 420,
    },
  ],
  end: {
    tagline: "Supporter data can live beside rescue operations.",
    duration: 90,
  },
}

export const ASSETS_AUDIT: ShortSpec = {
  hook: {
    lines: ["Assets and", "audit trails", "included."],
    accent: "Operational accountability without another system",
    duration: 72,
  },
  scenes: [
    {
      clip: "clips/admin-assets.webm",
      kicker: "Assets",
      title: "Know where cages, scales and field kits are assigned",
      duration: 120,
      startFrom: START.adminAssets,
    },
    {
      clip: "clips/admin-audit.webm",
      kicker: "Audit Log",
      title: "Review user, role, export and record-change history",
      duration: 110,
      startFrom: START.adminAudit,
    },
    {
      clip: "clips/compliance-overview.webm",
      kicker: "Compliance",
      title: "Use traceability to support readiness reporting",
      duration: 85,
      startFrom: START.complianceOverview,
    },
  ],
  end: {
    tagline: "Governance is part of the workflow.",
    duration: 90,
  },
}

export const DAILY_DASHBOARD: ShortSpec = {
  hook: {
    lines: ["Start the", "day with", "the right list."],
    accent: "Calls, feeds, reporting checks and saved widgets",
    duration: 72,
  },
  scenes: [
    {
      clip: "clips/dashboard.webm",
      kicker: "Morning View",
      title: "Open with compliance and risk already surfaced",
      duration: 140,
      startFrom: START.dashboard,
    },
    {
      clip: "clips/dashboard-widgets.webm",
      kicker: "Widgets",
      title: "Scan calls, feed status and saved report widgets",
      duration: 130,
      startFrom: START.dashboardWidgets,
    },
    {
      clip: "clips/feed-roster.webm",
      kicker: "Next Action",
      title: "Jump from a risk signal straight into the work",
      duration: 110,
      startFrom: START.feedRoster,
    },
  ],
  end: {
    tagline: "The dashboard is a work queue, not a vanity page.",
    duration: 90,
  },
}

export const QUICK_TOUR: ShortSpec = {
  hook: {
    lines: ["WildTrack360", "in thirty", "seconds."],
    accent: "A fast pass through the operational surface",
    duration: 72,
  },
  scenes: [
    {
      clip: "clips/dashboard.webm",
      kicker: "Dashboard",
      title: "Daily risk and readiness",
      duration: 90,
      startFrom: START.dashboard,
    },
    {
      clip: "clips/animals.webm",
      kicker: "Animals",
      title: "Searchable records in care",
      duration: 90,
      startFrom: START.animals,
    },
    {
      clip: "clips/register.webm",
      kicker: "Register",
      title: "Admission and outcome reporting",
      duration: 90,
      startFrom: START.register,
    },
    {
      clip: "clips/wally.webm",
      kicker: "Wally",
      title: "Context-aware AI assistance",
      duration: 90,
      startFrom: START.wally,
    },
  ],
  end: {
    tagline: "One workspace for rescue, care and reporting.",
    duration: 90,
  },
}
