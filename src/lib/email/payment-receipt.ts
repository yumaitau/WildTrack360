import 'server-only';

import {
  loadReceiptData,
  receiptKindLabel,
  formatAmountCents,
  formatAbn,
  resolveThankYouMessage,
} from '../receipts';
import { sendEmail } from './resend';
import { PaymentReceiptEmail } from './templates/payment-receipt';

// Email a branded receipt to the payer after a successful payment. Best-effort:
// returns silently when Resend isn't configured or the payment can't be loaded,
// so it never blocks payment processing. Callers should also wrap in try/catch.
export async function sendPaymentReceiptEmail(paymentId: string, orgId: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) return; // email not configured — no-op

  const data = await loadReceiptData(paymentId, orgId);
  if (!data) return;

  const { payment, org, donorEmail, donorName, taxDeductible } = data;
  if (!donorEmail || donorEmail === 'unknown@example.com') return;

  const thankYou = resolveThankYouMessage(data.thankYouMessage, donorName);

  const amountFormatted = formatAmountCents(payment.amountCents, payment.currency);
  const dateFormatted = new Date(payment.createdAt).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const taxNotice = taxDeductible
    ? `This receipt is for a gift of money of $2 or more to a Deductible Gift Recipient endorsed under Subdivision 30-B of the Income Tax Assessment Act 1997. Tax-deductible amount: ${amountFormatted}.`
    : payment.kind.startsWith('MEMBERSHIP')
      ? 'Membership fees are not tax deductible. Please retain this receipt for your records.'
      : 'This organisation is not endorsed as a Deductible Gift Recipient. Donations made here are not tax deductible.';

  await sendEmail({
    to: donorEmail,
    subject: payment.receiptNumber
      ? `Receipt ${payment.receiptNumber} from ${org.name}`
      : `Receipt from ${org.name}`,
    react: PaymentReceiptEmail({
      orgName: org.name,
      abn: org.abn ? formatAbn(org.abn) : null,
      contactEmail: org.contactEmail,
      contactPhone: org.contactPhone,
      donorName,
      thankYou,
      receiptNumber: payment.receiptNumber,
      description: receiptKindLabel(payment.kind),
      amountFormatted,
      currency: payment.currency,
      dateFormatted,
      taxNotice,
    }),
    tags: [
      { name: 'kind', value: 'payment-receipt' },
      { name: 'payment_kind', value: payment.kind },
    ],
  });
}
