-- Add call log support: main call_logs table, status enum, and 4 configurable lookup tables
-- All lookup tables are org-scoped for multi-tenancy

-- Create CallLogStatus enum
DO $$ BEGIN
  CREATE TYPE "CallLogStatus" AS ENUM ('OPEN', 'CLOSED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create call_logs table
CREATE TABLE IF NOT EXISTS call_logs (
  id TEXT PRIMARY KEY,
  date_time TIMESTAMP(3) NOT NULL,
  status "CallLogStatus" NOT NULL DEFAULT 'OPEN',

  -- Caller details
  caller_name TEXT NOT NULL,
  caller_phone TEXT,
  caller_email TEXT,

  -- Species involved
  species TEXT,

  -- Location / GPS
  location TEXT,
  coordinates JSONB,
  suburb TEXT,
  postcode TEXT,

  -- Notes
  notes TEXT,

  -- Lookup values
  reason TEXT,
  referrer TEXT,
  action TEXT,
  outcome TEXT,

  -- Taken by (auto-captured from Clerk auth)
  taken_by_user_id TEXT NOT NULL,
  taken_by_user_name TEXT,

  -- Assigned to
  assigned_to_user_id TEXT,
  assigned_to_user_name TEXT,

  -- Link to Animal (optional FK)
  animal_id TEXT REFERENCES animals(id) ON DELETE SET NULL,

  -- Organisation scoping
  "clerkOrganizationId" TEXT NOT NULL,

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS call_logs_org_idx ON call_logs ("clerkOrganizationId");
CREATE INDEX IF NOT EXISTS call_logs_status_idx ON call_logs (status);
CREATE INDEX IF NOT EXISTS call_logs_date_idx ON call_logs (date_time);

-- Create call_log_reasons lookup table
CREATE TABLE IF NOT EXISTS call_log_reasons (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  "clerkOrganizationId" TEXT NOT NULL,
  UNIQUE (label, "clerkOrganizationId")
);

CREATE INDEX IF NOT EXISTS call_log_reasons_org_idx ON call_log_reasons ("clerkOrganizationId");

-- Create call_log_referrers lookup table
CREATE TABLE IF NOT EXISTS call_log_referrers (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  "clerkOrganizationId" TEXT NOT NULL,
  UNIQUE (label, "clerkOrganizationId")
);

CREATE INDEX IF NOT EXISTS call_log_referrers_org_idx ON call_log_referrers ("clerkOrganizationId");

-- Create call_log_actions lookup table
CREATE TABLE IF NOT EXISTS call_log_actions (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  "clerkOrganizationId" TEXT NOT NULL,
  UNIQUE (label, "clerkOrganizationId")
);

CREATE INDEX IF NOT EXISTS call_log_actions_org_idx ON call_log_actions ("clerkOrganizationId");

-- Create call_log_outcomes lookup table
CREATE TABLE IF NOT EXISTS call_log_outcomes (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  "clerkOrganizationId" TEXT NOT NULL,
  UNIQUE (label, "clerkOrganizationId")
);

CREATE INDEX IF NOT EXISTS call_log_outcomes_org_idx ON call_log_outcomes ("clerkOrganizationId");
