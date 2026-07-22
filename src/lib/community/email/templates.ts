import type { CommunityNotificationType } from '@prisma/client';
import type { DigestSection } from './digest';

export interface CommunityDigestEmailInput {
  displayName: string;
  sections: DigestSection[];
  itemCount: number;
  appUrl: string;
  unsubscribeAllUrl: string;
  digestDowngradeUrl: string;
  settingsUrl: string;
}

export interface RenderedCommunityEmail {
  subject: string;
  text: string;
  html: string;
}

const TYPE_LABEL: Record<CommunityNotificationType, string> = {
  REPLY: 'Replies',
  MENTION: 'Mentions',
  ACCEPTED_ANSWER: 'Accepted answers',
  REACTION_SUMMARY: 'Reactions',
  FOLLOWED_POST_ACTIVITY: 'Followed posts',
  MODERATION_DECISION: 'Moderation decisions',
  REPORT_OUTCOME: 'Report outcomes',
  APPEAL_OUTCOME: 'Appeal outcomes',
  BETA_ANNOUNCEMENT: 'Announcements',
};

function labelFor(type: CommunityNotificationType): string {
  return TYPE_LABEL[type] ?? 'Updates';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function communityDigestEmail(input: CommunityDigestEmailInput): RenderedCommunityEmail {
  const { displayName, sections, itemCount } = input;
  const plural = itemCount === 1 ? 'update' : 'updates';
  const subject = `[WildTrack360 Community] ${itemCount} new ${plural}`;

  // --- plain text ---
  const textLines: string[] = [];
  textLines.push(subject);
  textLines.push('');
  textLines.push(`Hi ${displayName},`);
  textLines.push('');
  textLines.push(`You have ${itemCount} unread community ${plural} waiting in WildTrack360.`);
  textLines.push('');
  for (const section of sections) {
    textLines.push(`== ${labelFor(section.type)} (${section.count}) ==`);
    for (const item of section.items) {
      textLines.push(`- ${item.title}`);
      textLines.push(`  ${item.href}`);
    }
    textLines.push('');
  }
  textLines.push('—');
  textLines.push(`Manage notifications: ${input.settingsUrl}`);
  textLines.push(`Switch to a daily digest: ${input.digestDowngradeUrl}`);
  textLines.push(`Turn off all community emails: ${input.unsubscribeAllUrl}`);
  const text = textLines.join('\n');

  // --- HTML ---
  const sectionHtml = sections
    .map((section) => {
      const rows = section.items
        .map(
          (item) => `<li style="margin-bottom:10px">
            <a href="${escapeHtml(item.href)}" style="color:#2f6f4f;text-decoration:none;font-weight:600">${escapeHtml(item.title)}</a>
          </li>`
        )
        .join('');
      return `<h3 style="color:#1a1a1a;margin-bottom:6px;font-size:15px">${escapeHtml(labelFor(section.type))} <span style="color:#888;font-weight:400">(${section.count})</span></h3>
        <ul style="padding-left:18px;margin-top:0;list-style:disc">${rows}</ul>`;
    })
    .join('');

  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;max-width:640px;margin:0 auto;padding:16px">
    <h2 style="margin-bottom:2px">WildTrack360 Community</h2>
    <div style="color:#555;font-size:13px">Hi ${escapeHtml(displayName)} &middot; ${itemCount} new ${plural}</div>
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:16px 0"/>
    ${sectionHtml || '<p>No new community updates right now.</p>'}
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:16px 0"/>
    <p style="color:#777;font-size:12px;line-height:1.6">
      You received this because you have community email notifications enabled in WildTrack360.<br/>
      <a href="${escapeHtml(input.settingsUrl)}" style="color:#2f6f4f">Manage notification settings</a>
      &middot;
      <a href="${escapeHtml(input.digestDowngradeUrl)}" style="color:#2f6f4f">Switch to a daily digest</a>
      &middot;
      <a href="${escapeHtml(input.unsubscribeAllUrl)}" style="color:#2f6f4f">Unsubscribe from all community email</a>
    </p>
  </body></html>`;

  return { subject, text, html };
}
