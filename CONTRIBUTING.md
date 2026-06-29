# Contributing to WildTrack360

Thank you for your interest in contributing to WildTrack360! This guide will help you get started.

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/WildTrack360.git
   cd WildTrack360
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Set up the database** — see [DATABASE_SETUP.md](DATABASE_SETUP.md)
5. **Set up authentication** — see [CLERK_SETUP.md](CLERK_SETUP.md)
6. **Copy the environment template**:
   ```bash
   cp env.example .env.local
   ```
   Fill in your own API keys and database credentials.
7. **Run database migrations**:
   ```bash
   npm run db:migrate
   ```
8. **Start the development server**:
   ```bash
   npm run dev
   ```

## Development Workflow

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes
3. Ensure the build passes:
   ```bash
   npm run build
   ```
4. Commit your changes with a clear message:
   ```bash
   git commit -m "Add description of your change"
   ```
5. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
6. Open a Pull Request against `main`

## Code Style

- **TypeScript** is used throughout the project with strict mode enabled
- Follow existing patterns in the codebase
- Use meaningful variable and function names
- Avoid introducing `any` types — use proper interfaces and type definitions
- Do not leave `console.log` statements in committed code
- Keep components focused and reasonably sized

## Pull Request Guidelines

- Keep PRs focused on a single concern
- Provide a clear description of what the PR does and why
- Reference any related issues (e.g., "Fixes #42")
- Ensure the build passes before requesting review
- Be responsive to review feedback

## Reporting Bugs

Use the [GitHub Issues](https://github.com/yumaitau/WildTrack360/issues) page with the bug report template. Include:

- Steps to reproduce the issue
- Expected vs actual behavior
- Browser/OS information if relevant
- Screenshots if applicable

## Requesting Features

Use the [GitHub Issues](https://github.com/yumaitau/WildTrack360/issues) page with the feature request template. Describe:

- The problem you're trying to solve
- Your proposed solution
- Any alternatives you've considered

## Project Structure

```
src/
├── app/           # Next.js App Router pages and API routes
├── components/    # Reusable React components
│   └── ui/        # shadcn/ui base components
├── lib/           # Utilities, types, database functions, config
├── hooks/         # Custom React hooks
└── middleware.ts   # Clerk auth middleware
```

## API Documentation

The API is documented with an OpenAPI 3.1 spec generated from per-route Zod
contracts and rendered with [Scalar](https://scalar.com).

- **Browse it:** open `/api/docs` (the raw spec is at `/api/openapi`). Both routes
  are **open in development** and require **any authenticated session in production**
  (no admin role needed) — see `requireDocsAccess` in `src/lib/openapi-server/`.
- **Source of truth:** each route's request/response schemas live in a co-located
  `openapi.ts` beside its `route.ts`. The same schemas drive runtime validation,
  so the docs cannot drift from behaviour.

### Documenting a route

1. Create `openapi.ts` next to the `route.ts`. Import `z` from
   `@/lib/openapi/registry` (never `'zod'` directly) and `defineContract` from
   `@/lib/openapi/contract`. Define request (`params`/`query`/`body`) and
   `responses` schemas, then export a `defineContract({...})` per method. Keep
   this file pure — import only `zod` and the registry (no `server-only`, Clerk,
   Prisma, or `admin-guard`), or the CI generator will fail.
2. In `route.ts`, wrap each handler: `export const GET = route(contract, async ({ params, query, body }) => { ... })`.
   The wrapper validates the request (400 on bad input) and the response. Return
   `{ data, status? }` on success, or a raw `NextResponse` for early/auth returns.
3. Add a side-effect import of the new `openapi.ts` to `src/lib/openapi/manifest.ts`.
4. Run `npm run openapi:generate` (refresh `public/openapi.json`) and commit the updated spec.

### Drift gate

`npm run openapi:check` (run in CI) fails if any route lacks a contract, if a
contract isn't wired into the manifest, or if `public/openapi.json` is stale.
All routes are now contracted — the allowlist (`src/lib/openapi/route-allowlist.ts`)
is empty and must stay that way.

## License

By contributing to WildTrack360, you agree that your contributions will be licensed under the [MPL-2.0 License](LICENSE).
