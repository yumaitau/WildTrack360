import 'server-only';

import { prisma } from '@/lib/prisma';
import { activeSanctionState } from '@/lib/community/access';

export type IssuableSanctionType = 'WARNING' | 'MUTE' | 'BAN';

type SanctionRow = {
  id: string;
  type: string;
  reason: string;
  startsAt: Date;
  endsAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  profileId: string;
  // Null once the issuing moderator has been purged (issue #180): the sanction
  // stays enforced, only the "issued by" actor is cleared.
  createdById: string | null;
};

function notificationTitle(type: IssuableSanctionType): string {
  switch (type) {
    case 'WARNING':
      return 'A moderator issued a Community warning';
    case 'MUTE':
      return 'Your Community account has been muted';
    case 'BAN':
      return 'Your Community account has been suspended';
  }
}

// WARNING never changes the profile's status flag (it can overlay an existing
// mute/ban without clearing it). MUTE/BAN drive the status directly.
function statusForType(type: IssuableSanctionType): 'MUTED' | 'BANNED' | null {
  if (type === 'MUTE') return 'MUTED';
  if (type === 'BAN') return 'BANNED';
  return null;
}

export async function issueSanction(input: {
  targetProfileId: string;
  actorProfileId: string;
  type: IssuableSanctionType;
  reason: string;
  endsAt?: Date | null;
}) {
  const { targetProfileId, actorProfileId, type, reason } = input;
  const endsAt = type === 'MUTE' ? (input.endsAt ?? null) : null;

  return prisma.$transaction(async (tx) => {
    const sanction = await tx.communitySanction.create({
      data: {
        profileId: targetProfileId,
        createdById: actorProfileId,
        type,
        reason,
        endsAt,
      },
    });

    const nextStatus = statusForType(type);
    if (nextStatus) {
      await tx.communityProfile.update({
        where: { id: targetProfileId },
        data: { status: nextStatus },
      });
    }

    await tx.communityNotification.upsert({
      where: {
        recipientId_dedupeKey: {
          recipientId: targetProfileId,
          dedupeKey: `sanction:${sanction.id}`,
        },
      },
      create: {
        recipientId: targetProfileId,
        actorId: actorProfileId,
        type: 'MODERATION_DECISION',
        title: notificationTitle(type),
        dedupeKey: `sanction:${sanction.id}`,
      },
      update: {},
    });

    return sanction;
  });
}

export async function revokeSanction(input: { sanctionId: string; actorProfileId: string }) {
  const { sanctionId, actorProfileId } = input;

  return prisma.$transaction(async (tx) => {
    const sanction = await tx.communitySanction.findUnique({ where: { id: sanctionId } });
    if (!sanction || sanction.revokedAt) return null;

    const revoked = await tx.communitySanction.update({
      where: { id: sanctionId },
      data: { revokedAt: new Date(), revokedById: actorProfileId },
    });

    const remaining = await tx.communitySanction.findMany({
      where: { profileId: sanction.profileId, revokedAt: null },
      select: { type: true, startsAt: true, endsAt: true, revokedAt: true },
    });
    const state = activeSanctionState(remaining, new Date());
    const nextStatus = state === 'banned' ? 'BANNED' : state === 'muted' ? 'MUTED' : 'ACTIVE';

    await tx.communityProfile.update({
      where: { id: sanction.profileId },
      data: { status: nextStatus },
    });

    return revoked;
  });
}

export async function activeSanctionsForProfile(profileId: string): Promise<SanctionRow[]> {
  const now = new Date();
  const rows = await prisma.communitySanction.findMany({
    where: {
      profileId,
      revokedAt: null,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    orderBy: { startsAt: 'desc' },
  });
  return rows;
}
