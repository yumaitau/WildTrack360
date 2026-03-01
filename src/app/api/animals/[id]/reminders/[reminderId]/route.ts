import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getUserRole, hasPermission } from '@/lib/rbac';
import { logAudit } from '@/lib/audit';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; reminderId: string }> }
) {
  const { id: animalId, reminderId } = await params;
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const reminder = await prisma.animalReminder.findFirst({
      where: {
        id: reminderId,
        animalId,
        clerkOrganizationId: orgId,
      },
    });

    if (!reminder) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }

    // Only the creator or an admin can delete
    const role = await getUserRole(userId, orgId);
    if (reminder.createdByUserId !== userId && !hasPermission(role, 'reminder:delete_any')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.animalReminder.delete({ where: { id: reminderId } });

    logAudit({
      userId,
      orgId,
      action: 'DELETE',
      entity: 'AnimalReminder',
      entityId: reminderId,
      metadata: { animalId, message: reminder.message },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to delete reminder:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
