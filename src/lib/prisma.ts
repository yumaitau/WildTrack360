import { PrismaClient } from '@prisma/client'

const ENVIRONMENT = process.env.ENVIRONMENT ?? 'PRODUCTION'

// NSW lookup tables are shared reference data — no environment field
const SKIP_MODELS = new Set([
  'NSWEncounterType',
  'NSWFate',
  'NSWPouchCondition',
  'NSWAnimalCondition',
  'NSWLifeStage',
])

// Read operations that need environment injected into `where`
const READ_OPS = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'findUnique',
  'findUniqueOrThrow',
  'count',
  'aggregate',
  'groupBy',
])

// Write operations that need environment injected into `where`
const MUTATION_WHERE_OPS = new Set([
  'update',
  'updateMany',
  'delete',
  'deleteMany',
])

function injectEnvironment(
  model: string | undefined,
  operation: string,
  args: Record<string, unknown>,
): Record<string, unknown> {
  if (!model || SKIP_MODELS.has(model)) return args

  // Reads: inject into where
  if (READ_OPS.has(operation)) {
    args.where = { ...(args.where as object ?? {}), environment: ENVIRONMENT }
    return args
  }

  // Creates: inject into data
  if (operation === 'create') {
    args.data = { ...(args.data as object ?? {}), environment: ENVIRONMENT }
    return args
  }

  if (operation === 'createMany') {
    const data = args.data
    if (Array.isArray(data)) {
      args.data = data.map((d: Record<string, unknown>) => ({ ...d, environment: ENVIRONMENT }))
    } else {
      args.data = { ...(data as object ?? {}), environment: ENVIRONMENT }
    }
    return args
  }

  if (operation === 'createManyAndReturn') {
    const data = args.data
    if (Array.isArray(data)) {
      args.data = data.map((d: Record<string, unknown>) => ({ ...d, environment: ENVIRONMENT }))
    } else {
      args.data = { ...(data as object ?? {}), environment: ENVIRONMENT }
    }
    return args
  }

  // Upsert: inject into where + create + update (where only)
  if (operation === 'upsert') {
    args.where = { ...(args.where as object ?? {}), environment: ENVIRONMENT }
    args.create = { ...(args.create as object ?? {}), environment: ENVIRONMENT }
    return args
  }

  // Mutations with where: inject into where
  if (MUTATION_WHERE_OPS.has(operation)) {
    args.where = { ...(args.where as object ?? {}), environment: ENVIRONMENT }
    return args
  }

  return args
}

const basePrisma = new PrismaClient()

export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      $allOperations({ model, operation, args, query }) {
        const injected = injectEnvironment(model, operation, args as Record<string, unknown>)
        return query(injected as typeof args)
      },
    },
  },
})

const globalForPrisma = globalThis as unknown as {
  prisma: typeof prisma | undefined
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
