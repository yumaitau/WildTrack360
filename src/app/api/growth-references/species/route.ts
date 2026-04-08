import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const species = await prisma.speciesGrowthReference.findMany({
      select: { speciesName: true },
      distinct: ['speciesName'],
      orderBy: { speciesName: 'asc' },
    })

    return NextResponse.json(species.map((s) => s.speciesName))
  } catch (error) {
    console.error('Error fetching growth reference species:', error)
    return NextResponse.json({ error: 'Failed to fetch species' }, { status: 500 })
  }
}
