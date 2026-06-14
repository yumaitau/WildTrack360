import { auth } from '@/lib/clerk-server';
import { redirect } from 'next/navigation';
import { getPortalMember } from '@/lib/portal';
import { getOpenInterest } from '@/lib/carer-interest';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HeartHandshake, CheckCircle2 } from 'lucide-react';
import { CarerForm } from './carer-form';

export default async function BecomeCarerPage() {
  const { userId } = await auth();
  if (!userId) redirect('/portal/sign-in');
  const session = await getPortalMember(userId);
  if (!session) redirect('/portal/no-membership');

  const open = await getOpenInterest(
    session.member.clerkOrganizationId,
    session.member.id,
    session.email
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <HeartHandshake className="h-6 w-6 text-primary" /> Become a wildlife carer
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Our carers are the heart of what we do. If you&apos;d like to help rescue and rehabilitate
          animals, register your interest and our team will guide you through training and licensing.
        </p>
      </div>

      {open ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="py-6 flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
            <div>
              <p className="font-medium">Your application is in progress</p>
              <p className="text-sm text-muted-foreground mt-1">
                Thanks for putting your hand up to become a carer. Our team has your details and will
                be in touch about next steps. Current status: <strong>{open.status}</strong>.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Register your interest</CardTitle>
          </CardHeader>
          <CardContent>
            <CarerForm defaultPhone={session.member.phone ?? ''} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
