import { NextResponse } from 'next/server';
import { requireCommunityModerator } from '@/lib/community/admin';
import { revokeSanction } from '@/lib/community/sanctions';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCommunityModerator();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const revoked = await revokeSanction({
    sanctionId: id,
    actorProfileId: auth.session.profile!.id,
  });

  if (!revoked) {
    return NextResponse.json({ error: 'Sanction not found or already revoked' }, { status: 404 });
  }

  console.log(`[community-admin] sanction revoked sanction=${id}`);

  return NextResponse.json({ sanction: revoked });
}
