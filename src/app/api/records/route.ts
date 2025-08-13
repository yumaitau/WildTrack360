import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { RecordType } from '@prisma/client'

export async function POST(request: Request) {
  const { userId, orgId: activeOrgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const requestedOrgId = body.clerkOrganizationId || activeOrgId || undefined
  if (!requestedOrgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
  if (!body.animalId) return NextResponse.json({ error: 'animalId is required' }, { status: 400 })
  try {
    // Coerce incoming payload to match schema
    const incomingType: string | undefined = body.type
    const type: RecordType = ((): RecordType => {
      const map: Record<string, RecordType> = {
        FEEDING: RecordType.FEEDING,
        MEDICAL: RecordType.MEDICAL,
        BEHAVIOR: RecordType.BEHAVIOR,
        BEHAVIOUR: RecordType.BEHAVIOR,
        LOCATION: RecordType.LOCATION,
        WEIGHT: RecordType.WEIGHT,
        RELEASE: RecordType.RELEASE,
        GENERAL: RecordType.OTHER,
        OTHER: RecordType.OTHER,
      }
      const key = (incomingType || 'OTHER').toString().toUpperCase()
      return map[key] ?? RecordType.OTHER
    })()

    const dateInput: string | Date | undefined = body.datetime || body.date
    const date = dateInput ? new Date(dateInput) : new Date()
    if (isNaN(date.getTime())) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })

    const description: string = (body.description || body.notes || '').toString()

    const created = await prisma.record.create({
      data: {
        type,
        date,
        description,
        location: body.location ?? null,
        notes: body.notes ?? null,
        animalId: body.animalId,
        clerkUserId: userId,
        clerkOrganizationId: requestedOrgId,
      },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create record' }, { status: 500 })
  }
}


