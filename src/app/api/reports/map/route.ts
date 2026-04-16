import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export interface ReportMapEntry {
  id: string
  species: string | null
  location: string | null
  lat: number
  lng: number
  callerName: string
  dateTime: string
  status: string
}

export async function GET() {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })

  try {
    const callLogs = await prisma.callLog.findMany({
      where: {
        clerkOrganizationId: orgId,
        coordinates: { not: Prisma.AnyNull },
        status: 'OPEN',
      },
      select: {
        id: true,
        species: true,
        location: true,
        coordinates: true,
        callerName: true,
        dateTime: true,
        status: true,
      },
      orderBy: { dateTime: 'desc' },
      take: 100,
    })

    const results: ReportMapEntry[] = callLogs
      .filter((log) => {
        const coords = log.coordinates as { lat?: number; lng?: number } | null
        return coords && typeof coords.lat === 'number' && typeof coords.lng === 'number'
      })
      .map((log) => {
        const coords = log.coordinates as { lat: number; lng: number }
        return {
          id: log.id,
          species: log.species,
          location: log.location,
          lat: coords.lat,
          lng: coords.lng,
          callerName: log.callerName,
          dateTime: log.dateTime.toISOString(),
          status: log.status,
        }
      })

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error fetching report map data:', error)
    return NextResponse.json({ error: 'Failed to fetch report map data' }, { status: 500 })
  }
}
