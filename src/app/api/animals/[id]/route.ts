import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { updateAnimal, deleteAnimal } from '@/lib/database'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { userId, orgId: activeOrgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = params.id
  const body = await request.json()
  const requestedOrgId = body.clerkOrganizationId || activeOrgId || undefined
  if (!requestedOrgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
  if (activeOrgId && requestedOrgId !== activeOrgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const updated = await updateAnimal(id, { ...body, clerkUserId: userId, clerkOrganizationId: requestedOrgId })
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update animal' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = params.id
  try {
    await deleteAnimal(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to delete animal' }, { status: 500 })
  }
}


