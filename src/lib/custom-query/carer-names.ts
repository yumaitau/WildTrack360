import 'server-only';

import { getEnrichedCarers } from '@/lib/carer-helpers';
import { prisma } from '@/lib/prisma';

export async function getReportCarerNamesById(orgId: string) {
  const [currentCarers, auditNames] = await Promise.all([
    getEnrichedCarers(orgId),
    prisma.auditLog.findMany({
      where: {
        orgId,
        userName: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        userId: true,
        userName: true,
      },
    }),
  ]);

  const namesById: Record<string, string> = {};

  for (const entry of auditNames) {
    const name = entry.userName?.trim();
    if (name && !namesById[entry.userId]) {
      namesById[entry.userId] = name;
    }
  }

  for (const carer of currentCarers) {
    namesById[carer.id] = carer.name;
  }

  return namesById;
}
