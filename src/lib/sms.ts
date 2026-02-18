import 'server-only';

import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

const FROM_NUMBER = process.env.TWILIO_FROM_NUMBER!;

/**
 * Normalise an Australian phone number to E.164 format (+61...).
 * Handles: "0412345678", "0412 345 678", "04-1234-5678", "+61412345678", "61412345678"
 */
function toE164(phone: string): string {
  // Strip everything except digits and leading +
  const stripped = phone.replace(/[^\d+]/g, '');

  // Already E.164
  if (stripped.startsWith('+61')) return stripped;

  // International without +
  if (stripped.startsWith('61') && stripped.length >= 11) return `+${stripped}`;

  // Local format starting with 0
  if (stripped.startsWith('0')) return `+61${stripped.slice(1)}`;

  // Fallback — return as-is with + prefix
  return stripped.startsWith('+') ? stripped : `+${stripped}`;
}

export async function sendSms(to: string, body: string) {
  return client.messages.create({
    to: toE164(to),
    from: FROM_NUMBER,
    body,
  });
}
