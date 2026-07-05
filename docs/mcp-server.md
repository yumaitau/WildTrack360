# MCP Server

WildTrack360 exposes a [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server so LLM chat apps — Claude, ChatGPT, Cursor, and any other MCP-capable client — can securely read and act on your organisation's data on your behalf.

- **Endpoint:** `POST https://<your-deployment>/mcp` (Streamable HTTP transport; SSE is not supported)
- **Auth:** Clerk OAuth 2.0 (RFC 9728 protected-resource discovery + dynamic client registration). Clients authenticate as *you*: every tool call is scoped to your Clerk user, your organisation, and your WildTrack360 RBAC role — exactly the same visibility rules as the web app and REST API.

## One-time Clerk setup

MCP clients register themselves with Clerk during the OAuth flow, which requires dynamic client registration:

1. Open the Clerk Dashboard → [**OAuth applications**](https://dashboard.clerk.com/~/oauth-applications).
2. Toggle on **Dynamic client registration**.

No other configuration is needed — the OAuth discovery endpoints are served by the app itself:

- `/.well-known/oauth-protected-resource/mcp` (RFC 9728)
- `/.well-known/oauth-authorization-server` (RFC 8414, for older clients)

## Connecting a client

- **Claude (claude.ai / Claude Desktop):** Settings → Connectors → *Add custom connector* → URL `https://<your-deployment>/mcp`. Claude walks you through the Clerk sign-in and consent screen.
- **ChatGPT:** Settings → Connectors (developer mode) → add MCP server with the same URL.
- **Claude Code:** `claude mcp add --transport http wildtrack360 https://<your-deployment>/mcp`, then `/mcp` to authenticate.
- **Cursor / other clients:** add a Streamable HTTP MCP server pointing at `/mcp`; the client discovers Clerk via the `WWW-Authenticate` challenge.

The server cannot be exercised against a local checkout without real Clerk keys, because the OAuth flow runs through your Clerk instance.

## Tools

| Tool | Access | What it does |
| --- | --- | --- |
| `whoami` | any member | Authenticated user, their organisations, and role in the active org. Call first to orient. |
| `list_animals` | role-scoped | Animals visible to your role (admins/all-coordinators see the org; coordinators see assigned species groups + own; carers see own). Filters: species, status, search, limit. |
| `get_animal` | role-scoped | Full detail for one animal (by internal ID or org animal ID) with its 20 most recent care records. |
| `create_care_record` | animal access | The only write: add a FEEDING / MEDICAL / BEHAVIOR / LOCATION / WEIGHT / RELEASE / OTHER record to an animal you can access. Audit-logged. |
| `list_carers` | coordinator+ | Carer roster with contact, licence, and specialty details. |
| `list_species` | any member | Species configured for the organisation. |
| `run_report_query` | coordinator+ | Run read-only QL reporting queries (counts, sums, group-bys, trends) via the same safe engine as the report workbench — allowlisted sources/fields, tenant-scoped, no SQL from input. |
| `get_report_query_reference` | any member | QL grammar plus every queryable source and its fields. |
| `list_saved_report_queries` | coordinator+ | Saved report queries, re-runnable via `run_report_query`. |

### Multi-organisation users

The OAuth token identifies the user but carries no active organisation, so every tool accepts an optional `orgId`. Omitted, the user's first Clerk organisation is used. A supplied `orgId` is verified against the caller's Clerk memberships before any data access.

## Architecture

| Piece | Path |
| --- | --- |
| Transport + auth wrapper (`mcp-handler` + `withMcpAuth` + `verifyClerkToken`) | `src/app/mcp/route.ts` |
| OAuth discovery metadata | `src/app/.well-known/oauth-protected-resource/mcp/route.ts`, `src/app/.well-known/oauth-authorization-server/route.ts` |
| Tenant/RBAC context resolution | `src/lib/mcp/context.ts` |
| Tool definitions | `src/lib/mcp/tools.ts` |

Security notes:

- `/mcp` and the `.well-known` routes are public in `src/middleware.ts` because MCP clients carry a Bearer OAuth token, not a Clerk session cookie; `withMcpAuth` rejects anything without a valid Clerk-issued token (401 + `WWW-Authenticate` challenge).
- Tools never build queries from free text: `run_report_query` goes through the anchored QL parser and allowlist (`src/lib/custom-query/`), and all Prisma access is scoped by `clerkOrganizationId` plus the role rules in `src/lib/rbac.ts`.
- Unexpected tool errors are logged server-side and returned to the client as a generic message.

## Adding tools

Register new tools in `src/lib/mcp/tools.ts` using the `withContext` wrapper, which resolves `{ userId, orgId, role }` from the OAuth token and converts `McpToolError` into a safe MCP error result. Gate with `requireMcpPermission(context, '<permission>')` or the relevant helper from `src/lib/rbac.ts`, and always scope Prisma queries by `context.orgId`.
