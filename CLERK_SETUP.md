# Clerk Authentication Setup for WildTrack360

This project now includes Clerk authentication to protect all routes and ensure only authenticated users can access the application.

## Setup Instructions

### 1. Create a Clerk Account
1. Go to [clerk.com](https://clerk.com) and sign up for an account
2. Create a new application
3. Choose "Next.js" as your framework

### 2. Get Your API Keys
1. In your Clerk dashboard, go to "API Keys"
2. Copy your `Publishable Key` and `Secret Key`

### 3. Configure Environment Variables
1. Copy `env.example` to `.env.local`
2. Update the Clerk environment variables:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

### 4. Configure Clerk Application
1. In your Clerk dashboard, go to "User & Authentication" → "Email, Phone, Username"
2. Enable the authentication methods you want (email, username, etc.)
3. Go to "Paths" and ensure the sign-in and sign-up paths match your configuration

### 5. Test the Application
1. Start your development server: `npm run dev`
2. Visit the application - you should be redirected to sign-in
3. Create an account or sign in
4. You should now have access to the protected routes

## How It Works

### Authentication Flow
1. **Unauthenticated users** are redirected to `/sign-in`
2. **New users** can sign up at `/sign-up`
3. **Authenticated users** can access all protected routes
4. **Sign out** is available in the header navigation

### Protected Routes
- All application routes are protected by default
- Only `/sign-in` and `/sign-up` are publicly accessible
- Static files and API routes are excluded from protection

### Components Used
- `SignedIn` - Shows content only to authenticated users
- `SignedOut` - Shows content only to unauthenticated users
- `SignInButton` - Button that opens the sign-in modal
- `SignUpButton` - Button that opens the sign-up modal
- `SignOutButton` - Button that signs out the current user
- `useUser` - Hook to access current user information

## Customization

### Styling
- Clerk components use your existing Tailwind CSS classes
- You can customize the appearance in your Clerk dashboard
- The sign-in and sign-up pages use your application's theme

### User Roles
- The application currently uses a hardcoded admin role
- You can extend this by using Clerk's user metadata or custom claims
- User information is available via the `useUser` hook

### Additional Features
- Multi-factor authentication
- Social login providers
- User management
- Organization support
- Webhooks for user events

## Organisations: database-managed (issue #56)

Clerk is an **authentication-only** provider for WildTrack360: sessions, JWTs,
MFA, and the sign-in/up UI. Organisation identity, membership, roles (RBAC),
and species access (SBAC) live in Postgres (`organisations`, `users`,
`org_members` tables). The Clerk **Organizations** feature is only needed
while running in legacy mode.

The migration is driven **per organisation** by the `DB_ORG_SOURCE` feature
flag, toggled from the **WildTrack360-Admin panel** (the same
`org_feature_flags` mechanism as `MEMBERSHIP_PLATFORM` etc.):

- **Flag off** (default) — legacy behaviour for that org. Clerk Organizations
  resolve the tenant; the DB tables are kept as a mirror by the webhook +
  backfill.
- **Flag on** — Postgres is authoritative for that org. Its tenant resolves
  from the request subdomain (`host → Organisation.slug → OrgMember`),
  invitations are Clerk *application-level* invitations (no org membership,
  no seat caps), and no Clerk Organization API is called for it at runtime.
  Rollback = turn the flag off in the admin panel.

Orgs created after the migration (`npm run orgs:create`, `worg_` id prefix)
are always database-managed — they have no Clerk counterpart.

The `ORG_SOURCE` env var remains as a deployment-wide override:
`ORG_SOURCE=db` forces every org to database-managed resolution (the final
state once all orgs have migrated and Clerk Organizations is disabled).

### Webhook (keep the mirror fresh)

1. In the Clerk Dashboard go to **Webhooks** → **Add endpoint** and point it at
   `https://<your-root-domain>/api/webhooks/clerk`.
2. Subscribe to: `user.created`, `user.updated`, `user.deleted`,
   `organization.created`, `organization.updated`,
   `organizationMembership.created`, `organizationMembership.deleted`.
3. Copy the signing secret into `CLERK_WEBHOOK_SIGNING_SECRET`.

### Migration runbook (clerk → db, org by org)

1. `npm run orgs:snapshot` — snapshot Clerk data to JSON (audit trail).
2. `npm run orgs:backfill -- --apply` — populate/refresh the DB mirror
   (idempotent; preserves existing `OrgMember` roles).
3. `npm run orgs:drift` — repeat until clean for several days (cron/CI).
   Orgs already flipped are skipped automatically.
4. In the **WildTrack360-Admin panel**, enable the `DB_ORG_SOURCE` feature
   flag for a pilot organisation; verify sign-in, roster, invites, and
   role management on its subdomain. Rollback = turn the flag off.
5. Repeat per organisation until all orgs are flipped, then set
   `ORG_SOURCE=db` as the deployment-wide backstop.
6. Once stable: remove the `org_url` JWT claim from the Clerk JWT template,
   and later disable the Organizations feature in Clerk (after a final
   snapshot). New organisations are created with `npm run orgs:create`.

> **Admin app coordination:** `DB_ORG_SOURCE` must be added to the feature
> list in the WildTrack360-Admin app so it can be toggled there — it writes
> the same `org_feature_flags` rows this app reads.

## MCP Server (AI chat app access)

WildTrack360 ships an MCP server at `/mcp` secured by Clerk OAuth, so Claude, ChatGPT, and other MCP clients can act on a user's behalf. To enable it, toggle on **Dynamic client registration** under **OAuth applications** in the Clerk Dashboard. See [docs/mcp-server.md](docs/mcp-server.md) for the tool list and client setup.

## Troubleshooting

### Common Issues
1. **Environment variables not loaded** - Ensure `.env.local` is in your project root
2. **Authentication not working** - Check that your API keys are correct
3. **Redirect loops** - Verify your sign-in/sign-up URLs match Clerk configuration

### Support
- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Discord](https://discord.gg/clerk)
- [GitHub Issues](https://github.com/clerkinc/clerk-nextjs/issues)
