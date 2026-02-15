import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function GET(request: Request) {
  const { userId, orgId: activeOrgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const orgId = searchParams.get('orgId') || activeOrgId || undefined
  const animalId = searchParams.get('animalId')
  const completed = searchParams.get('completed')
  
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
  
  try {
    const where: any = { clerkUserId: userId, clerkOrganizationId: orgId }
    if (animalId) where.animalId = animalId
    if (completed !== null) where.completed = completed === 'true'
    
    const checklists = await prisma.releaseChecklist.findMany({
      where,
      orderBy: { releaseDate: 'desc' },
    })
    return NextResponse.json(checklists)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch release checklists' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { userId, orgId: activeOrgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const orgId = body.clerkOrganizationId || activeOrgId || undefined
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
  try {
    const created = await prisma.releaseChecklist.create({
      data: {
        releaseDate: new Date(body.releaseDate),
        animalId: body.animalId,
        releaseLocation: body.releaseLocation,
        releaseCoordinates: body.releaseCoordinates ?? null,
        within10km: Boolean(body.within10km ?? false),
        releaseType: body.releaseType,
        fitnessIndicators: Array.isArray(body.fitnessIndicators) ? body.fitnessIndicators : [],
        vetSignOff: body.vetSignOff ?? null,
        photos: body.photos ?? null,
        completed: Boolean(body.completed ?? true),
        notes: body.notes ?? null,
        clerkUserId: userId,
        clerkOrganizationId: orgId,
      }
    })
    logAudit({ userId, orgId, action: 'CREATE', entity: 'ReleaseChecklist', entityId: created.id, metadata: { animalId: body.animalId, releaseType: body.releaseType } })
    return NextResponse.json(created, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create release checklist' }, { status: 500 })
  }
}


