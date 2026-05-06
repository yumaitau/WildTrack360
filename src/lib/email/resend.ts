import 'server-only';

import type { ReactNode } from 'react';
import { Resend } from 'resend';

type EmailTag = {
  name: string;
  value: string;
};

type SendEmailInput = {
  to: string | string[];
  subject: string;
  react: ReactNode;
  tags?: EmailTag[];
  headers?: Record<string, string>;
};

let resendClient: Resend | null = null;

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }

  return resendClient;
}

export async function sendEmail({ to, subject, react, tags, headers }: SendEmailInput) {
  const from = process.env.RESEND_FROM_EMAIL ?? 'WildTrack360 <notifications@wildtrack360.com.au>';
  const unsubscribeUrl =
    process.env.ADMIN_NOTIFICATION_UNSUBSCRIBE_URL ?? 'mailto:unsubscribe@wildtrack360.com.au';

  const response = await getResendClient().emails.send({
    from,
    to,
    subject,
    react,
    tags,
    headers: {
      'List-Unsubscribe': unsubscribeUrl.startsWith('mailto:')
        ? `<${unsubscribeUrl}>`
        : `<${unsubscribeUrl}>`,
      ...headers,
    },
  });

  if (response.error) {
    throw new Error(response.error.message);
  }

  return {
    id: response.data?.id ?? null,
  };
}
