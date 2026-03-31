import 'server-only';

import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { prisma } from '@/lib/prisma';
import type { SmsTier, SmsStatus, Environment } from '@prisma/client';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const TIER_LIMITS: Record<SmsTier, number> = {
  NONE: 0,
  LITE: 100,
  STANDARD: 500,
  PRO: 1500,
};

const snsClient = new SNSClient({
  region: process.env.AWS_SNS_REGION ?? 'ap-southeast-2',
  ...(process.env.AWS_SNS_ACCESS_KEY_ID && process.env.AWS_SNS_SECRET_ACCESS_KEY
    ? {
        credentials: {
          accessKeyId: process.env.AWS_SNS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SNS_SECRET_ACCESS_KEY,
        },
      }
    : {}),
});

const SENDER_ID = process.env.SMS_SENDER_ID ?? 'WildTrack';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SmsSendResult = {
  success: boolean;
  blocked: boolean;
  reason?: string;
  snsMessageId?: string;
  usageThisMonth: number;
  limit: number;
  isOverage: boolean;
};

type SendSmsParams = {
  organisationId: string;
  recipientPhone: string;
  messageBody: string;
  purpose: string;       // e.g. "PIN_DROP_LINK"
  sentById?: string;     // Clerk userId
  environment?: Environment;
};

// ---------------------------------------------------------------------------
// Phone normalisation (AU-only)
// ---------------------------------------------------------------------------

/**
 * Normalise an Australian phone number to E.164 format (+61...).
 * Only handles AU formats — other country numbers should already be in E.164.
 */
function toE164(phone: string): string {
  const stripped = phone.replace(/[^\d+]/g, '');

  if (stripped.startsWith('+61')) return stripped;
  if (stripped.startsWith('61') && stripped.length >= 11) return `+${stripped}`;
  if (stripped.startsWith('0')) return `+61${stripped.slice(1)}`;

  return stripped.startsWith('+') ? stripped : `+${stripped}`;
}

// ---------------------------------------------------------------------------
// Core: check limit -> send -> log (with atomic usage increment)
// ---------------------------------------------------------------------------

export async function sendSms(params: SendSmsParams): Promise<SmsSendResult> {
  const {
    organisationId,
    recipientPhone,
    messageBody,
    purpose,
    sentById,
    environment = 'PRODUCTION',
  } = params;

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1; // 1-indexed, UTC

  // 1. Get org's SMS subscription
  const subscription = await prisma.smsSubscription.findUnique({
    where: { organisationId },
  });

  if (!subscription || subscription.tier === 'NONE') {
    await logSms({ organisationId, environment, recipientPhone, messageBody, purpose, sentById, status: 'BLOCKED' });
    return {
      success: false,
      blocked: true,
      reason: 'SMS is not enabled for this organisation. Contact your administrator to enable an SMS plan.',
      usageThisMonth: 0,
      limit: 0,
      isOverage: false,
    };
  }

  const limit = subscription.monthlyLimit || TIER_LIMITS[subscription.tier];

  // 2. Atomic check-and-increment inside a transaction to prevent races
  let usageCount: number;
  let isOverage: boolean;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const usage = await tx.smsUsageSummary.upsert({
        where: {
          organisationId_environment_year_month: { organisationId, environment, year, month },
        },
        create: { organisationId, environment, year, month, messageCount: 0, overageCount: 0 },
        update: {},
      });

      const overLimit = usage.messageCount >= limit;

      if (overLimit && !subscription.overageEnabled) {
        return { blocked: true, messageCount: usage.messageCount, isOverage: true };
      }

      // Increment atomically
      const updated = await tx.smsUsageSummary.update({
        where: {
          organisationId_environment_year_month: { organisationId, environment, year, month },
        },
        data: {
          messageCount: { increment: 1 },
          ...(overLimit ? { overageCount: { increment: 1 } } : {}),
        },
      });

      return { blocked: false, messageCount: updated.messageCount, isOverage: overLimit };
    });

    if (result.blocked) {
      await logSms({ organisationId, environment, recipientPhone, messageBody, purpose, sentById, status: 'BLOCKED' });
      return {
        success: false,
        blocked: true,
        reason: `Monthly SMS limit of ${limit} reached. Overage is not enabled for this organisation.`,
        usageThisMonth: result.messageCount,
        limit,
        isOverage: true,
      };
    }

    usageCount = result.messageCount;
    isOverage = result.isOverage;
  } catch (error) {
    console.error('[SMS] Usage check failed:', error);
    return {
      success: false,
      blocked: false,
      reason: 'SMS service temporarily unavailable. Please try again.',
      usageThisMonth: 0,
      limit,
      isOverage: false,
    };
  }

  // 3. Send via SNS
  let snsMessageId: string | undefined;
  try {
    const command = new PublishCommand({
      PhoneNumber: toE164(recipientPhone),
      Message: messageBody,
      MessageAttributes: {
        'AWS.SNS.SMS.SenderID': {
          DataType: 'String',
          StringValue: SENDER_ID,
        },
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional',
        },
      },
    });

    const response = await snsClient.send(command);
    snsMessageId = response.MessageId;
  } catch (error) {
    console.error('[SMS] SNS send failed:', error);
    await logSms({ organisationId, environment, recipientPhone, messageBody, purpose, sentById, status: 'FAILED' });
    return {
      success: false,
      blocked: false,
      reason: 'SMS delivery failed. Please try again.',
      usageThisMonth: usageCount,
      limit,
      isOverage,
    };
  }

  // 4. Log the successful send
  await logSms({ organisationId, environment, recipientPhone, messageBody, purpose, sentById, status: 'SENT', snsMessageId });

  return {
    success: true,
    blocked: false,
    snsMessageId,
    usageThisMonth: usageCount,
    limit,
    isOverage,
  };
}

// ---------------------------------------------------------------------------
// Usage query (for admin dashboards)
// ---------------------------------------------------------------------------

export async function getOrgSmsUsage(
  organisationId: string,
  environment: Environment = 'PRODUCTION'
) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;

  const [subscription, usage] = await Promise.all([
    prisma.smsSubscription.findUnique({ where: { organisationId } }),
    prisma.smsUsageSummary.upsert({
      where: { organisationId_environment_year_month: { organisationId, environment, year, month } },
      create: { organisationId, environment, year, month, messageCount: 0, overageCount: 0 },
      update: {},
    }),
  ]);

  const tier = subscription?.tier ?? 'NONE';
  const limit = subscription?.monthlyLimit || TIER_LIMITS[tier];

  return {
    tier,
    limit,
    used: usage.messageCount,
    overage: usage.overageCount,
    remaining: Math.max(0, limit - usage.messageCount),
    overageEnabled: subscription?.overageEnabled ?? false,
    percentUsed: limit > 0 ? Math.round((usage.messageCount / limit) * 100) : 0,
  };
}

// ---------------------------------------------------------------------------
// Threshold warning check
// ---------------------------------------------------------------------------

export function getUsageWarningLevel(used: number, limit: number): string | null {
  if (limit === 0) return null;
  const pct = (used / limit) * 100;
  if (pct >= 100) return 'LIMIT_REACHED';
  if (pct >= 90) return '90_PERCENT';
  if (pct >= 75) return '75_PERCENT';
  return null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function logSms(data: {
  organisationId: string;
  environment: Environment;
  recipientPhone: string;
  messageBody?: string;
  purpose: string;
  sentById?: string;
  status: SmsStatus;
  snsMessageId?: string;
}) {
  try {
    await prisma.smsLog.create({
      data: {
        organisationId: data.organisationId,
        environment: data.environment,
        recipientPhone: data.recipientPhone,
        messagePreview: data.messageBody?.slice(0, 50) || null,
        purpose: data.purpose,
        sentById: data.sentById,
        status: data.status,
        snsMessageId: data.snsMessageId,
      },
    });
  } catch (error) {
    // Log failures should not break SMS flow
    console.error('[SMS] Failed to write SMS log:', error);
  }
}
