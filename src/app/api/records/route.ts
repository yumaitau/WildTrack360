import { NextResponse } from 'next/server'
import { auth } from '@/lib/clerk-server'
import { prisma } from '@/lib/prisma'
import { RecordType } from '@prisma/client'
import { logAudit } from '@/lib/audit'
import { canAccessAnimal } from '@/lib/rbac'
import { route } from '@/lib/openapi/route'
import { createRecordContract } from './openapi'

export const POST = route(createRecordContract, async ({ body }) => {
  const { userId, orgId: activeOrgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const requestedOrgId = activeOrgId
  if (!requestedOrgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })

  const b = body as Record<string, unknown>
  if (!b.animalId) return NextResponse.json({ error: 'animalId is required' }, { status: 400 })

  try {
    const animal = await prisma.animal.findFirst({ where: { id: b.animalId as string, clerkOrganizationId: requestedOrgId } })
    if (!animal) return NextResponse.json({ error: 'Animal not found in this organization' }, { status: 404 })
    const allowed = await canAccessAnimal(userId, requestedOrgId, animal)
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const incomingType: string | undefined = b.type as string | undefined
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

    const dateInput = (b.datetime || b.date) as string | Date | undefined
    const date = dateInput ? new Date(dateInput) : new Date()
    if (isNaN(date.getTime())) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })

    const description: string = ((b.description || b.notes || '') as string).toString()

    const created = await prisma.record.create({
      data: {
        type,
        date,
        description,
        location: (b.location as string | null) ?? null,
        notes: (b.notes as string | null) ?? null,
        animalId: b.animalId as string,
        clerkUserId: userId,
        clerkOrganizationId: requestedOrgId,
      },
    })
    logAudit({ userId, orgId: requestedOrgId, action: 'CREATE', entity: 'Record', entityId: created.id, metadata: { type, animalId: b.animalId } })
    return { data: created, status: 201 as const }
  } catch {
    return NextResponse.json({ error: 'Failed to create record' }, { status: 500 })
  }
})
