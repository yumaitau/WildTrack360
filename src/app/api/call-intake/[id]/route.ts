import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { requireMinimumRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await requireMinimumRole(userId, orgId, 'COORDINATOR');
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status, linkedAnimalId } = body;

  // Verify session belongs to this org
  const existing = await prisma.pindropSession.findFirst({
    where: { id, clerkOrganizationId: orgId },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};

  if (status) {
    updateData.status = status;
  }

  if (linkedAnimalId !== undefined) {
    if (linkedAnimalId) {
      // Verify animal belongs to this org
      const animal = await prisma.animal.findFirst({
        where: { id: linkedAnimalId, clerkOrganizationId: orgId },
      });
      if (!animal) {
        return NextResponse.json({ error: 'Animal not found' }, { status: 404 });
      }
      updateData.linkedAnimalId = linkedAnimalId;
      updateData.status = 'LINKED';
    } else {
      updateData.linkedAnimalId = null;
      if (existing.status === 'LINKED') {
        updateData.status = 'REVIEWED';
      }
    }
  }

  const updated = await prisma.pindropSession.update({
    where: { id },
    data: updateData,
  });

  logAudit({
    userId,
    orgId,
    action: 'UPDATE',
    entity: 'PindropSession',
    entityId: id,
    metadata: { status: updated.status, linkedAnimalId: updated.linkedAnimalId },
  });

  return NextResponse.json(updated);
}
