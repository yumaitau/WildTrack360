import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { clerkClient } from '@/lib/clerk-server';
import { prisma } from '@/lib/prisma';
import { getUserRole, hasPermission } from '@/lib/rbac';
import { logAudit } from '@/lib/audit';
import { route } from '@/lib/openapi/route';
import { listRemindersContract, createReminderContract } from './openapi';

export const GET = route(listRemindersContract, async ({ params }) => {
  const { id: animalId } = params;
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const reminders = await prisma.animalReminder.findMany({
      where: {
        animalId,
        clerkOrganizationId: orgId,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: reminders };
  } catch (error) {
    console.error('Failed to fetch reminders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const POST = route(createReminderContract, async ({ params, body }) => {
  const { id: animalId } = params;
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = await getUserRole(userId, orgId);
  if (!hasPermission(role, 'reminder:create')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const message = body.message;
  const expiresAt = body.expiresAt;

  if (expiresAt !== undefined && expiresAt !== null) {
    const parsed = new Date(expiresAt);
    if (isNaN(parsed.getTime())) {
      return NextResponse.json({ error: 'Invalid expiresAt date' }, { status: 400 });
    }
  }

  try {
    // Verify the animal exists in this org
    const animal = await prisma.animal.findFirst({
      where: { id: animalId, clerkOrganizationId: orgId },
    });
    if (!animal) {
      return NextResponse.json({ error: 'Animal not found' }, { status: 404 });
    }

    // Resolve creator name from Clerk
    let createdByName: string | null = null;
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      createdByName = [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
    } catch {
      // Proceed without name
    }

    const reminder = await prisma.animalReminder.create({
      data: {
        animalId,
        message: message.trim(),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdByUserId: userId,
        createdByName,
        clerkOrganizationId: orgId,
      },
    });

    logAudit({
      userId,
      orgId,
      action: 'CREATE',
      entity: 'AnimalReminder',
      entityId: reminder.id,
      metadata: { animalId, reminderId: reminder.id, messageLength: message.trim().length },
    });

    return { data: reminder, status: 201 };
  } catch (error) {
    console.error('Failed to create reminder:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
