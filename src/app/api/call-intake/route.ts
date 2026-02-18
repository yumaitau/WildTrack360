import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { requireMinimumRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { nanoid } from 'nanoid';

export async function POST(request: Request) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await requireMinimumRole(userId, orgId, 'COORDINATOR');
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { callerName, callerPhone, description, species } = body;

  if (!callerName || !callerPhone) {
    return NextResponse.json(
      { error: 'Caller name and phone are required' },
      { status: 400 }
    );
  }

  const session = await prisma.pindropSession.create({
    data: {
      accessToken: nanoid(21),
      callerName,
      callerPhone,
      description: description || null,
      species: species || null,
      clerkOrganizationId: orgId,
      clerkUserId: userId,
    },
  });

  logAudit({
    userId,
    orgId,
    action: 'CREATE',
    entity: 'PindropSession',
    entityId: session.id,
    metadata: { callerName, callerPhone, species },
  });

  return NextResponse.json(session, { status: 201 });
}

export async function GET(request: Request) {
  const { userId, orgId: activeOrgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') || activeOrgId;

  if (!orgId) {
    return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
  }

  // Ensure the requested orgId matches the active org (prevent cross-tenant access)
  if (activeOrgId && orgId !== activeOrgId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await requireMinimumRole(userId, orgId, 'COORDINATOR');
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const sessions = await prisma.pindropSession.findMany({
    where: { clerkOrganizationId: orgId },
    include: { linkedAnimal: { select: { id: true, name: true, species: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(sessions);
}
