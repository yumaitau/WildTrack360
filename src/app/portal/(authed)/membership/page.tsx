import { auth } from '@/lib/clerk-server';
import { redirect } from 'next/navigation';
import { getPortalMember } from '@/lib/portal';
import { prisma } from '@/lib/prisma';
import { MembershipPicker } from './membership-picker';
import { ManageSubscriptions } from './manage-subscriptions';
import { HouseholdManager } from './household-manager';

export default async function MembershipPickerPage() {
  const { userId } = await auth();
  if (!userId) redirect('/portal/sign-in');
  const session = await getPortalMember(userId);
  if (!session) redirect('/portal/no-membership');

  // The household manager is for primary members (not themselves a household
  // member) who hold their own active membership.
  const ownActive =
    !session.member.primaryMemberId &&
    (await prisma.membership.findFirst({
      where: { memberId: session.member.id, status: 'ACTIVE', periodEnd: { gte: new Date() } },
      select: { id: true },
    }));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Renew or join</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a membership tier. One-off tiers grant a year of membership; monthly and annual tiers renew automatically until you cancel.
        </p>
      </div>
      <ManageSubscriptions />
      {ownActive && <HouseholdManager />}
      <MembershipPicker />
    </div>
  );
}
