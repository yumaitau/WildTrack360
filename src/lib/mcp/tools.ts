import 'server-only';

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { prisma } from '@/lib/prisma';
import { clerkClient } from '@/lib/clerk-server';
import { getAuthorisedSpecies, canAccessAnimal } from '@/lib/rbac';
import { getEnrichedCarers } from '@/lib/carer-helpers';
import { getSpecies, createRecord } from '@/lib/database';
import { logAudit } from '@/lib/audit';
import { canPreviewReports } from '@/lib/custom-query/access';
import { evaluateCustomQueries, type QueryablePrisma } from '@/lib/custom-query/evaluator';
import { getReportCarerNamesById } from '@/lib/custom-query/carer-names';
import { CUSTOM_QUERY_SOURCES } from '@/lib/custom-query/allowlist';
import {
  CLERK_EMAIL_UNAVAILABLE,
  getClerkUserEmail,
} from '@/lib/clerk-user-display';
import { McpToolError, resolveMcpContext, requireMcpPermission, type McpContext } from './context';

const ANIMAL_STATUSES = [
  'ADMITTED',
  'IN_CARE',
  'READY_FOR_RELEASE',
  'RELEASED',
  'DECEASED',
  'TRANSFERRED',
  'PERMANENT_CARE',
] as const;

const RECORD_TYPES = [
  'FEEDING',
  'MEDICAL',
  'BEHAVIOR',
  'LOCATION',
  'WEIGHT',
  'RELEASE',
  'OTHER',
] as const;

const orgIdInput = z
  .string()
  .optional()
  .describe(
    'Clerk organisation ID to act within. Omit to use your first (usually only) organisation. Use the whoami tool to list your organisations.'
  );

const ANIMAL_LIST_SELECT = {
  id: true,
  orgAnimalId: true,
  name: true,
  species: true,
  status: true,
  sex: true,
  ageClass: true,
  dateFound: true,
  carerId: true,
} as const;

type ToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};

type CarerDisplay = {
  name: string;
  email: string | null;
};

const CARER_EMAIL_UNAVAILABLE = 'Carer email unavailable';

function ok(data: unknown): ToolResult {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

function carerDisplayFor(
  carerId: string | null | undefined,
  carersById: Map<string, CarerDisplay>
) {
  if (!carerId) return null;
  return carersById.get(carerId) ?? { name: CARER_EMAIL_UNAVAILABLE, email: null };
}

async function getCarerDisplayById(orgId: string): Promise<Map<string, CarerDisplay>> {
  const carers = (await getEnrichedCarers(orgId)) ?? [];
  return new Map(
    carers.map((carer) => [
      carer.id,
      {
        name: carer.name || carer.email || CARER_EMAIL_UNAVAILABLE,
        email: carer.email || null,
      },
    ])
  );
}

function omitInternalUserFields<T extends object>(value: T) {
  const {
    clerkUserId: _clerkUserId,
    clerkOrganizationId: _clerkOrganizationId,
    carerId: _carerId,
    createdByUserId: _createdByUserId,
    submittedByUserId: _submittedByUserId,
    reviewedByUserId: _reviewedByUserId,
    verifiedByUserId: _verifiedByUserId,
    takenByUserId: _takenByUserId,
    assignedToUserId: _assignedToUserId,
    fromCarerId: _fromCarerId,
    toCarerId: _toCarerId,
    userId: _userId,
    ...rest
  } = value as Record<string, unknown>;
  return rest;
}

/**
 * Wrap a tool implementation: resolve the tenant context from the OAuth
 * token, convert expected failures into MCP error results, and never leak
 * internal error details to the client.
 */
function withContext<Args extends { orgId?: string }>(
  toolName: string,
  impl: (context: McpContext, args: Args) => Promise<ToolResult>
) {
  return async (args: Args, extra: { authInfo?: AuthInfo }): Promise<ToolResult> => {
    try {
      const context = await resolveMcpContext(extra.authInfo, args.orgId);
      return await impl(context, args);
    } catch (error) {
      if (error instanceof McpToolError) {
        return { content: [{ type: 'text' as const, text: error.message }], isError: true };
      }
      console.error(`MCP tool ${toolName} failed:`, error);
      return {
        content: [{ type: 'text' as const, text: `Tool ${toolName} failed unexpectedly` }],
        isError: true,
      };
    }
  };
}

/**
 * Build the role-scoped animal `where` clause. Mirrors the visibility rules
 * in /api/animals: ADMIN / COORDINATOR_ALL / CARER_ALL see the whole org,
 * COORDINATOR sees assigned species groups plus own animals, CARER sees only
 * animals assigned to them.
 */
async function animalVisibilityWhere(context: McpContext): Promise<Record<string, unknown>> {
  const { userId, orgId, role } = context;
  if (role === 'ADMIN' || role === 'COORDINATOR_ALL' || role === 'CARER_ALL') {
    return { clerkOrganizationId: orgId };
  }
  if (role === 'COORDINATOR') {
    const authorisedSpecies = await getAuthorisedSpecies(userId, orgId);
    return {
      clerkOrganizationId: orgId,
      OR: [
        ...(authorisedSpecies && authorisedSpecies.length > 0
          ? [{ species: { in: authorisedSpecies } }]
          : []),
        { carerId: userId },
      ],
    };
  }
  return { clerkOrganizationId: orgId, carerId: userId };
}

export function registerWildTrackTools(server: McpServer): void {
  server.registerTool(
    'whoami',
    {
      description:
        'Get the authenticated user, their organisations, and their WildTrack360 role in the active organisation. Call this first to orient yourself.',
      inputSchema: { orgId: orgIdInput },
    },
    withContext('whoami', async (context) => {
      const client = await clerkClient();
      const [user, memberships] = await Promise.all([
        client.users.getUser(context.userId),
        client.users.getOrganizationMembershipList({ userId: context.userId }),
      ]);
      return ok({
        user: {
          name: [user.firstName, user.lastName].filter(Boolean).join(' ') || null,
          email: getClerkUserEmail(user) ?? CLERK_EMAIL_UNAVAILABLE,
        },
        activeOrganisation: { id: context.orgId, role: context.role },
        organisations: memberships.data.map(
          (m: { organization: { id: string; name: string; slug: string | null } }) => ({
            id: m.organization.id,
            name: m.organization.name,
            slug: m.organization.slug,
          })
        ),
      });
    })
  );

  server.registerTool(
    'list_animals',
    {
      description:
        'List animals in the organisation, scoped to what your role may see. Supports filtering by species, status, and free-text search over name and animal ID.',
      inputSchema: {
        orgId: orgIdInput,
        species: z
          .string()
          .optional()
          .describe('Filter to an exact species name (case-insensitive)'),
        status: z.enum(ANIMAL_STATUSES).optional().describe('Filter by lifecycle status'),
        search: z.string().optional().describe('Substring match on animal name or org animal ID'),
        limit: z.number().int().min(1).max(100).default(25).describe('Maximum animals to return'),
      },
    },
    withContext<{
      orgId?: string;
      species?: string;
      status?: (typeof ANIMAL_STATUSES)[number];
      search?: string;
      limit?: number;
    }>('list_animals', async (context, args) => {
      const visibility = await animalVisibilityWhere(context);
      const filters: Record<string, unknown>[] = [];
      if (args.species) filters.push({ species: { equals: args.species, mode: 'insensitive' } });
      if (args.status) filters.push({ status: args.status });
      if (args.search) {
        filters.push({
          OR: [
            { name: { contains: args.search, mode: 'insensitive' } },
            { orgAnimalId: { contains: args.search, mode: 'insensitive' } },
          ],
        });
      }
      const where = { AND: [visibility, ...filters] };
      const limit = args.limit ?? 25;
      const [total, animals] = await Promise.all([
        prisma.animal.count({ where }),
        prisma.animal.findMany({
          where,
          select: ANIMAL_LIST_SELECT,
          orderBy: { dateFound: 'desc' },
          take: limit,
        }),
      ]);
      const carersById = await getCarerDisplayById(context.orgId);
      return ok({
        total,
        returned: animals.length,
        truncated: total > animals.length,
        animals: animals.map(({ carerId, ...animal }) => ({
          ...animal,
          carer: carerDisplayFor(carerId, carersById),
        })),
      });
    })
  );

  server.registerTool(
    'get_animal',
    {
      description:
        'Get full details for one animal, including its 20 most recent care records. Accepts either the internal animal ID or the org animal ID (e.g. "2025-034").',
      inputSchema: {
        orgId: orgIdInput,
        animalId: z.string().describe('Internal ID or org animal ID of the animal'),
      },
    },
    withContext<{ orgId?: string; animalId: string }>('get_animal', async (context, args) => {
      const animal = await prisma.animal.findFirst({
        where: {
          clerkOrganizationId: context.orgId,
          OR: [{ id: args.animalId }, { orgAnimalId: args.animalId }],
        },
        include: {
          records: { orderBy: { date: 'desc' }, take: 20 },
          photos: { select: { id: true } },
          carer: { select: { id: true, phone: true, active: true } },
        },
      });
      if (!animal) throw new McpToolError(`No animal found with ID "${args.animalId}"`);
      const allowed = await canAccessAnimal(context.userId, context.orgId, animal);
      if (!allowed)
        throw new McpToolError('Forbidden: your role does not give you access to this animal');
      const carersById = await getCarerDisplayById(context.orgId);
      const { records, photos, carer: _carer, carerId, ...animalFields } = animal;
      return ok({
        animal: {
          ...omitInternalUserFields(animalFields),
          carer: carerDisplayFor(carerId, carersById),
        },
        records: records.map((record) => omitInternalUserFields(record)),
        photos,
      });
    })
  );

  server.registerTool(
    'create_care_record',
    {
      description:
        'Add a care record (feeding, medical, behaviour, location, weight, release, or other) to an animal you have access to. This is the only write operation exposed over MCP.',
      inputSchema: {
        orgId: orgIdInput,
        animalId: z.string().describe('Internal ID or org animal ID of the animal'),
        type: z.enum(RECORD_TYPES).describe('Kind of care record'),
        description: z.string().min(1).describe('What happened / what was observed'),
        date: z
          .string()
          .datetime({ offset: true })
          .optional()
          .describe('ISO 8601 timestamp; defaults to now'),
        location: z.string().optional(),
        notes: z.string().optional(),
      },
    },
    withContext<{
      orgId?: string;
      animalId: string;
      type: (typeof RECORD_TYPES)[number];
      description: string;
      date?: string;
      location?: string;
      notes?: string;
    }>('create_care_record', async (context, args) => {
      const animal = await prisma.animal.findFirst({
        where: {
          clerkOrganizationId: context.orgId,
          OR: [{ id: args.animalId }, { orgAnimalId: args.animalId }],
        },
        select: { id: true, name: true, species: true, carerId: true },
      });
      if (!animal) throw new McpToolError(`No animal found with ID "${args.animalId}"`);
      const allowed = await canAccessAnimal(context.userId, context.orgId, animal);
      if (!allowed)
        throw new McpToolError('Forbidden: your role does not give you access to this animal');

      const record = await createRecord({
        type: args.type,
        date: args.date ? new Date(args.date) : new Date(),
        description: args.description,
        location: args.location ?? null,
        notes: args.notes ?? null,
        clerkUserId: context.userId,
        clerkOrganizationId: context.orgId,
        animalId: animal.id,
      });
      logAudit({
        userId: context.userId,
        orgId: context.orgId,
        action: 'CREATE',
        entity: 'Record',
        entityId: record.id,
        metadata: { animalId: animal.id, type: args.type, via: 'mcp' },
      });
      return ok({ record: omitInternalUserFields(record) });
    })
  );

  server.registerTool(
    'list_carers',
    {
      description:
        "List the organisation's carers with contact, licence, and specialty details. Requires a coordinator or admin role.",
      inputSchema: { orgId: orgIdInput },
    },
    withContext('list_carers', async (context) => {
      requireMcpPermission(context, 'carer:view_workload');
      const carers = await getEnrichedCarers(context.orgId);
      return ok({
        carers: carers.map(({ id: _id, imageUrl: _imageUrl, ...carer }) => ({
          ...carer,
          email: carer.email || CARER_EMAIL_UNAVAILABLE,
          trainings: carer.trainings?.map((training) => omitInternalUserFields(training)),
        })),
      });
    })
  );

  server.registerTool(
    'list_species',
    {
      description: 'List the species configured for the organisation.',
      inputSchema: { orgId: orgIdInput },
    },
    withContext('list_species', async (context) => {
      return ok(await getSpecies(context.orgId));
    })
  );

  server.registerTool(
    'run_report_query',
    {
      description:
        'Run one or more read-only reporting queries in the WildTrack360 QL grammar and get aggregate results (counts, sums, group-bys, trends). Call get_report_query_reference first for the grammar and available sources/fields. Requires a coordinator or admin role.',
      inputSchema: {
        orgId: orgIdInput,
        queries: z
          .array(z.string().min(1))
          .min(1)
          .max(20)
          .describe(
            'QL lines, e.g. ["count from animals where status = IN_CARE group by species"]'
          ),
        start: z.string().optional().describe('Default window start, YYYY-MM-DD'),
        end: z.string().optional().describe('Default window end, YYYY-MM-DD'),
      },
    },
    withContext<{ orgId?: string; queries: string[]; start?: string; end?: string }>(
      'run_report_query',
      async (context, args) => {
        if (!canPreviewReports(context.role)) {
          throw new McpToolError(
            `Forbidden: your role (${context.role}) cannot run report queries`
          );
        }
        const lines = args.queries.map((q) => q.trim()).filter((q) => q.length > 0);
        if (lines.length === 0) return ok({ results: [] });

        const parseDate = (value?: string) => {
          if (!value) return undefined;
          const d = new Date(value);
          return Number.isNaN(d.getTime()) ? undefined : d;
        };
        const carerNamesById = lines.some((q) => /\b(?:carerName|animal_assignments)\b/i.test(q))
          ? await getReportCarerNamesById(context.orgId)
          : undefined;
        const results = await evaluateCustomQueries(lines, {
          prisma: prisma as unknown as QueryablePrisma,
          orgId: context.orgId,
          defaultStart: parseDate(args.start),
          defaultEnd: parseDate(args.end),
          carerNamesById,
        });
        return ok({ results });
      }
    )
  );

  server.registerTool(
    'get_report_query_reference',
    {
      description:
        'Get the WildTrack360 QL grammar plus every queryable source and its fields. Use this before writing queries for run_report_query.',
      inputSchema: { orgId: orgIdInput },
    },
    withContext('get_report_query_reference', async () => {
      return ok({
        grammar: [
          'count from <source>',
          'sum <numericField> from <source>',
          'Optional clauses, in order:',
          '  between YYYY-MM-DD and YYYY-MM-DD',
          '  where <field> = <value>   (single equality only; quote values with spaces)',
          '  group by <field>',
          '  trend by <dateBucketField>  (e.g. foundMonth, foundDay)',
          '  limit N                     (1-50)',
          '  chart number|table|bar|pie|line',
        ].join('\n'),
        examples: [
          'count from animals where status = IN_CARE group by species',
          'count from animals between 2025-07-01 and 2026-06-30 trend by foundMonth',
          'sum weightGrams from animals where species = "Eastern Grey Kangaroo"',
        ],
        sources: Object.entries(CUSTOM_QUERY_SOURCES).map(([name, source]) => ({
          name,
          label: source.label,
          description: source.description,
          dateField: source.dateField,
          fields: source.fields,
          numericFields: source.numericFields,
          snapshot: 'snapshot' in source ? source.snapshot === true : false,
        })),
      });
    })
  );

  server.registerTool(
    'list_saved_report_queries',
    {
      description:
        "List the organisation's saved report queries (name + QL text), which can be re-run via run_report_query. Requires a coordinator or admin role.",
      inputSchema: { orgId: orgIdInput },
    },
    withContext('list_saved_report_queries', async (context) => {
      if (!canPreviewReports(context.role)) {
        throw new McpToolError(`Forbidden: your role (${context.role}) cannot view report queries`);
      }
      const queries = await prisma.savedReportQuery.findMany({
        where: { orgId: context.orgId },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          query: true,
          visualization: true,
          showOnDashboard: true,
          updatedAt: true,
        },
      });
      return ok(queries);
    })
  );
}
