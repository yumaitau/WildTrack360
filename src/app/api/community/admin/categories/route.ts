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
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const auth = await requireCommunityModerator();
  if ('error' in auth) return auth.error;

  const categories = await prisma.communityCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { posts: true, chatRooms: true } } },
  });
  return NextResponse.json({ items: categories });
}

export async function POST(request: NextRequest) {
  const auth = await requireCommunityModerator();
  if ('error' in auth) return auth.error;

  const body = await readJson(request);
  if ('error' in body) return body.error;
  const parsed = createSchema.safeParse(body.data);
  if (!parsed.success) return validationError(parsed.error.issues);

  try {
    const category = await prisma.communityCategory.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description ?? null,
        sortOrder: parsed.data.sortOrder ?? 0,
        isActive: parsed.data.isActive ?? true,
      },
    });
    return NextResponse.json({ category }, { status: 201 });
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
