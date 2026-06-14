import type { Square } from 'square';
import { Prisma, type PaymentStatus } from '@prisma/client';
import { prisma } from '../prisma';
import { processingFeeCents } from './money';
import { computeMembershipEnd } from './periods';
import { sendPaymentReceiptEmail } from '../email/payment-receipt';
import { sendPaymentActivityAdminNotification } from '../email/payment-admin-notifications';

function mapStatus(squareStatus: string | undefined): PaymentStatus {
  switch (squareStatus) {
    // Square card-not-present donations are expected to auto-capture as
    // COMPLETED. APPROVED is accepted defensively for edge cases; revisit this
    // mapping before adding delayed-capture support.
    case 'COMPLETED':
    case 'APPROVED':
      return 'SUCCEEDED';
    case 'FAILED':
    case 'CANCELED':
      return 'FAILED';
    default:
      return 'REQUIRES_ACTION';
  }
}

// Apply a Square payment result to the local Payment row. Idempotent: mints the
// receipt number and creates the Donation/Membership row only on the first
// transition to SUCCEEDED. Shared by inline checkout, the billing worker, and
// the payment webhook so the side effects live in exactly one place.
export async function recordSuccessfulPayment(args: {
  localPaymentId?: string;
  squarePayment: Square.Payment;
}): Promise<{ receiptNumber: string | null; status: PaymentStatus }> {
  const sq = args.squarePayment;
  const payment = await findLocalPayment(args.localPaymentId, sq);
  if (!payment) return { receiptNumber: null, status: 'REQUIRES_ACTION' };

  const status = mapStatus(sq.status);
  const paymentUpdateData = {
    status,
    squarePaymentId: sq.id ?? payment.squarePaymentId,
    squareOrderId: sq.orderId ?? payment.squareOrderId,
    processingFeeCents: processingFeeCents(sq) ?? payment.processingFeeCents,
    receiptUrl: sq.receiptUrl ?? payment.receiptUrl,
  };

  if (status !== 'SUCCEEDED') {
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: paymentUpdateData,
    });
    return { receiptNumber: updated.receiptNumber, status };
  }

  const result = await prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: { not: 'SUCCEEDED' } },
      data: paymentUpdateData,
    });

    if (claimed.count === 0) {
      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: paymentUpdateData,
      });
      return { firstSuccess: false, receiptNumber: updated.receiptNumber, status };
    }

    const receiptNumber =
      payment.receiptNumber ?? (await nextReceiptNumberForClient(tx, payment.clerkOrganizationId));
    const updated = await tx.payment.update({
      where: { id: payment.id },
      data: { receiptNumber },
    });

    const meta = (payment.metadata ?? {}) as Record<string, unknown>;
    const recurringSubscriptionId = (meta.recurringSubscriptionId as string) ?? null;

    if (payment.kind === 'DONATION_ONE_OFF' || payment.kind === 'DONATION_RECURRING') {
      await tx.donation.create({
        data: {
          clerkOrganizationId: payment.clerkOrganizationId,
          memberId: payment.memberId,
          donorEmail: (meta.donorEmail as string) ?? sq.buyerEmailAddress ?? 'unknown@example.com',
          donorName: (meta.donorName as string) ?? null,
          amountCents: payment.amountCents,
          feeCents: payment.applicationFeeCents,
          currency: payment.currency,
          isAnonymous: Boolean(meta.isAnonymous),
          message: (meta.message as string) ?? null,
          paymentId: payment.id,
          recurringSubscriptionId,
        },
      });
    } else if (payment.kind === 'MEMBERSHIP_ONE_OFF' || payment.kind === 'MEMBERSHIP_RECURRING') {
      const tierId = meta.tierId as string | undefined;
      let missingMembershipInput = false;

      if (!tierId) {
        missingMembershipInput = true;
        console.warn('Membership payment succeeded but metadata.tierId is missing', {
          paymentId: payment.id,
          orgId: payment.clerkOrganizationId,
        });
      }

      if (!payment.memberId) {
        missingMembershipInput = true;
        console.warn('Membership payment succeeded but payment.memberId is missing', {
          paymentId: payment.id,
          orgId: payment.clerkOrganizationId,
          tierId,
        });
      }

      if (!missingMembershipInput) {
        const tier = await tx.membershipTier.findUnique({ where: { id: tierId } });
        if (!tier) {
          console.warn('Membership payment succeeded but membership tier was not found', {
            paymentId: payment.id,
            orgId: payment.clerkOrganizationId,
            tierId,
          });
        } else {
          const start = new Date();
          const end = computeMembershipEnd(start, tier.billingInterval);
          await tx.membership.create({
            data: {
              clerkOrganizationId: payment.clerkOrganizationId,
              memberId: payment.memberId!,
              tierId: tier.id,
              periodStart: start,
              periodEnd: end,
              status: 'ACTIVE',
              paymentId: payment.id,
              recurringSubscriptionId,
            },
          });
        }
      }
    }

    return { firstSuccess: true, receiptNumber: updated.receiptNumber, status };
  });

  if (!result.firstSuccess) return { receiptNumber: result.receiptNumber, status: result.status };

  await writePaymentAuditLog({
    orgId: payment.clerkOrganizationId,
    paymentId: payment.id,
    kind: payment.kind,
    amountCents: payment.amountCents,
  });

  // Email the branded receipt to the payer. Best-effort: a mail failure must
  // not roll back the payment side effects or fail the webhook/worker.
  try {
    await sendPaymentReceiptEmail(payment.id, payment.clerkOrganizationId);
  } catch (error) {
    console.error('Failed to send payment receipt email:', error);
  }

  // Notify organisation admins about donation, member signup, and renewal
  // activity. Best-effort and deduped per payment so webhooks cannot spam.
  try {
    await sendPaymentActivityAdminNotification(payment.id, payment.clerkOrganizationId);
  } catch (error) {
    console.error('Failed to send payment admin notification email:', error);
  }

  return { receiptNumber: result.receiptNumber, status };
}

async function findLocalPayment(localPaymentId: string | undefined, sq: Square.Payment) {
  if (localPaymentId) return prisma.payment.findUnique({ where: { id: localPaymentId } });
  // Webhook path: our Payment.id is echoed back as the Square referenceId.
  if (sq.referenceId) {
    const byRef = await prisma.payment.findUnique({ where: { id: sq.referenceId } });
    if (byRef) return byRef;
  }
  if (sq.id) return prisma.payment.findUnique({ where: { squarePaymentId: sq.id } });
  return null;
}

async function writePaymentAuditLog({
  orgId,
  paymentId,
  kind,
  amountCents,
}: {
  orgId: string;
  paymentId: string;
  kind: string;
  amountCents: number;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: 'square-webhook',
        userName: null,
        userEmail: null,
        orgId,
        action: 'CREATE',
        entity: 'Payment',
        entityId: paymentId,
        metadata: { kind, amountCents } as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    console.error('Audit log write failed:', error);
  }
}

// Atomic per-org per-year receipt sequence. Final string is
// "{prefix}-{YYYY}-{seq:5}" composed here so the prefix can change without
// backfill. Mirrors the prior Stripe implementation.
type ReceiptNumberClient = Pick<
  Prisma.TransactionClient,
  'receiptSequence' | 'organisationSettings'
>;

async function nextReceiptNumberForClient(
  client: ReceiptNumberClient,
  orgId: string
): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await client.receiptSequence.upsert({
    where: { clerkOrganizationId_year: { clerkOrganizationId: orgId, year } },
    create: { clerkOrganizationId: orgId, year, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
  });
  const settings = await client.organisationSettings.findUnique({
    where: { clerkOrganisationId: orgId },
  });
  const prefix = settings?.receiptPrefix?.trim() || 'RCPT';
  return `${prefix}-${year}-${String(seq.lastNumber).padStart(5, '0')}`;
}

export function nextReceiptNumber(orgId: string): Promise<string> {
  return nextReceiptNumberForClient(prisma, orgId);
}
