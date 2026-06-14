import { auth } from '@/lib/clerk-server';
import { redirect } from 'next/navigation';
import { getPortalMember } from '@/lib/portal';
import { listPublishedNews } from '@/lib/news';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Megaphone } from 'lucide-react';

export default async function PortalNewsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/portal/sign-in');
  const session = await getPortalMember(userId);
  if (!session) redirect('/portal/no-membership');

  const posts = await listPublishedNews(session.member.clerkOrganizationId);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-primary" /> News &amp; updates
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          The latest from the team you support.
        </p>
      </div>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No updates have been posted yet. Check back soon.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle className="text-lg">{p.title}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {p.authorName ? `${p.authorName} · ` : ''}
                  {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('en-AU', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  }) : ''}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{p.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
