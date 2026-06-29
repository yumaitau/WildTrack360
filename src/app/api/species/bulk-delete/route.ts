import { NextResponse } from 'next/server'
import { auth } from '@/lib/clerk-server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { route } from '@/lib/openapi/route'
import { bulkDeleteSpeciesContract } from '../openapi'

export const POST = route(bulkDeleteSpeciesContract, async ({ body }) => {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
  try {
    const result = await prisma.species.deleteMany({ where: { id: { in: body.ids }, clerkOrganizationId: orgId } })
    logAudit({ userId, orgId, action: 'DELETE', entity: 'Species', metadata: { bulkDelete: true, count: result.count } })
    return { data: { deleted: result.count, message: `Successfully deleted ${result.count} species.` } }
  } catch {
    return NextResponse.json({ error: 'Failed to delete species' }, { status: 500 })
  }
})
