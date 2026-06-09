import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getPortalMember } from '@/lib/portal';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserCog, Calendar, Mail, Phone } from 'lucide-react';

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active',
  LAPSED: 'Lapsed',
  CANCELLED: 'Cancelled',
  DECEASED: 'Inactive',
};

export default async function PortalDashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/portal/sign-in');
  const session = await getPortalMember(userId);
  if (!session) redirect('/portal/no-membership');
  const member = session.member;

  const currentMembership = await prisma.membership.findFirst({
    where: { memberId: member.id, status: 'ACTIVE' },
    include: { tier: true },
    orderBy: { periodEnd: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {member.firstName}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your membership, profile, and giving.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Membership status</CardTitle>
            <Badge variant="outline">{STATUS_LABEL[member.status] ?? member.status}</Badge>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {currentMembership ? (
              <>
                <div className="font-medium">{currentMembership.tier.name}</div>
                <div className="text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Renews {currentMembership.periodEnd.toLocaleDateString('en-AU')}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">
                You don&apos;t have an active membership tier yet. Membership purchase will be available once your organisation has connected Square.
              </p>
            )}
            {member.memberNumber && (
              <div className="text-muted-foreground">
                Member number: <span className="font-mono">{member.memberNumber}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              {member.email}
            </div>
            {member.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {member.phone}
              </div>
            )}
            <Link href="/portal/profile">
              <Button variant="outline" size="sm" className="mt-3">
                <UserCog className="h-4 w-4 mr-2" /> Update profile
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
