# WildTrack360 - Wildlife Conservation Management System

WildTrack360 is a comprehensive wildlife conservation management application designed to help Australian wildlife care organisations track animals throughout their entire lifecycle, from initial admission to release or other outcomes. It currently supports ACT and NSW jurisdictions and is built for volunteer-driven organisations coordinating multiple carers.

## Features

- **Animal Lifecycle Management**: Track animals from admission through in-care, ready-for-release, released, deceased, transferred, or permanent-care statuses
- **Multi-tenant Architecture**: Organisation-level data isolation with subdomain routing
- **Role-Based Access Control (RBAC)**: Five-tier role hierarchy with 29 granular permissions
- **Species-Based Access Control (SBAC)**: Coordinators scoped to assigned species groups
- **Compliance & Regulatory**: Release checklists, hygiene logs, incident reports, transfers, permanent care applications, post-release monitoring, and preserved specimen tracking
- **NSW Annual Reporting**: Auto-generate compliance reports with data snapshots
- **Helpdesk & Intake**: Call log system with configurable lookups and Pindrop secure SMS location/photo sharing
- **Photo Management**: S3-backed photo documentation with gallery views
- **Carer Management**: Profiles, licensing, training records with expiry tracking, and workload dashboards
- **Asset Management**: Equipment tracking with status lifecycle
- **Audit Logging**: Immutable trail of all system actions
- **Growth Calculator**: Birth date estimation, growth charts with predicted vs actual weight curves, and weight-for-age tracking. Reference data for macropods, possums, and flying foxes from published scientific sources
- **Reporting & Export**: Dashboard analytics, custom report queries, Recharts visualisations, Excel and PDF export
- **SMS Notifications**: AWS SNS integration for carer notifications
- **Membership & Payments**: Member management, public join/donate flows, Square payments, receipts, and recurring subscriptions
- **Wally AI Assistant**: AWS Bedrock-backed workspace assistant grounded in product docs and organisation context
- **Email Notifications**: Resend-backed admin alerts and payment receipts
- **Error Monitoring**: Sentry integration for production error tracking
- **Maps & Weather**: Google Maps/Places, OpenStreetMap/Nominatim reverse geocoding, and Google Weather integration
- **Mobile Responsive**: Works on desktop, tablet, and mobile with dark/light theme support

## Architecture

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15 with TypeScript (App Router) |
| **Authentication** | Clerk for user and organisation management |
| **Authorisation** | Custom RBAC + Species-Based Access Control (SBAC) |
| **Database** | PostgreSQL with Prisma ORM |
| **Styling** | Tailwind CSS with shadcn/ui components |
| **Forms** | React Hook Form + Zod validation, TanStack React Form |
| **Tables** | TanStack React Table |
| **Charts** | Recharts |
| **File Storage** | AWS S3 |
| **SMS** | AWS SNS |
| **Email** | Resend |
| **Payments** | Square |
| **AI Assistant** | Vercel AI SDK with AWS Bedrock |
| **Monitoring** | Sentry |
| **Maps & Weather** | Google Maps/Places, OpenStreetMap/Nominatim, Google Weather API |
| **Export** | ExcelJS (spreadsheets), jsPDF (PDF) |
| **Testing** | Vitest |

## Prerequisites

- Node.js 18.18+ and npm
- PostgreSQL database (local, Docker, or cloud)
- Clerk account for authentication
- AWS account (optional, for S3 photo storage, SNS SMS, and Bedrock-powered Wally)
- Google Maps and Google Weather API keys (optional, for map/geocoding and weather features)
- Square developer account (optional, for memberships, donations, and payments)
- Resend account (optional, for transactional email)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yumaitau/WildTrack360.git
cd WildTrack360
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Database

#### Option A: Docker (Recommended for development)

```bash
# Start PostgreSQL and pgAdmin
docker-compose up -d

# The database will be available at localhost:5432
# pgAdmin will be available at http://localhost:8080
# If docker-compose.override.yml is active, use the ports defined there instead.
```

#### Option B: Local PostgreSQL

```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Create database
createdb wildtrack360
```

#### Option C: Cloud Database

Use services like Supabase, Neon, or Railway for cloud-hosted PostgreSQL.

### 4. Configure Environment Variables

```bash
# Copy environment template
cp env.example .env.local
```

Key variables to configure:

```env
# App and tenant routing
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000

# Organisation defaults
NEXT_PUBLIC_JURISDICTION=ACT
NEXT_PUBLIC_ORGANIZATION_NAME=WildTrack360
NEXT_PUBLIC_ORGANIZATION_CONTACT=contact@wildtrack360.com.au
NEXT_PUBLIC_ORGANIZATION_LOGO=/act-logo.png

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/wildtrack360?schema=public

# Optional: S3 photo/document storage
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_REGION=ap-southeast-2
S3_BUCKET_NAME=wildtrack360

# Optional: AWS SNS SMS
AWS_SNS_REGION=ap-southeast-2
AWS_SNS_ACCESS_KEY_ID=...
AWS_SNS_SECRET_ACCESS_KEY=...
SMS_SENDER_ID=WildTrack

# Optional: AWS Bedrock (Wally)
AWS_REGION=ap-southeast-2
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
BEDROCK_MODEL_ID=au.anthropic.claude-haiku-4-5-20251001-v1:0

# Optional: Maps and weather
NEXT_PUBLIC_GOOGLE_MAPS_KEY=...
GOOGLE_WEATHER_API_KEY=...

# Optional: Email
RESEND_API_KEY=...
RESEND_FROM_EMAIL="WildTrack360 <notifications@your-domain.example>"
ADMIN_NOTIFICATION_UNSUBSCRIBE_URL=https://your-domain.example/admin/notifications

# Optional: Square payments
SQUARE_ENVIRONMENT=sandbox
SQUARE_APPLICATION_ID=...
NEXT_PUBLIC_SQUARE_APPLICATION_ID=...
SQUARE_APPLICATION_SECRET=...
SQUARE_WEBHOOK_SIGNATURE_KEY=...
SQUARE_WEBHOOK_NOTIFICATION_URL=https://your-domain.example/api/square/webhook
SQUARE_OAUTH_REDIRECT_URL=https://your-domain.example/api/square/oauth/callback
ENCRYPTION_KEY=...

# Optional: Sentry
NEXT_PUBLIC_SENTRY_DSN=...
NEXT_PUBLIC_SENTRY_ORG=...
NEXT_PUBLIC_SENTRY_PROJECT=...

# Optional: scheduled jobs
CRON_SECRET=...
```

### 5. Set Up Clerk Authentication

1. Create an account at [clerk.com](https://clerk.com)
2. Create a new application
3. Get your API keys and update `.env.local`
4. Configure sign-in and sign-up URLs

### 6. Initialise Database

```bash
# Generate Prisma client
npx prisma generate

# Apply existing migrations
npm run db:migrate

# (Optional) Seed sample data
npm run db:seed

# (Optional) Open Prisma Studio to view database
npx prisma studio
```

### 7. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your application.

## NPM Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Production build (generates Prisma client + Next.js build)
npm start                # Start production server
npm run prod_start       # Run production migration + start server

# Code Quality
npm run lint             # ESLint
npm run format           # Prettier format
npm run format:check     # Check formatting
npm run typecheck        # TypeScript type checking

# Testing
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode

# Database
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Apply/create development migrations
npm run db:migrate:prod  # Deploy migrations to production
npm run db:seed          # Seed sample data
npm run db:studio        # Open Prisma Studio
npm run db:reset         # Reset database (destructive)

# Demo, media, and payment maintenance
npm run db:seed:screenshots  # Seed deterministic screenshot/demo data
npm run record:clips         # Record product clips for marketing videos
npm run charge-due           # Charge due recurring subscriptions
npm run refresh-tokens       # Refresh Square OAuth tokens
```

## Database Schema

WildTrack360 uses a comprehensive database schema with the following key models:

**Core:**
- **Animal**: Wildlife records with lifecycle status, location, species, and jurisdiction-specific fields
- **Record**: Activity logs (feeding, medical, behaviour, weight, release, etc.)
- **Photo**: Image documentation with S3 URLs
- **Species**: Species catalogue with care requirements
- **AnimalReminder**: Per-animal reminders and due dates

**People & Roles:**
- **CarerProfile**: Carer information, licences, specialties
- **CarerTraining**: Training certificates with expiry tracking
- **OrgMember**: User-to-organisation role assignments
- **SpeciesGroup**: Named collections of species (e.g. "Macropods", "Bats")
- **CoordinatorSpeciesAssignment**: Links coordinators to species groups

**Compliance:**
- **ReleaseChecklist**: Pre-release fitness assessments
- **HygieneLog**: Daily cleaning and disinfection checklists
- **IncidentReport**: Incident tracking with severity levels
- **AnimalTransfer**: Inter-carer, inter-org, and vet transfer records
- **PermanentCareApplication / PermanentCareApproval**: Full permanent care workflow
- **PostReleaseMonitoring**: Post-release sighting observations
- **PreservedSpecimen**: Specimen registration and tracking

**Helpdesk:**
- **CallLog**: Incoming call records with status tracking
- **PindropSession**: Secure one-time SMS links for location/photo sharing
- **CallLogReason, CallLogReferrer, CallLogAction, CallLogOutcome**: Organisation-configurable lookups

**Growth:**
- **SpeciesGrowthReference**: Expected weight and body measurements by age, per species and sex. Sourced from published scientific data
- **GrowthMeasurement**: Per-animal dated measurements (weight, head/ear/arm/leg/foot/tail/body/wing lengths)

**Admin:**
- **Asset**: Equipment tracking with status lifecycle
- **AuditLog**: Immutable action trail
- **NSWReportMetadata**: Annual report snapshots
- **SavedReportQuery**: Validated custom report queries and dashboard widgets
- **AdminNotificationLog / AdminNotificationDismissal**: Admin alert delivery and dismissal state
- **WallyUsageSummary**: Daily AI assistant usage counts

**Membership & Payments:**
- **Member / MembershipTier / Membership**: Member profiles, tier configuration, and active membership periods
- **Payment / Donation / RecurringSubscription**: Square-backed payments, donations, and recurring billing
- **SquareConnection / SquareEvent / SquareOAuthState**: Per-organisation Square OAuth, webhook idempotency, and OAuth state
- **FormTemplate**: Custom member fields
- **OrgFeatureFlag**: Per-organisation feature rollout switches

All data is isolated by organisation for security and privacy.

## Role-Based Access Control (RBAC)

WildTrack360 uses a custom five-tier RBAC system that mirrors the real-world structure of Australian wildlife care organisations (Committee > Species Coordinators > Carers).

### Role Hierarchy

| Role | Rank | Description |
|------|------|-------------|
| **ADMIN** | 3 | Committee / management. Full access to all animals, users, settings, and reports. |
| **COORDINATOR_ALL** | 2 | Senior coordinator. Same as COORDINATOR but can see all animals in the organisation. |
| **COORDINATOR** | 2 | Species coordinator. Manages animals within assigned species groups. |
| **CARER_ALL** | 1 | Senior carer. Same as CARER but can view all animals in the organisation. |
| **CARER** | 1 | Frontline volunteer. Can only view and edit animals assigned to them. |

### Permission Matrix

| Permission | ADMIN | COORDINATOR_ALL | COORDINATOR | CARER_ALL | CARER |
|---|:---:|:---:|:---:|:---:|:---:|
| `animal:view_all` | Yes | Yes | | Yes | |
| `animal:view_species_group` | Yes | Yes | Yes | | |
| `animal:view_own` | Yes | Yes | Yes | Yes | Yes |
| `animal:create` | Yes | Yes | Yes | | |
| `animal:assign` | Yes | Yes | Yes | | |
| `animal:edit_any` | Yes | Yes | Yes | | |
| `animal:edit_own` | Yes | Yes | Yes | | Yes |
| `animal:delete` | Yes | | | | |
| `user:manage` | Yes | | | | |
| `species_group:manage` | Yes | | | | |
| `coordinator:assign` | Yes | | | | |
| `report:view_org` | Yes | | | | |
| `report:view_species` | Yes | Yes | Yes | | |
| `report:export` | Yes | Yes | Yes | | |
| `settings:manage` | Yes | | | | |
| `carer:view_workload` | Yes | Yes | Yes | | |
| `reminder:create` | Yes | Yes | Yes | Yes | Yes |
| `reminder:delete_any` | Yes | | | | |
| `compliance:draft_permanent_care` | Yes | Yes | Yes | Yes | Yes |
| `compliance:submit_permanent_care` | Yes | Yes | Yes | | |
| `compliance:approve_permanent_care` | Yes | | | | |
| `compliance:manage_transfers` | Yes | Yes | Yes | | |
| `compliance:override_validation` | Yes | | | | |
| `compliance:export_registers` | Yes | | | | |
| `compliance:manage_post_release` | Yes | Yes | Yes | | |
| `member:view_all` | Yes | Yes | | | |
| `member:manage` | Yes | | | | |
| `membership:configure` | Yes | | | | |
| `donation:view` | Yes | Yes | | | |

### How to Configure Roles

1. Navigate to **Admin > People** (ADMIN only).
2. Select a user from the org member list.
3. Choose their role.
4. Click save. The role takes effect immediately.

> The system prevents demoting the last ADMIN in an organisation.

### RBAC API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/rbac/my-role` | Any authenticated | Get your own role and species assignments |
| GET | `/api/rbac/roles` | `user:manage` | List all role assignments for the org |
| POST | `/api/rbac/roles` | `user:manage` | Assign a role: `{ targetUserId, role }` |
| POST | `/api/rbac/provision` | Clerk org:admin only | Self-provision during migration |

## Species-Based Access Control (SBAC)

SBAC extends RBAC by scoping **COORDINATOR** access to specific species. Instead of seeing all animals, coordinators only see animals whose species falls within their assigned species groups.

### How It Works

1. **Create Species Groups** (Admin > Species Groups):
   - e.g. "Macropods" containing `Eastern Grey Kangaroo`, `Red Kangaroo`, `Wallaroo`
   - e.g. "Bats" containing `Grey-headed Flying Fox`, `Little Red Flying Fox`

2. **Assign Coordinators** to species groups:
   - A coordinator assigned to "Macropods" can see all kangaroo and wallaroo animals.
   - A coordinator can be assigned to multiple species groups.
   - Coordinators can also always see animals directly assigned to them.

3. **Filtering is automatic**:
   - The home page, API endpoints, and SSR data all respect SBAC filtering.
   - Species names are matched case-insensitively.

### Species Group API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/rbac/species-groups` | Any authenticated | List all species groups |
| POST | `/api/rbac/species-groups` | `species_group:manage` | Create a species group |
| PATCH | `/api/rbac/species-groups/[id]` | `species_group:manage` | Update a species group |
| DELETE | `/api/rbac/species-groups/[id]` | `species_group:manage` | Delete a species group |
| POST | `/api/rbac/coordinator-assignments` | `coordinator:assign` | Assign coordinator to group |
| DELETE | `/api/rbac/coordinator-assignments` | `coordinator:assign` | Remove coordinator from group |

### Data Visibility Summary

| Role | Animals Visible | Reports |
|------|-----------------|---------|
| **ADMIN** | All animals in the organisation | Full org-wide reports |
| **COORDINATOR_ALL** | All animals in the organisation | Species-scoped reports |
| **COORDINATOR** | Animals in assigned species groups + animals assigned to them | Species-scoped reports |
| **CARER_ALL** | All animals in the organisation (read-only) | None |
| **CARER** | Only animals assigned to them | None |

## Migration from Clerk Roles

When existing users who only have Clerk roles (`org:admin` / `org:member`) log in for the first time after RBAC is enabled, they are redirected to `/setup-role`:

- **Clerk `org:admin` users** see a button to self-provision as ADMIN in the new system. This calls `POST /api/rbac/provision` which creates their `OrgMember` record.
- **Clerk `org:member` users** see a message asking them to contact their admin. They cannot access the application until an admin assigns their role.

Once an `OrgMember` record exists, the Clerk fallback is never used again for that user.

### Migration Steps for Existing Organisations

1. Deploy the RBAC update.
2. The first `org:admin` user to log in clicks "Activate Admin Role" on the setup page.
3. That admin then goes to **Admin > People** and assigns roles to all other org members.
4. All users can now access the app with their new roles.

## Testing

WildTrack360 uses [Vitest](https://vitest.dev/) for unit testing.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Test Coverage

Tests cover the following areas:

- **RBAC permission matrix** -- role permissions across all 5 roles
- **Role hierarchy** -- `hasMinimumRole` checks (ADMIN > COORDINATOR_ALL = COORDINATOR > CARER_ALL = CARER)
- **`getUserRole`** -- returns role from OrgMember or falls back to CARER
- **`requirePermission` / `requireMinimumRole`** -- throws `Forbidden` when unauthorised
- **SBAC species access** -- `getAuthorisedSpecies` and `canAccessAnimal` with case-insensitive matching
- **Last-admin guard** -- prevents demoting the only ADMIN
- **Cross-tenant protection** -- species group update/delete scoped by orgId
- **Coordinator assignment** -- validates org ownership for both member and group
- **Mass assignment protection** -- field allowlisting for animal create/update
- **Cross-tenant animal deletion** -- org-scoped deletion
- **Clerk fallback** -- `isOrgAdmin` respects RBAC demotion, only falls back when no OrgMember exists
- **Growth calculator** -- interpolation, WFA calculation, birth date estimation, field relevance by species type

## Authentication & Security

- **Clerk Integration**: Authentication with organisation and multi-tenant support
- **Multi-tenant**: All database operations scoped by organisation ID
- **Custom RBAC**: Five-tier role system with 29 granular permissions
- **SBAC**: Species-scoped access for coordinators
- **Field Allowlisting**: Mass assignment protection on animal and species group mutations
- **Cross-tenant Guards**: All update/delete operations verify org ownership
- **Secure API**: Protected routes with Clerk middleware + RBAC permission checks
- **Audit Trail**: Immutable logging of all create, update, and delete actions

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Docker

```bash
docker build -t wildtrack360 .
docker run -p 3000:3000 wildtrack360
```

### Other Platforms

- **Railway**: Full-stack deployment with database
- **Google Cloud**: App Hosting configuration included (`apphosting.yaml`)
- **AWS**: EC2 with RDS for database

## Documentation

- [Database Setup Guide](DATABASE_SETUP.md)
- [Clerk Authentication Setup](CLERK_SETUP.md)
- [RBAC & Species Access Admin Guide](docs/admin-guide-rbac-and-species-access.md)
- [Square Payments Guide](docs/square-payments.md)
- [Project Blueprint](docs/blueprint.md)

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

In short: fork the repo, create a feature branch, make your changes, ensure `npm run build` passes, and open a Pull Request.

## License

This project is licensed under the Mozilla Public License 2.0 (MPL-2.0) - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Components from [shadcn/ui](https://ui.shadcn.com/)
- Authentication by [Clerk](https://clerk.com/)
- Database powered by [Prisma](https://www.prisma.io/)
- Charts by [Recharts](https://recharts.org/)
- Error monitoring by [Sentry](https://sentry.io/)

---

**WildTrack360** - Empowering wildlife conservation through technology.
