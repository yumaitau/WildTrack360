import { NextResponse } from 'next/server'
import { auth } from '@/lib/clerk-server'
import { prisma } from '@/lib/prisma'
import { route } from '@/lib/openapi/route'
import { listGrowthReferencesContract } from './openapi'

export const GET = route(listGrowthReferencesContract, async ({ query }) => {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const data = await prisma.speciesGrowthReference.findMany({
      where: { speciesName: { equals: query.speciesName, mode: 'insensitive' }, ...(query.sex ? { sex: query.sex } : {}) },
      orderBy: { ageDays: 'asc' },
    })
    return { data }
  } catch {
    return NextResponse.json({ error: 'Failed to fetch growth references' }, { status: 500 })
  }
})
