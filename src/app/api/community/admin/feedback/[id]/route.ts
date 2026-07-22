import { NextRequest, NextResponse } from 'next/server';
import { CommunityFeedbackStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import { requireCommunityStaffAdmin } from '@/lib/community/admin';
import { readJson, validationError } from '@/lib/community/api';
import { prisma } from '@/lib/prisma';

const patchSchema = z
  .object({
    status: z.nativeEnum(CommunityFeedbackStatus).optional(),
    triageNote: z.string().max(4000).nullable().optional(),
    roadmapUrl: z.string().url().max(2000).nullable().optional(),
  })
  .refine(
    (data) =>
      data.status !== undefined || data.triageNote !== undefined || data.roadmapUrl !== undefined,
    { message: 'No fields to update' }
  );

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCommunityStaffAdmin();
  if ('error' in auth) return auth.error;

  const { id } = await params;

  const body = await readJson(request);
  if ('error' in body) return body.error;

  const parsed = patchSchema.safeParse(body.data);
  if (!parsed.success) return validationError(parsed.error.issues);

  const data: Prisma.CommunityBetaFeedbackUpdateInput = {
    reviewedById: auth.session.profile!.id,
  };
  if (parsed.data.status !== undefined) data.status = parsed.data.status;
  if (parsed.data.triageNote !== undefined) data.triageNote = parsed.data.triageNote;
  if (parsed.data.roadmapUrl !== undefined) data.roadmapUrl = parsed.data.roadmapUrl;

  try {
    const feedback = await prisma.communityBetaFeedback.update({
      where: { id },
      data,
      select: {
        id: true,
        status: true,
        triageNote: true,
        roadmapUrl: true,
        reviewedById: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ feedback });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    throw err;
  }
}
