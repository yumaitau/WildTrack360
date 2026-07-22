import { NextResponse } from 'next/server';
import { readJson, requireCommunitySession, validationError } from '@/lib/community/api';
import { communityNotificationPreferenceSchema } from '@/lib/community/validation';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const auth = await requireCommunitySession({ profile: true });
  if ('error' in auth) return auth.error;
  const preference = await prisma.communityNotificationPreference.upsert({
    where: { profileId: auth.session.profile!.id },
    create: {
      profileId: auth.session.profile!.id,
      timezone: 'Australia/Sydney',
    },
    update: {},
  });
  return NextResponse.json(preference);
}

export async function PATCH(request: Request) {
  const auth = await requireCommunitySession({ write: true, profile: true });
  if ('error' in auth) return auth.error;
  const body = await readJson(request);
  if ('error' in body) return body.error;
  const parsed = communityNotificationPreferenceSchema.safeParse(body.data);
  if (!parsed.success) return validationError(parsed.error.issues);
  const preference = await prisma.communityNotificationPreference.upsert({
    where: { profileId: auth.session.profile!.id },
    create: { profileId: auth.session.profile!.id, ...parsed.data },
    update: { ...parsed.data, preferenceVersion: { increment: 1 } },
  });
  return NextResponse.json(preference);
}
