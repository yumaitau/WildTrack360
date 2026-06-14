import { auth } from '@/lib/clerk-server';
import { redirect } from 'next/navigation';
import { getPortalMember } from '@/lib/portal';
import { getMemberImpact } from '@/lib/impact';
import { financialYearShort } from '@/lib/financial-year';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PawPrint, Leaf, Heart, Sprout, HandHeart } from 'lucide-react';

function money(cents: number, currency: string) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency, maximumFractionDigits: 0 }).format(
    cents / 100
  );
}

export default async function PortalImpactPage() {
  const { userId } = await auth();
  if (!userId) redirect('/portal/sign-in');
  const session = await getPortalMember(userId);
  if (!session) redirect('/portal/no-membership');

  const impact = await getMemberImpact(session.member.clerkOrganizationId, session.member);
  const memberSince = new Date(impact.member.memberSince).toLocaleDateString('en-AU', {
    month: 'long',
    year: 'numeric',
  });

  const stats = [
    { icon: PawPrint, label: 'Animals cared for', value: impact.org.animalsHelped.toLocaleString('en-AU') },
    { icon: Sprout, label: 'Returned to the wild', value: impact.org.released.toLocaleString('en-AU') },
    { icon: Leaf, label: 'Species helped', value: impact.org.speciesCount.toLocaleString('en-AU') },
    { icon: HandHeart, label: 'In care right now', value: impact.org.currentlyInCare.toLocaleString('en-AU') },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Heart className="h-6 w-6 text-primary" /> Your impact
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Thank you, {session.member.firstName}. Here&apos;s what your support helps make possible.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6 text-center">
              <s.icon className="h-6 w-6 mx-auto text-primary" />
              <div className="text-2xl font-bold mt-2">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-6 text-center space-y-1">
          <p className="text-sm text-muted-foreground">This financial year ({financialYearShort(impact.org.fyEndYear)})</p>
          <p className="text-xl font-semibold">
            {impact.org.releasedThisFy.toLocaleString('en-AU')} animals released back to the wild
          </p>
          <p className="text-sm text-muted-foreground">
            with the support of members like you{impact.member.hasActiveMembership ? ' — thank you for being one of them' : ''}.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your contribution</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Supporter since</div>
            <div className="font-medium">{memberSince}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Total donated</div>
            <div className="font-medium">{money(impact.member.totalDonatedCents, impact.member.currency)}</div>
          </div>
        </CardContent>
      </Card>

      {impact.recentReleases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recently returned to the wild</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {impact.recentReleases.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2">
                    <Sprout className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium">{a.name}</span>
                    <span className="text-xs text-muted-foreground">{a.species}</span>
                  </div>
                  {a.dateReleased && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(a.dateReleased).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
