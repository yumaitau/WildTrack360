import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const speciesName = searchParams.get('speciesName')
  const sex = searchParams.get('sex')

  if (!speciesName) {
    return NextResponse.json({ error: 'speciesName is required' }, { status: 400 })
  }

  try {
    const data = await prisma.speciesGrowthReference.findMany({
      where: {
        speciesName: { equals: speciesName, mode: 'insensitive' },
        ...(sex ? { sex } : {}),
      },
      orderBy: { ageDays: 'asc' },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching growth references:', error)
    return NextResponse.json({ error: 'Failed to fetch growth references' }, { status: 500 })
  }
}
