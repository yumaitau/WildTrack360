import Link from 'next/link';
import { auth } from '@/lib/clerk-server';
import { redirect } from 'next/navigation';
import { ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getEnrichedCarers } from '@/lib/carer-helpers';
import { fetchFeedRosterItems } from '@/lib/feed-roster';
import { getUserRole } from '@/lib/rbac';
import FeedRosterClient from './feed-roster-client';

export const metadata = {
  title: 'Feed Roster - WildTrack360',
};

export default async function FeedRosterPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/landing');

  const role = await getUserRole(userId, orgId);
  const carers = await getEnrichedCarers(orgId);
  const carerMap = new Map(
    carers.map((carer) => [carer.id, carer.name || carer.email || 'Carer email unavailable'])
  );
  const rosterItems = await fetchFeedRosterItems(role, userId, orgId, carerMap);

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/tools">
          <Button variant="outline" size="icon" className="shrink-0" aria-label="Back to tools">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <Link href="/">
          <Button variant="outline" size="icon" className="shrink-0" aria-label="Home">
            <Home className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Feed Roster</h1>
          <p className="text-sm text-muted-foreground">
            Daily feeding status for animals currently in care.
          </p>
        </div>
      </div>
      <FeedRosterClient initialItems={rosterItems} />
    </div>
  );
}
