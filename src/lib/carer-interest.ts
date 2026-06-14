import 'server-only';

import { prisma } from './prisma';
import { sendAdminNotification } from './email/admin-notifications';
import { Prisma, type CarerInterestStatus } from '@prisma/client';

export interface CarerInterestInput {
  memberId?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  experience?: string | null;
  availability?: string | null;
  message?: string | null;
}

const OPEN_STATUSES: CarerInterestStatus[] = ['NEW', 'CONTACTED'];

// The member's (or email's) in-progress application, if any.
export async function getOpenInterest(orgId: string, memberId: string | null, email: string) {
  const or: Prisma.CarerInterestWhereInput[] = [{ email: { equals: email, mode: 'insensitive' } }];
  if (memberId) or.push({ memberId });
  return prisma.carerInterest.findFirst({
    where: { clerkOrganizationId: orgId, status: { in: OPEN_STATUSES }, OR: or },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createCarerInterest(orgId: string, input: CarerInterestInput) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name || !email) throw new Error('Name and email are required');

  const existing = await getOpenInterest(orgId, input.memberId ?? null, email);
  if (existing) throw new Error('You already have an application in progress');

  const created = await prisma.carerInterest
    .create({
      data: {
        clerkOrganizationId: orgId,
        memberId: input.memberId ?? null,
        name,
        email,
        phone: input.phone?.trim() || null,
        experience: input.experience?.trim() || null,
        availability: input.availability?.trim() || null,
        message: input.message?.trim() || null,
      },
    })
    .catch((error) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new Error('You already have an application in progress');
      }
      throw error;
    });

  // Best-effort: alert org admins so a recruiter can follow up.
  try {
    await sendAdminNotification({
      orgId,
      kind: 'carer-interest',
      title: 'New volunteer carer interest',
      body: `${name} has expressed interest in becoming a volunteer wildlife carer.`,
      cta: { label: 'Review applicants', href: '/admin/carer-interest' },
      info: [
        { label: 'Name', value: name },
        { label: 'Email', value: email },
        ...(input.phone ? [{ label: 'Phone', value: input.phone }] : []),
      ],
      dedupeKey: created.id,
    });
  } catch (err) {
    console.error('Carer interest admin notification failed', err);
  }

  return created;
}

export async function listCarerInterests(orgId: string, status?: CarerInterestStatus) {
  return prisma.carerInterest.findMany({
    where: { clerkOrganizationId: orgId, ...(status ? { status } : {}) },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function updateCarerInterestStatus(
  orgId: string,
  id: string,
  status: CarerInterestStatus
) {
  const result = await prisma.carerInterest.updateMany({
    where: { id, clerkOrganizationId: orgId },
    data: { status },
  });
  if (result.count === 0) throw new Error('Application not found');
}
