// Pure helpers for translating a transfer request into the side effects
// that need to land on the Animal row. Pulled out of the transfers route
// handler so the mapping is unit-testable without mocking Prisma/Clerk.

import type { $Enums } from '@prisma/client';

export type TransferType = $Enums.TransferType;

// The animal statuses that each (non-internal) transfer type places the
// animal into. Internal carer transfers preserve the animal's current status.
const STATUS_FOR_TYPE: Partial<Record<TransferType, string>> = {
  INTER_ORGANISATION: 'TRANSFERRED',
  VET_TRANSFER: 'TRANSFERRED',
  PERMANENT_CARE_PLACEMENT: 'PERMANENT_CARE',
  RELEASE_TRANSFER: 'TRANSFERRED',
};

export function newAnimalStatusForTransfer(
  transferType: TransferType,
  currentStatus: string,
): string {
  if (transferType === 'INTERNAL_CARER') return currentStatus;
  return STATUS_FOR_TYPE[transferType] ?? 'TRANSFERRED';
}

export interface AnimalUpdateForTransferInput {
  transferType: TransferType;
  newStatus: string;
  toCarerId?: string | null;
  transferDate: Date;
  reasonForTransfer: string;
}

export interface AnimalUpdateForTransfer {
  status: string;
  carerId?: string;
  outcomeDate?: Date;
  outcomeReason?: string;
}

// Compute the Animal row patch for a transfer. Two NSW-relevant rules:
//   1. Internal carer transfers hand custody to the new carer so the
//      animal's carerId (which exports as "Rehabilitator name") tracks the
//      current custodian.
//   2. Non-internal transfers terminate the animal's active rehab and
//      stamp the outcome date/reason.
export function animalUpdateForTransfer(
  input: AnimalUpdateForTransferInput,
): AnimalUpdateForTransfer {
  const patch: AnimalUpdateForTransfer = { status: input.newStatus };

  if (input.transferType === 'INTERNAL_CARER') {
    if (input.toCarerId) patch.carerId = input.toCarerId;
  } else {
    patch.outcomeDate = input.transferDate;
    patch.outcomeReason = input.reasonForTransfer;
  }

  return patch;
}
