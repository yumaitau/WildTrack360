import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { estimateBirthDate, type MeasurementField } from '@/lib/growth-utils'

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { speciesName, sex, measurementDate, measurements } = body

    if (!speciesName || !measurementDate || !measurements) {
      return NextResponse.json(
        { error: 'speciesName, measurementDate, and measurements are required' },
        { status: 400 }
      )
    }

    const referenceData = await prisma.speciesGrowthReference.findMany({
      where: {
        speciesName: { equals: speciesName, mode: 'insensitive' },
        ...(sex ? { sex } : {}),
      },
      orderBy: { ageDays: 'asc' },
    })

    if (referenceData.length === 0) {
      return NextResponse.json(
        { error: `No growth reference data found for ${speciesName}` },
        { status: 404 }
      )
    }

    const result = estimateBirthDate(
      referenceData,
      measurements as Partial<Record<MeasurementField, number>>,
      new Date(measurementDate)
    )

    return NextResponse.json({
      estimates: result.estimates.map((e) => ({
        field: e.field,
        label: e.label,
        value: e.value,
        estimatedAgeDays: e.estimatedAgeDays,
        estimatedBirthDate: e.estimatedBirthDate.toISOString(),
      })),
      medianEstimatedBirthDate: result.medianEstimatedBirthDate?.toISOString() ?? null,
      medianEstimatedAgeDays: result.medianEstimatedAgeDays,
    })
  } catch (error) {
    console.error('Error estimating birth date:', error)
    return NextResponse.json({ error: 'Failed to estimate birth date' }, { status: 500 })
  }
}
