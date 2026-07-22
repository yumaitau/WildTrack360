import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { readJson, requireCommunitySession, validationError } from '@/lib/community/api';
import { communityAuthorDto, communityAuthorSelect } from '@/lib/community/dto';
import { takeCommunityRateLimit } from '@/lib/community/rate-limit';
import { prisma } from '@/lib/prisma';

const blockSchema = z.object({ blockedId: z.string().min(1).max(64) });

// The members a viewer has blocked (personal mute). Distinct from reporting —
// no moderator involvement; the block only filters the viewer's own reads.
export async function GET() {
  const auth = await requireCommunitySession({ profile: true });
  if ('error' in auth) return auth.error;
  const rows = await prisma.communityBlock.findMany({
    where: { blockerId: auth.session.profile!.id },
    orderBy: { createdAt: 'desc' },
    select: {
      createdAt: true,
      blocked: { select: communityAuthorSelect },
    },
  });
  return NextResponse.json({
    blocks: rows.map((r) => ({
      member: communityAuthorDto(r.blocked),
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

export async function PUT(request: NextRequest) {
  const auth = await requireCommunitySession({ write: true, profile: true });
  if ('error' in auth) return auth.error;
  const body = await readJson(request);
  if ('error' in body) return body.error;
  const parsed = blockSchema.safeParse(body.data);
  if (!parsed.success) return validationError(parsed.error.issues);

  const viewerId = auth.session.profile!.id;
  if (parsed.data.blockedId === viewerId) {
    return NextResponse.json({ error: "You can't block yourself" }, { status: 400 });
  }
  const target = await prisma.communityProfile.findUnique({
    where: { id: parsed.data.blockedId },
    select: { id: true },
  });
  if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  const rate = await takeCommunityRateLimit(viewerId, 'block');
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Block limit reached' }, { status: 429 });
  }

  await prisma.communityBlock.upsert({
    where: {
      blockerId_blockedId: { blockerId: viewerId, blockedId: target.id },
    },
    create: { blockerId: viewerId, blockedId: target.id },
    update: {},
  });
  return NextResponse.json({ blocked: true });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireCommunitySession({ write: true, profile: true });
  if ('error' in auth) return auth.error;
  const blockedId = request.nextUrl.searchParams.get('blockedId');
  if (!blockedId) {
    return NextResponse.json({ error: 'blockedId is required' }, { status: 400 });
  }
  await prisma.communityBlock.deleteMany({
    where: { blockerId: auth.session.profile!.id, blockedId },
  });
  return NextResponse.json({ blocked: false });
}
