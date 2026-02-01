# Contributing to WildTrack360

Thank you for your interest in contributing to WildTrack360! This guide will help you get started.

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/WildHub.git
   cd WildHub
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

Use the [GitHub Issues](https://github.com/yumaitau/WildHub/issues) page with the bug report template. Include:

- Steps to reproduce the issue
- Expected vs actual behavior
- Browser/OS information if relevant
- Screenshots if applicable

## Requesting Features

Use the [GitHub Issues](https://github.com/yumaitau/WildHub/issues) page with the feature request template. Describe:

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

## License

By contributing to WildTrack360, you agree that your contributions will be licensed under the [MPL-2.0 License](LICENSE).
