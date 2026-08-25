'server-only';

import type { ReactElement, ReactNode } from 'react';
import { render } from '@react-email/render';
import {
  getPaperboyFromEmail,
  isPaperboyConfigured,
  sendPaperboyEmail,
  type PaperboyTag,
} from './paperboy';

type EmailTag = PaperboyTag;

type SendEmailInput = {
  to: string | string[];
  subject: string;
  react: ReactNode;
  tags?: EmailTag[];
  // Accepted for call-site compatibility. Paperboy has no custom headers, so
  // List-Unsubscribe and any other headers are dropped.
  headers?: Record<string, string>;
};

export { isPaperboyConfigured };

export async function sendEmail({ to, subject, react, tags }: SendEmailInput) {
  if (!isPaperboyConfigured()) {
    throw new Error('PAPERBOY_URL and PAPERBOY_API_KEY are not configured');
  }

  const from = getPaperboyFromEmail('WildTrack360 <notifications@wildtrack360.com.au>');
  const element = react as ReactElement;
  const html = await render(element);
  const text = await render(element, { plainText: true });

  return sendPaperboyEmail({ from, to, subject, html, text, tags });
}
