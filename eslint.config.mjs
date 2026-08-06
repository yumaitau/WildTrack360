import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Warn on any usage to encourage proper typing
      "@typescript-eslint/no-explicit-any": "warn",
      // Warn on unused variables (allow underscore prefix for intentionally unused)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Issue #56: tenant resolution (ORG_SOURCE) lives in @/lib/clerk-server —
    // importing auth/clerkClient straight from Clerk would silently bypass the
    // db-mode subdomain→membership orgId override.
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      // The shim itself.
      "src/lib/clerk-server.ts",
      // clerkMiddleware runs on the edge (no Prisma) — auth/clerkClient still banned there.
      "src/middleware.ts",
      // OAuth bearer-token auth (acceptsToken: 'oauth_token'), never session-based.
      "src/app/mcp/route.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@clerk/nextjs/server",
              importNames: ["auth", "clerkClient", "currentUser"],
              message:
                "Import auth/clerkClient/currentUser from '@/lib/clerk-server' so ORG_SOURCE tenant resolution applies (issue #56).",
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [".next/", "node_modules/", "prisma/migrations/"],
  },
];

export default eslintConfig;
