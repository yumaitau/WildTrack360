# WildTrack360 - Wildlife Conservation Management System

WildTrack360 is a comprehensive wildlife conservation management application designed to help wildlife carers track animals throughout their entire lifecycle, from initial admission to release or unfortunate outcomes.

## 🚀 Features

- **Animal Management**: Complete lifecycle tracking from admission to release
- **Multi-tenant Architecture**: Support for multiple organizations with data isolation
- **User Authentication**: Secure authentication with Clerk
- **Compliance Tracking**: Built-in compliance management for different jurisdictions
- **Photo Management**: Comprehensive photo documentation system
- **Reporting**: Detailed analytics and reporting capabilities
- **Mobile Responsive**: Works seamlessly on all devices

## 🏗️ Architecture

- **Frontend**: Next.js 14 with TypeScript
- **Authentication**: Clerk for user and organization management
- **Authorisation**: Custom RBAC + Species-Based Access Control (SBAC)
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS with shadcn/ui components
- **Charts**: Recharts for data visualization
- **Maps**: OpenStreetMap integration for location services

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (local, Docker, or cloud)
- Clerk account for authentication

## 🛠️ Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/wildtrack360.git
cd wildtrack360
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

# Update with your values
# - Clerk authentication keys
# - Database connection string
# - Organization details
```

### 5. Set Up Clerk Authentication

1. Create an account at [clerk.com](https://clerk.com)
2. Create a new application
3. Get your API keys and update `.env.local`
4. Configure sign-in and sign-up URLs

### 6. Initialize Database

```bash
# Generate Prisma client
npx prisma generate

# Create and apply migrations
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to view database
npx prisma studio
```

### 7. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your application.

## 🗄️ Database Schema

WildTrack360 uses a comprehensive database schema with the following key models:

- **Animals**: Core wildlife records with status tracking
- **Records**: Detailed activity logs (feeding, medical, behavior)
- **Photos**: Photo documentation system
- **Species**: Species catalog with care requirements
- **Carers**: Wildlife carer information and licensing
- **Compliance**: Hygiene logs, incident reports, release checklists
- **Assets**: Equipment and asset management
- **OrgMember**: User-to-organisation role assignments (ADMIN, COORDINATOR, CARER)
- **SpeciesGroup**: Named collections of species (e.g. "Macropods", "Bats")
- **CoordinatorSpeciesAssignment**: Links coordinators to the species groups they manage

All data is properly isolated by organization and user for security and privacy.

## 🔐 Role-Based Access Control (RBAC)

WildTrack360 uses a custom three-tier RBAC system that mirrors the real-world structure of Australian wildlife care organisations (Committee > Species Coordinators > Carers). This replaces Clerk's built-in `org:admin` / `org:member` roles with a more granular model.

### Role Hierarchy

| Role | Rank | Description |
|------|------|-------------|
| **ADMIN** | 3 | Committee / management. Full access to all animals, users, settings, and reports. |
| **COORDINATOR** | 2 | Species coordinator. Manages animals within assigned species groups and can view workloads. |
| **CARER** | 1 | Frontline volunteer. Can only view and edit animals assigned to them. |

### Permission Matrix

| Permission | ADMIN | COORDINATOR | CARER |
|---|:---:|:---:|:---:|
| `animal:view_all` | Yes | | |
| `animal:view_species_group` | Yes | Yes | |
| `animal:view_own` | Yes | Yes | Yes |
| `animal:create` | Yes | Yes | |
| `animal:assign` | Yes | Yes | |
| `animal:edit_any` | Yes | Yes | |
| `animal:edit_own` | Yes | Yes | Yes |
| `animal:delete` | Yes | | |
| `user:manage` | Yes | | |
| `species_group:manage` | Yes | | |
| `coordinator:assign` | Yes | | |
| `report:view_org` | Yes | | |
| `report:view_species` | Yes | Yes | |
| `report:export` | Yes | Yes | |
| `settings:manage` | Yes | | |
| `carer:view_workload` | Yes | Yes | |

### How to Configure Roles

1. **Navigate to Admin > Roles** (ADMIN only).
2. Select a user from the org member list.
3. Choose their role: ADMIN, COORDINATOR, or CARER.
4. Click save. The role takes effect immediately.

> The system prevents demoting the last ADMIN in an organisation.

### API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/rbac/my-role` | Any authenticated | Get your own role and species assignments |
| GET | `/api/rbac/roles` | `user:manage` | List all role assignments for the org |
| POST | `/api/rbac/roles` | `user:manage` | Assign a role: `{ targetUserId, role }` |
| POST | `/api/rbac/provision` | Clerk org:admin only | Self-provision during migration (see below) |

## 🌿 Species-Based Access Control (SBAC)

SBAC extends RBAC by scoping **COORDINATOR** access to specific species. Instead of seeing all animals, coordinators only see animals whose species falls within their assigned species groups.

### How It Works

1. **Create Species Groups** (Admin > Species Groups):
   - e.g. "Macropods" containing `Eastern Grey Kangaroo`, `Red Kangaroo`, `Wallaroo`
   - e.g. "Bats" containing `Grey-headed Flying Fox`, `Little Red Flying Fox`
   - e.g. "Koalas & Wombats" containing `Koala`, `Common Wombat`

2. **Assign Coordinators** to species groups:
   - A coordinator assigned to "Macropods" can see all kangaroo and wallaroo animals.
   - A coordinator can be assigned to multiple species groups.
   - Coordinators can also always see animals directly assigned to them (regardless of species).

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
| **COORDINATOR** | Animals in assigned species groups + animals assigned to them | Species-scoped reports |
| **CARER** | Only animals assigned to them | None |

## 🔄 Migration from Clerk Roles

When existing users who only have Clerk roles (`org:admin` / `org:member`) log in for the first time after RBAC is enabled, they are redirected to `/setup-role`:

- **Clerk `org:admin` users** see a button to self-provision as ADMIN in the new system. This calls `POST /api/rbac/provision` which creates their `OrgMember` record.
- **Clerk `org:member` users** see a message asking them to contact their admin. They cannot access the application until an admin assigns their role.

Once an `OrgMember` record exists, the Clerk fallback is never used again for that user. This ensures that intentional RBAC demotions (e.g. removing someone's ADMIN role) cannot be bypassed via their Clerk role.

### Migration Steps for Existing Organisations

1. Deploy the RBAC update.
2. The first `org:admin` user to log in clicks "Activate Admin Role" on the setup page.
3. That admin then goes to **Admin > Roles** and assigns roles to all other org members.
4. All users can now access the app with their new roles.

## 🧪 Testing

WildTrack360 uses [Vitest](https://vitest.dev/) for unit testing.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Test Coverage

Tests cover the following areas:

- **RBAC permission matrix** — all 16 permissions across all 3 roles
- **Role hierarchy** — `hasMinimumRole` checks (ADMIN > COORDINATOR > CARER)
- **`getUserRole`** — returns role from OrgMember or falls back to CARER
- **`requirePermission` / `requireMinimumRole`** — throws `Forbidden` when unauthorised
- **SBAC species access** — `getAuthorisedSpecies` and `canAccessAnimal` with case-insensitive matching
- **Last-admin guard** — prevents demoting the only ADMIN
- **Cross-tenant protection** — species group update/delete scoped by orgId
- **Coordinator assignment** — validates org ownership for both member and group
- **Mass assignment protection** — field allowlisting for animal create/update
- **Cross-tenant animal deletion** — org-scoped deletion
- **Clerk fallback** — `isOrgAdmin` respects RBAC demotion, only falls back when no OrgMember exists

## 🔒 Authentication & Security

- **Clerk Integration**: Professional authentication with organization support
- **Multi-tenant**: All database operations scoped by organisation ID
- **Custom RBAC**: Three-tier role system with 16 granular permissions
- **SBAC**: Species-scoped access for coordinators
- **Field Allowlisting**: Mass assignment protection on animal and species group mutations
- **Cross-tenant Guards**: All update/delete operations verify org ownership
- **Secure API**: Protected routes with Clerk middleware + RBAC permission checks
- **Data Privacy**: Carers can only see animals assigned to them

## 📱 User Interface

- **Modern Design**: Clean, intuitive interface built with shadcn/ui
- **Responsive Layout**: Works perfectly on desktop, tablet, and mobile
- **Dark Mode**: Built-in dark/light theme support
- **Accessibility**: WCAG compliant design patterns
- **Performance**: Optimized for fast loading and smooth interactions

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms

- **Netlify**: Static site hosting
- **Railway**: Full-stack deployment with database
- **AWS**: EC2 with RDS for database
- **Docker**: Containerized deployment

## 📚 Documentation

- [Database Setup Guide](DATABASE_SETUP.md)
- [Clerk Authentication Setup](CLERK_SETUP.md)
- [API Documentation](docs/api.md)
- [User Guide](docs/user-guide.md)

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

In short: fork the repo, create a feature branch, make your changes, ensure `npm run build` passes, and open a Pull Request.

## 📄 License

This project is licensed under the Mozilla Public License 2.0 (MPL-2.0) - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the docs folder and setup guides
- **Issues**: Report bugs and feature requests via GitHub Issues
- **Discussions**: Join community discussions on GitHub Discussions

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Components from [shadcn/ui](https://ui.shadcn.com/)
- Authentication by [Clerk](https://clerk.com/)
- Database powered by [Prisma](https://www.prisma.io/)

---

**WildTrack360** - Empowering wildlife conservation through technology.