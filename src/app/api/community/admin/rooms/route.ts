import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { readJson, validationError } from '@/lib/community/api';
import { requireCommunityModerator } from '@/lib/community/admin';
import { prisma } from '@/lib/prisma';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(slugPattern, 'Use lowercase letters, numbers and hyphens'),
  description: z.string().trim().max(500).optional().nullable(),
  categoryId: z.string().trim().min(1).optional().nullable(),
  slowModeSeconds: z.number().int().min(0).max(86400).optional(),
  isPinned: z.boolean().optional(),
});

export async function GET() {
  const auth = await requireCommunityModerator();
  if ('error' in auth) return auth.error;

  const rooms = await prisma.communityChatRoom.findMany({
    orderBy: [{ isPinned: 'desc' }, { name: 'asc' }],
    include: {
      category: { select: { id: true, name: true, slug: true } },
      _count: { select: { messages: true } },
    },
  });
  return NextResponse.json({ items: rooms });
}

export async function POST(request: NextRequest) {
  const auth = await requireCommunityModerator();
  if ('error' in auth) return auth.error;

  const body = await readJson(request);
  if ('error' in body) return body.error;
  const parsed = createSchema.safeParse(body.data);
  if (!parsed.success) return validationError(parsed.error.issues);

  if (parsed.data.categoryId) {
    const category = await prisma.communityCategory.findUnique({
      where: { id: parsed.data.categoryId },
      select: { id: true },
    });
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 400 });
  }

  try {
    const room = await prisma.communityChatRoom.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description ?? null,
        categoryId: parsed.data.categoryId ?? null,
        slowModeSeconds: parsed.data.slowModeSeconds ?? 0,
        isPinned: parsed.data.isPinned ?? false,
      },
    });
    return NextResponse.json({ room }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'A room with that slug already exists' }, { status: 409 });
    }
    throw error;
  }
}
