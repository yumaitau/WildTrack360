import { NextResponse } from 'next/server'
import { auth } from '@/lib/clerk-server'
import { prisma } from '@/lib/prisma'
import { route } from '@/lib/openapi/route'
import { listGrowthReferenceSpeciesContract } from '../openapi'

export const GET = route(listGrowthReferenceSpeciesContract, async () => {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const species = await prisma.speciesGrowthReference.findMany({
      select: { speciesName: true },
      distinct: ['speciesName'],
      orderBy: { speciesName: 'asc' },
    })
    return { data: species.map(s => s.speciesName) }
  } catch {
    return NextResponse.json({ error: 'Failed to fetch species' }, { status: 500 })
  }
})
