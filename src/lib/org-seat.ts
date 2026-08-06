'server-only';

import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';

export const DEFAULT_ORG_SEAT_LIMIT = 20;
export const MIN_ORG_SEAT_LIMIT = 1;
export const MAX_ORG_SEAT_LIMIT = 10_000;

type SeatLookupClient = Pick<Prisma.TransactionClient, 'orgFeatureFlag' | 'orgMember'>;

export class OrgSeatLimitError extends Error {
  constructor(
    public readonly limit: number,
    public readonly used: number
  ) {
    super(`Organisation seat limit of ${limit} has been reached`);
    this.name = 'OrgSeatLimitError';
  }
}

export async function getOrgSeatLimit(
  orgId: string,
  client: SeatLookupClient = prisma
): Promise<number> {
  const flag = await client.orgFeatureFlag.findUnique({
    where: {
      clerkOrganizationId_feature: {
        clerkOrganizationId: orgId,
        feature: 'ORG_SEAT',
      },
    },
    select: { enabled: true, valueInt: true },
  });

  if (
    flag?.enabled &&
    Number.isInteger(flag.valueInt) &&
    flag.valueInt !== null &&
    flag.valueInt >= MIN_ORG_SEAT_LIMIT &&
    flag.valueInt <= MAX_ORG_SEAT_LIMIT
  ) {
    return flag.valueInt;
  }

  return DEFAULT_ORG_SEAT_LIMIT;
}

export async function getOrgSeatUsage(
  orgId: string,
  client: SeatLookupClient = prisma
): Promise<{ limit: number; used: number; remaining: number }> {
  const [limit, used] = await Promise.all([
    getOrgSeatLimit(orgId, client),
    client.orgMember.count({ where: { orgId } }),
  ]);
  return { limit, used, remaining: Math.max(0, limit - used) };
}

export function assertOrgSeatAvailable(limit: number, used: number): void {
  if (used >= limit) throw new OrgSeatLimitError(limit, used);
}
