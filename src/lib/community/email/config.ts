// Community email configuration resolved from the environment. Kept tiny and
// pure so callers can decide whether email is even possible before doing any
// work. WildTrack360 sends through Resend (not SES), so this reads the Resend
// env plus a Community-specific enable flag. Returns null when Resend is not
// configured, so the whole Community email subsystem fails closed and silent in
// unconfigured environments.

export interface CommunityEmailConfig {
  fromEmail: string;
  replyToEmail: string | null;
  appUrl: string;
  // Digest/immediate sends are suppressed when this is false; a test send may
  // still instantiate the provider explicitly.
  enabled: boolean;
}

export function getEmailConfig(): CommunityEmailConfig | null {
  // Resend is the only mail transport. No key → email is impossible → fail closed.
  if (!process.env.RESEND_API_KEY?.trim()) return null;

  const fromEmail =
    process.env.COMMUNITY_EMAIL_FROM?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    'WildTrack360 Community <community@wildtrack360.com.au>';

  const flag = process.env.COMMUNITY_EMAIL_ENABLED?.trim();
  // Default off outside production so a misconfigured staging box never mails
  // real members; explicit "true" opts in anywhere.
  const enabled = flag != null ? flag === 'true' : process.env.NODE_ENV === 'production';

  const appUrl =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    'http://localhost:3000';

  return {
    fromEmail,
    replyToEmail: process.env.COMMUNITY_EMAIL_REPLY_TO?.trim() || null,
    appUrl,
    enabled,
  };
}
