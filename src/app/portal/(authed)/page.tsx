import { auth } from '@/lib/clerk-server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getPortalMember } from '@/lib/portal';
import { prisma } from '@/lib/prisma';
import { listPublishedNews } from '@/lib/news';
import { countUnreadMessages } from '@/lib/member-messages';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserCog, Calendar, Mail, Phone, Megaphone, ArrowRight } from 'lucide-react';

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

  const [latestNews, unreadCount] = await Promise.all([
    listPublishedNews(member.clerkOrganizationId, 3),
    countUnreadMessages(member.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {member.firstName}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your membership, profile, and giving.
        </p>
      </div>

      {unreadCount > 0 && (
        <Link href="/portal/messages">
          <Card className="border-primary/40 transition-colors hover:bg-accent">
            <CardContent className="py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 text-primary p-2">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="text-sm">
                  You have{' '}
                  <span className="font-semibold">
                    {unreadCount} new message{unreadCount === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      )}

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

      {latestNews.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-primary" /> Latest news
            </CardTitle>
            <Link href="/portal/news">
              <Button variant="ghost" size="sm">
                View all <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestNews.map((p) => (
              <Link key={p.id} href="/portal/news" className="block group">
                <div className="rounded-md border p-3 transition-colors group-hover:bg-accent">
                  <div className="font-medium text-sm">{p.title}</div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 whitespace-pre-wrap">
                    {p.body}
                  </p>
                  {p.publishedAt && (
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      {new Date(p.publishedAt).toLocaleDateString('en-AU', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
