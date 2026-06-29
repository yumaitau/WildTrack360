import { NextResponse } from 'next/server'
import { auth } from '@/lib/clerk-server'
import { prisma } from '@/lib/prisma'
import { speciesSeedData } from '../../../../../prisma/species-seed-data'
import { logAudit } from '@/lib/audit'
import { route } from '@/lib/openapi/route'
import { seedSpeciesContract } from '../openapi'

export const POST = route(seedSpeciesContract, async () => {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
  try {
    const existing = await prisma.species.findMany({ where: { clerkOrganizationId: orgId }, select: { name: true } })
    const existingNames = new Set(existing.map(s => s.name.toLowerCase()))
    const toInsert = speciesSeedData.filter(s => !existingNames.has(s.name.toLowerCase()))
    if (toInsert.length === 0) return { data: { inserted: 0, message: 'All default species already exist.' }, status: 200 as const }
    const result = await prisma.species.createMany({
      data: toInsert.map(s => {
        let description = s.type
        if (s.subtype) description += ` - ${s.subtype}`
        description += `. Category: ${s.category}`
        if (s.speciesCode) description += `. Species Code: ${s.speciesCode}`
        return { name: s.name, scientificName: s.scientificName, type: s.type === 'Other' ? null : s.type, description, careRequirements: null, clerkUserId: userId, clerkOrganizationId: orgId }
      }),
      skipDuplicates: true,
    })
    logAudit({ userId, orgId, action: 'CREATE', entity: 'Species', metadata: { bulkSeed: true, count: result.count } })
    return { data: { inserted: result.count, message: `Successfully added ${result.count} default species.` }, status: 201 as const }
  } catch {
    return NextResponse.json({ error: 'Failed to seed species' }, { status: 500 })
  }
})
