'server-only';

import { prisma } from './prisma';
import type { Prisma, MemberStatus } from '@prisma/client';
import { getActiveTemplate } from './forms/form-template-service';
import { buildValuesSchema, serializeValues } from './forms/form-templates';

export interface MemberInput {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  suburb?: string | null;
  state?: string | null;
  postcode?: string | null;
  country?: string | null;
  memberNumber?: string | null;
  status?: MemberStatus;
  joinedAt?: Date | string | null;
  customFields?: Record<string, unknown> | null;
}

const FIELDS: (keyof MemberInput)[] = [
  'email',
  'firstName',
  'lastName',
  'phone',
  'addressLine1',
  'addressLine2',
  'suburb',
  'state',
  'postcode',
  'country',
  'memberNumber',
  'status',
  'joinedAt',
  'customFields',
];

function pickMemberFields(body: Record<string, unknown>): Partial<MemberInput> {
  const out: Partial<MemberInput> = {};
  for (const key of FIELDS) {
    if (body[key] !== undefined) {
      (out as Record<string, unknown>)[key] = body[key];
    }
  }
  return out;
}

export async function listMembers(
  orgId: string,
  opts: { search?: string; status?: MemberStatus; includeArchived?: boolean } = {}
) {
  const where: Prisma.MemberWhereInput = {
    clerkOrganizationId: orgId,
    ...(opts.includeArchived ? {} : { archivedAt: null }),
    ...(opts.status ? { status: opts.status } : {}),
  };

  if (opts.search) {
    const term = opts.search.trim();
    where.OR = [
      { email: { contains: term, mode: 'insensitive' } },
      { firstName: { contains: term, mode: 'insensitive' } },
      { lastName: { contains: term, mode: 'insensitive' } },
      { memberNumber: { contains: term, mode: 'insensitive' } },
    ];
  }

  return prisma.member.findMany({
    where,
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    take: 500,
  });
}

export async function getMember(id: string, orgId: string) {
  return prisma.member.findFirst({
    where: { id, clerkOrganizationId: orgId },
    include: {
      memberships: {
        include: { tier: true },
        orderBy: { periodEnd: 'desc' },
        take: 20,
      },
    },
  });
}

// Validate the org's custom-field payload against the active MEMBER template.
// Returns the cleaned JSON object to persist (dates → ISO strings) or throws
// a message-bearing Error so the API can surface it as a 400.
async function validateCustomFields(
  orgId: string,
  raw: Record<string, unknown> | null | undefined
): Promise<Record<string, unknown>> {
  const template = await getActiveTemplate(orgId, 'MEMBER');
  if (!template || template.fields.length === 0) return {};
  const schema = buildValuesSchema(template.fields);
  const result = schema.safeParse(raw ?? {});
  if (!result.success) {
    const messages = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`Custom fields invalid: ${messages.join('; ')}`);
  }
  return serializeValues(result.data as Record<string, unknown>);
}

export async function createMember(orgId: string, body: Record<string, unknown>) {
  const data = pickMemberFields(body);
  if (!data.email || !data.firstName || !data.lastName) {
    throw new Error('email, firstName and lastName are required');
  }
  const customFieldsJson = await validateCustomFields(orgId, data.customFields ?? null);
  return prisma.member.create({
    data: {
      clerkOrganizationId: orgId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone ?? null,
      addressLine1: data.addressLine1 ?? null,
      addressLine2: data.addressLine2 ?? null,
      suburb: data.suburb ?? null,
      state: data.state ?? null,
      postcode: data.postcode ?? null,
      country: data.country ?? 'AU',
      memberNumber: data.memberNumber ?? null,
      status: data.status ?? 'ACTIVE',
      joinedAt: data.joinedAt ? new Date(data.joinedAt) : new Date(),
      customFieldsJson: customFieldsJson as Prisma.InputJsonValue,
    },
  });
}

// Find an existing (non-archived) member by org + email, else create one. Used
// by the public Join flow so repeated signups with the same email reuse the
// same Member record rather than fanning out duplicates.
export async function findOrCreateMember(orgId: string, body: Record<string, unknown>) {
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (email) {
    const existing = await prisma.member.findFirst({
      where: {
        clerkOrganizationId: orgId,
        email: { equals: email, mode: 'insensitive' },
        archivedAt: null,
      },
    });
    if (existing) return existing;
  }
  return createMember(orgId, body);
}

export async function updateMember(
  id: string,
  orgId: string,
  body: Record<string, unknown>
) {
  const data = pickMemberFields(body);
  const updateData: Prisma.MemberUpdateInput = {};
  if (data.email !== undefined) updateData.email = data.email;
  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.addressLine1 !== undefined) updateData.addressLine1 = data.addressLine1;
  if (data.addressLine2 !== undefined) updateData.addressLine2 = data.addressLine2;
  if (data.suburb !== undefined) updateData.suburb = data.suburb;
  if (data.state !== undefined) updateData.state = data.state;
  if (data.postcode !== undefined) updateData.postcode = data.postcode;
  if (data.country !== undefined) updateData.country = data.country ?? 'AU';
  if (data.memberNumber !== undefined) updateData.memberNumber = data.memberNumber;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.joinedAt !== undefined && data.joinedAt !== null) {
    updateData.joinedAt = new Date(data.joinedAt);
  }
  if (data.customFields !== undefined) {
    const customFieldsJson = await validateCustomFields(orgId, data.customFields);
    updateData.customFieldsJson = customFieldsJson as Prisma.InputJsonValue;
  }

  const result = await prisma.member.updateMany({
    where: { id, clerkOrganizationId: orgId },
    data: updateData,
  });
  if (result.count === 0) throw new Error('Member not found');
  return prisma.member.findUnique({ where: { id } });
}

// Soft-archive rather than hard delete to preserve historical membership /
// payment records that will reference this member in later phases.
export async function archiveMember(id: string, orgId: string) {
  const result = await prisma.member.updateMany({
    where: { id, clerkOrganizationId: orgId, archivedAt: null },
    data: { archivedAt: new Date(), status: 'CANCELLED' },
  });
  if (result.count === 0) throw new Error('Member not found');
}
