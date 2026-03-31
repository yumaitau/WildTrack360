'server-only';

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
  credentials: {
    accessKeyId: process.env.AWS_SNS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SNS_SECRET_ACCESS_KEY!,
  },
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
// Phone normalisation
// ---------------------------------------------------------------------------

/**
 * Normalise an Australian phone number to E.164 format (+61...).
 * Handles: "0412345678", "0412 345 678", "04-1234-5678", "+61412345678", "61412345678"
 */
function toE164(phone: string): string {
  const stripped = phone.replace(/[^\d+]/g, '');

  if (stripped.startsWith('+61')) return stripped;
  if (stripped.startsWith('61') && stripped.length >= 11) return `+${stripped}`;
  if (stripped.startsWith('0')) return `+61${stripped.slice(1)}`;

  return stripped.startsWith('+') ? stripped : `+${stripped}`;
}

// ---------------------------------------------------------------------------
// Core: check limit -> send -> log
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
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-indexed

  // 1. Get org's SMS subscription
  const subscription = await prisma.smsSubscription.findUnique({
    where: { organisationId },
  });

  if (!subscription || subscription.tier === 'NONE') {
    await logSms({
      organisationId,
      environment,
      recipientPhone,
      messageBody,
      purpose,
      sentById,
      status: 'BLOCKED',
    });

    return {
      success: false,
      blocked: true,
      reason: 'SMS is not enabled for this organisation. Contact your administrator to enable an SMS plan.',
      usageThisMonth: 0,
      limit: 0,
      isOverage: false,
    };
  }

  // 2. Get or create the monthly usage summary
  const usage = await getOrCreateUsageSummary(organisationId, environment, year, month);
  const limit = subscription.monthlyLimit || TIER_LIMITS[subscription.tier];
  const isOverage = usage.messageCount >= limit;

  // 3. Check if blocked by limit
  if (isOverage && !subscription.overageEnabled) {
    await logSms({
      organisationId,
      environment,
      recipientPhone,
      messageBody,
      purpose,
      sentById,
      status: 'BLOCKED',
    });

    return {
      success: false,
      blocked: true,
      reason: `Monthly SMS limit of ${limit} reached. Overage is not enabled for this organisation.`,
      usageThisMonth: usage.messageCount,
      limit,
      isOverage: true,
    };
  }

  // 4. Send via SNS
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

    await logSms({
      organisationId,
      environment,
      recipientPhone,
      messageBody,
      purpose,
      sentById,
      status: 'FAILED',
    });

    return {
      success: false,
      blocked: false,
      reason: 'SMS delivery failed. Please try again.',
      usageThisMonth: usage.messageCount,
      limit,
      isOverage,
    };
  }

  // 5. Log the successful send + increment usage counter
  await Promise.all([
    logSms({
      organisationId,
      environment,
      recipientPhone,
      messageBody,
      purpose,
      sentById,
      status: 'SENT',
      snsMessageId,
    }),
    prisma.smsUsageSummary.update({
      where: {
        organisationId_environment_year_month: {
          organisationId,
          environment,
          year,
          month,
        },
      },
      data: {
        messageCount: { increment: 1 },
        ...(isOverage ? { overageCount: { increment: 1 } } : {}),
      },
    }),
  ]);

  return {
    success: true,
    blocked: false,
    snsMessageId,
    usageThisMonth: usage.messageCount + 1,
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
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [subscription, usage] = await Promise.all([
    prisma.smsSubscription.findUnique({ where: { organisationId } }),
    getOrCreateUsageSummary(organisationId, environment, year, month),
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

async function getOrCreateUsageSummary(
  organisationId: string,
  environment: Environment,
  year: number,
  month: number
) {
  return prisma.smsUsageSummary.upsert({
    where: {
      organisationId_environment_year_month: {
        organisationId,
        environment,
        year,
        month,
      },
    },
    create: {
      organisationId,
      environment,
      year,
      month,
      messageCount: 0,
      overageCount: 0,
    },
    update: {},
  });
}

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
  return prisma.smsLog.create({
    data: {
      organisationId: data.organisationId,
      environment: data.environment,
      recipientPhone: data.recipientPhone,
      messageBody: data.messageBody,
      purpose: data.purpose,
      sentById: data.sentById,
      status: data.status,
      snsMessageId: data.snsMessageId,
    },
  });
}
