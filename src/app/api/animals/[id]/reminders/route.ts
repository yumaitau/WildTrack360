import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getUserRole, hasPermission } from '@/lib/rbac';
import { logAudit } from '@/lib/audit';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: animalId } = await params;
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
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(reminders);
  } catch (error) {
    console.error('Failed to fetch reminders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: animalId } = await params;
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = await getUserRole(userId, orgId);
  if (!hasPermission(role, 'reminder:create')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { message, expiresAt } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

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
      metadata: { animalId, message: message.trim() },
    });

    return NextResponse.json(reminder, { status: 201 });
  } catch (error) {
    console.error('Failed to create reminder:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
