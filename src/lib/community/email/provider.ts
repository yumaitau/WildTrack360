import 'server-only';

import { Resend } from 'resend';
import { getEmailConfig, type CommunityEmailConfig } from './config';

export interface EmailMessage {
  to: string[];
  subject: string;
  text: string;
  html: string;
}

export interface EmailSendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailProvider {
  sendEmail(message: EmailMessage): Promise<EmailSendResult>;
}

let resendClient: Resend | null = null;
function getResend(): Resend {
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

function createProvider(config: CommunityEmailConfig): EmailProvider {
  return {
    async sendEmail(message) {
      try {
        const response = await getResend().emails.send({
          from: config.fromEmail,
          to: message.to,
          subject: message.subject,
          text: message.text,
          html: message.html,
          replyTo: config.replyToEmail ?? undefined,
        });
        if (response.error) {
          // Return a privacy-safe error code, never the message content.
          return { ok: false, error: response.error.name ?? 'send-failed' };
        }
        return { ok: true, messageId: response.data?.id ?? undefined };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.name : 'send-failed' };
      }
    },
  };
}

// Provider for the scheduled digest/immediate paths. Returns null when email is
// unconfigured OR the enable flag is off, so cron simply no-ops rather than
// throwing. Callers must handle null.
export function getEmailProvider(): EmailProvider | null {
  const config = getEmailConfig();
  if (!config || !config.enabled) return null;
  return createProvider(config);
}

// Provider for an explicit, human-triggered test send. Ignores the enable flag
// but still requires configured Resend credentials. Returns null when unconfigured.
export function getTestEmailProvider(): EmailProvider | null {
  const config = getEmailConfig();
  if (!config) return null;
  return createProvider(config);
}
