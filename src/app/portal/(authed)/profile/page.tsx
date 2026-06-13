import { auth } from '@/lib/clerk-server';
import { redirect } from 'next/navigation';
import { getPortalMember } from '@/lib/portal';
import { ProfileForm } from './profile-form';

export default async function PortalProfilePage() {
  const { userId } = await auth();
  if (!userId) redirect('/portal/sign-in');
  const session = await getPortalMember(userId);
  if (!session) redirect('/portal/no-membership');
  const member = session.member;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Your profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Keep your contact and address up to date so your wildlife organisation
          can reach you.
        </p>
      </div>
      <ProfileForm
        initial={{
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          phone: member.phone ?? '',
          addressLine1: member.addressLine1 ?? '',
          addressLine2: member.addressLine2 ?? '',
          suburb: member.suburb ?? '',
          state: member.state ?? '',
          postcode: member.postcode ?? '',
          country: member.country ?? 'AU',
        }}
      />
    </div>
  );
}
