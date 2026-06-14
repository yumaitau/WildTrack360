'server-only';

import { sendEmail } from './resend';
import { MemberBroadcastEmail } from './templates/member-broadcast';

const PORTAL_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.wildtrack360.com.au';

interface OrgContact {
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
}

// Email a single admin → member message. Best-effort: no-op when Resend isn't
// configured. Caller is responsible for batching / error handling.
export async function sendMemberMessageEmail(
  to: string,
  org: OrgContact,
  msg: { subject: string; body: string; memberFirstName: string }
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;
  await sendEmail({
    to,
    subject: msg.subject,
    react: MemberBroadcastEmail({
      orgName: org.name,
      eyebrow: 'A message for you',
      heading: msg.subject,
      greeting: msg.memberFirstName ? `Hi ${msg.memberFirstName},` : null,
      body: msg.body,
      ctaLabel: 'Open the member portal',
      ctaUrl: `${PORTAL_URL}/portal/messages`,
      contactEmail: org.contactEmail,
      contactPhone: org.contactPhone,
      footerNote: 'You are receiving this because you are a member or supporter.',
    }),
    tags: [{ name: 'kind', value: 'member-message' }],
  });
  return true;
}

// Email a published news post to one member. Best-effort.
export async function sendNewsPostEmail(
  to: string,
  org: OrgContact,
  post: { title: string; body: string; memberFirstName: string }
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;
  await sendEmail({
    to,
    subject: `${post.title} — ${org.name}`,
    react: MemberBroadcastEmail({
      orgName: org.name,
      eyebrow: 'News',
      heading: post.title,
      greeting: post.memberFirstName ? `Hi ${post.memberFirstName},` : null,
      body: post.body,
      ctaLabel: 'Read more in the portal',
      ctaUrl: `${PORTAL_URL}/portal/news`,
      contactEmail: org.contactEmail,
      contactPhone: org.contactPhone,
      footerNote: 'You are receiving this because you are a member or supporter.',
    }),
    tags: [{ name: 'kind', value: 'news-post' }],
  });
  return true;
}

interface NewsRecipient {
  email: string;
  firstName: string;
}

// Fan out a news post to many members in small concurrent batches so a large
// roster doesn't hammer Resend. Returns the number of emails that sent OK.
export async function broadcastNewsPost(
  recipients: NewsRecipient[],
  org: OrgContact,
  post: { title: string; body: string }
): Promise<number> {
  if (!process.env.RESEND_API_KEY) return 0;
  const BATCH = 20;
  let sent = 0;
  for (let i = 0; i < recipients.length; i += BATCH) {
    const slice = recipients.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      slice.map((r) =>
        sendNewsPostEmail(r.email, org, {
          title: post.title,
          body: post.body,
          memberFirstName: r.firstName,
        })
      )
    );
    sent += results.filter((res) => res.status === 'fulfilled' && res.value).length;
  }
  return sent;
}
