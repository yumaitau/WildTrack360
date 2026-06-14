import { auth } from '@/lib/clerk-server';
import { redirect } from 'next/navigation';
import { getPortalMember } from '@/lib/portal';
import { listMemberMessages } from '@/lib/member-messages';
import { Mail } from 'lucide-react';
import { MessagesList, type PortalMessage } from './messages-list';

export default async function PortalMessagesPage() {
  const { userId } = await auth();
  if (!userId) redirect('/portal/sign-in');
  const session = await getPortalMember(userId);
  if (!session) redirect('/portal/no-membership');

  const rows = await listMemberMessages(session.member.id);
  const messages: PortalMessage[] = rows.map((m) => ({
    id: m.id,
    subject: m.subject,
    body: m.body,
    sentByName: m.sentByName,
    readAt: m.readAt?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="h-6 w-6 text-primary" /> Messages
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Messages from the team you support.
        </p>
      </div>

      <MessagesList messages={messages} />
    </div>
  );
}
