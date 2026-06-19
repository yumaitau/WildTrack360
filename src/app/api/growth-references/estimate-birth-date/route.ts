import { NextResponse } from 'next/server'
import { auth } from '@/lib/clerk-server'
import { prisma } from '@/lib/prisma'
import { estimateBirthDate, type MeasurementField } from '@/lib/growth-utils'
import { route } from '@/lib/openapi/route'
import { estimateBirthDateContract } from '../openapi'

export const POST = route(estimateBirthDateContract, async ({ body }) => {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const referenceData = await prisma.speciesGrowthReference.findMany({
      where: { speciesName: { equals: body.speciesName, mode: 'insensitive' }, ...(body.sex ? { sex: body.sex } : {}) },
      orderBy: { ageDays: 'asc' },
    })
    if (referenceData.length === 0)
      return NextResponse.json({ error: `No growth reference data found for ${body.speciesName}` }, { status: 404 })
    const result = estimateBirthDate(referenceData, body.measurements as Partial<Record<MeasurementField, number>>, new Date(body.measurementDate))
    return {
      data: {
        estimates: result.estimates.map(e => ({ field: e.field, label: e.label, value: e.value, estimatedAgeDays: e.estimatedAgeDays, estimatedBirthDate: e.estimatedBirthDate.toISOString() })),
        medianEstimatedBirthDate: result.medianEstimatedBirthDate?.toISOString() ?? null,
        medianEstimatedAgeDays: result.medianEstimatedAgeDays,
      },
    }
  } catch {
    return NextResponse.json({ error: 'Failed to estimate birth date' }, { status: 500 })
  }
})
