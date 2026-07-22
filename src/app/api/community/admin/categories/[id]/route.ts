import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { readJson, validationError } from '@/lib/community/api';
import { requireCommunityModerator } from '@/lib/community/admin';
import { prisma } from '@/lib/prisma';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const patchSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(60)
      .regex(slugPattern, 'Use lowercase letters, numbers and hyphens')
      .optional(),
    description: z.string().trim().max(500).nullable().optional(),
    sortOrder: z.number().int().min(0).max(9999).optional(),
    isActive: z.boolean().optional(),
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

  const existing = await prisma.communityCategory.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

  try {
    const category = await prisma.communityCategory.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.slug !== undefined ? { slug: parsed.data.slug } : {}),
        ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
        ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
        ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
      },
    });
    return NextResponse.json({ category });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A category with that slug already exists' },
        { status: 409 }
      );
    }
    throw error;
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCommunityModerator();
  if ('error' in auth) return auth.error;
  const { id } = await params;

  const existing = await prisma.communityCategory.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

  const [postCount, roomCount] = await Promise.all([
    prisma.communityPost.count({ where: { categoryId: id } }),
    prisma.communityChatRoom.count({ where: { categoryId: id } }),
  ]);
  if (postCount > 0 || roomCount > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete a category still referenced by ${postCount} post(s) and ${roomCount} room(s). Deactivate it instead.`,
      },
      { status: 409 }
    );
  }

  await prisma.communityCategory.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
