'server-only';

import { prisma } from './prisma';
import type { Prisma } from '@prisma/client';

export interface NewsInput {
  title: string;
  body: string;
}

function pick(body: Record<string, unknown>): Partial<NewsInput> {
  const out: Partial<NewsInput> = {};
  if (typeof body.title === 'string') out.title = body.title.trim();
  if (typeof body.body === 'string') out.body = body.body;
  return out;
}

// Admin view: every post for the org, newest first.
export function listNews(orgId: string) {
  return prisma.newsPost.findMany({
    where: { clerkOrganizationId: orgId },
    orderBy: [{ createdAt: 'desc' }],
  });
}

// Member-facing feed: published posts only, most recently published first.
export function listPublishedNews(orgId: string, limit = 50) {
  return prisma.newsPost.findMany({
    where: { clerkOrganizationId: orgId, status: 'PUBLISHED' },
    orderBy: [{ publishedAt: 'desc' }],
    take: limit,
  });
}

export function getNews(id: string, orgId: string) {
  return prisma.newsPost.findFirst({ where: { id, clerkOrganizationId: orgId } });
}

export async function createNews(
  orgId: string,
  body: Record<string, unknown>,
  author: { clerkUserId: string; name: string | null }
) {
  const data = pick(body);
  if (!data.title || !data.body?.trim()) {
    throw new Error('title and body are required');
  }
  return prisma.newsPost.create({
    data: {
      clerkOrganizationId: orgId,
      title: data.title,
      body: data.body,
      authorClerkUserId: author.clerkUserId,
      authorName: author.name,
    },
  });
}

export async function updateNews(id: string, orgId: string, body: Record<string, unknown>) {
  const data = pick(body);
  const update: Prisma.NewsPostUpdateInput = {};
  if (data.title !== undefined) update.title = data.title;
  if (data.body !== undefined) update.body = data.body;
  if (Object.keys(update).length === 0) {
    throw new Error('No updatable fields provided');
  }

  const result = await prisma.newsPost.updateMany({
    where: { id, clerkOrganizationId: orgId },
    data: update,
  });
  if (result.count === 0) throw new Error('News post not found');
  return prisma.newsPost.findUnique({ where: { id } });
}

export async function deleteNews(id: string, orgId: string) {
  const result = await prisma.newsPost.deleteMany({
    where: { id, clerkOrganizationId: orgId },
  });
  if (result.count === 0) throw new Error('News post not found');
}

// Mark a post published. Idempotent on publishedAt so re-publishing a live post
// doesn't move its timestamp. Returns the post; the caller decides whether to
// broadcast the email (and records emailSentAt via markNewsEmailed).
export async function publishNews(id: string, orgId: string) {
  const post = await getNews(id, orgId);
  if (!post) throw new Error('News post not found');
  if (post.status === 'PUBLISHED') return post;
  return prisma.newsPost.update({
    where: { id },
    data: { status: 'PUBLISHED', publishedAt: post.publishedAt ?? new Date() },
  });
}

export async function unpublishNews(id: string, orgId: string) {
  const result = await prisma.newsPost.updateMany({
    where: { id, clerkOrganizationId: orgId },
    data: { status: 'DRAFT' },
  });
  if (result.count === 0) throw new Error('News post not found');
  return prisma.newsPost.findUnique({ where: { id } });
}

export async function markNewsEmailed(id: string, recipientCount: number) {
  await prisma.newsPost.update({
    where: { id },
    data: { emailSentAt: new Date(), recipientCount },
  });
}
