import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { readJson, validationError } from '@/lib/community/api';
import { requireCommunityModerator } from '@/lib/community/admin';
import { prisma } from '@/lib/prisma';

const patchSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    categoryId: z.string().trim().min(1).nullable().optional(),
    isReadOnly: z.boolean().optional(),
    isArchived: z.boolean().optional(),
    isPinned: z.boolean().optional(),
    slowModeSeconds: z.number().int().min(0).max(86400).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'No fields to update' });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCommunityModerator();
  if ('error' in auth) return auth.error;
  const { id } = await params;

  const body = await readJson(request);
  if ('error' in body) return body.error;
  const parsed = patchSchema.safeParse(body.data);
  if (!parsed.success) return validationError(parsed.error.issues);

  const existing = await prisma.communityChatRoom.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

  if (parsed.data.categoryId) {
    const category = await prisma.communityCategory.findUnique({
      where: { id: parsed.data.categoryId },
      select: { id: true },
    });
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 400 });
  }

  const room = await prisma.communityChatRoom.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      ...(parsed.data.categoryId !== undefined ? { categoryId: parsed.data.categoryId } : {}),
      ...(parsed.data.isReadOnly !== undefined ? { isReadOnly: parsed.data.isReadOnly } : {}),
      ...(parsed.data.isArchived !== undefined ? { isArchived: parsed.data.isArchived } : {}),
      ...(parsed.data.isPinned !== undefined ? { isPinned: parsed.data.isPinned } : {}),
      ...(parsed.data.slowModeSeconds !== undefined
        ? { slowModeSeconds: parsed.data.slowModeSeconds }
        : {}),
    },
  });
  return NextResponse.json({ room });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCommunityModerator();
  if ('error' in auth) return auth.error;
  const { id } = await params;

  const existing = await prisma.communityChatRoom.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

  const messageCount = await prisma.communityChatMessage.count({ where: { roomId: id } });
  if (messageCount > 0) {
    await prisma.communityChatRoom.update({ where: { id }, data: { isArchived: true } });
    return NextResponse.json({ archived: true });
  }

  await prisma.communityChatRoom.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
