'server-only';

import { prisma } from './prisma';
import type { AnimalStatus } from '@prisma/client';

export interface StatusTransitionResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Validates whether an animal can transition to the given status.
 * Enforces NSW compliance guardrails:
 * - PERMANENT_CARE requires an approved PermanentCareApplication
 * - TRANSFERRED requires at least one transfer record
 */
export async function validateStatusTransition(
  animalId: string,
  orgId: string,
  newStatus: AnimalStatus
): Promise<StatusTransitionResult> {
  if (newStatus === 'PERMANENT_CARE') {
    const approval = await prisma.permanentCareApplication.findFirst({
      where: {
        animalId,
        clerkOrganizationId: orgId,
        status: 'APPROVED',
      },
    });
    if (!approval) {
      return {
        allowed: false,
        reason: 'Cannot set status to PERMANENT_CARE without an approved permanent care application with NPWS approval recorded.',
      };
    }
  }

  if (newStatus === 'TRANSFERRED') {
    const transfer = await prisma.animalTransfer.findFirst({
      where: { animalId, clerkOrganizationId: orgId },
    });
    if (!transfer) {
      return {
        allowed: false,
        reason: 'Cannot set status to TRANSFERRED without a transfer record.',
      };
    }
  }

  return { allowed: true };
}

/**
 * Validates that a permanent care application can be submitted.
 * Vet report is required before submission.
 */
export function validateApplicationSubmission(application: {
  vetReportUrl: string | null;
  nonReleasableReasons: string;
  euthanasiaJustification: string;
}): StatusTransitionResult {
  if (!application.vetReportUrl) {
    return {
      allowed: false,
      reason: 'Cannot submit application without a vet report.',
    };
  }
  if (!application.nonReleasableReasons?.trim()) {
    return {
      allowed: false,
      reason: 'Non-releasable reasons are required.',
    };
  }
  if (!application.euthanasiaJustification?.trim()) {
    return {
      allowed: false,
      reason: 'Justification for permanent care instead of euthanasia is required.',
    };
  }
  return { allowed: true };
}

/**
 * Validates that an application approval has the required NPWS details.
 */
export function validateApprovalDetails(data: {
  npwsApprovalNumber?: string;
  npwsApprovalDate?: string | Date;
}): StatusTransitionResult {
  if (!data.npwsApprovalNumber?.trim()) {
    return {
      allowed: false,
      reason: 'NPWS approval number is required.',
    };
  }
  if (!data.npwsApprovalDate) {
    return {
      allowed: false,
      reason: 'NPWS approval date is required.',
    };
  }
  return { allowed: true };
}

/**
 * Validates transfer record has required fields based on transfer type.
 */
export function validateTransferRecord(data: {
  transferType: string;
  transferAuthorizedBy?: string | null;
  reasonForTransfer?: string | null;
  receivingEntity?: string | null;
  receivingLicense?: string | null;
}): StatusTransitionResult {
  if (!data.transferAuthorizedBy?.trim()) {
    return {
      allowed: false,
      reason: 'Transfer must have an authorised user.',
    };
  }
  if (!data.reasonForTransfer?.trim()) {
    return {
      allowed: false,
      reason: 'Transfer reason is required.',
    };
  }

  // Inter-org and permanent care transfers require receiving authority
  const requiresAuthority = ['INTER_ORGANISATION', 'PERMANENT_CARE_PLACEMENT'];
  if (requiresAuthority.includes(data.transferType)) {
    if (!data.receivingLicense?.trim()) {
      return {
        allowed: false,
        reason: 'Receiving authority/licence number is required for inter-organisation and permanent care transfers.',
      };
    }
  }

  return { allowed: true };
}
