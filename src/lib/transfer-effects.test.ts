import { describe, it, expect } from 'vitest';
import {
  animalUpdateForTransfer,
  newAnimalStatusForTransfer,
} from './transfer-effects';

describe('newAnimalStatusForTransfer', () => {
  it('preserves current status for internal carer transfers', () => {
    expect(newAnimalStatusForTransfer('INTERNAL_CARER', 'IN_CARE')).toBe('IN_CARE');
    expect(newAnimalStatusForTransfer('INTERNAL_CARER', 'READY_FOR_RELEASE')).toBe('READY_FOR_RELEASE');
  });

  it('maps permanent-care placement to PERMANENT_CARE', () => {
    expect(newAnimalStatusForTransfer('PERMANENT_CARE_PLACEMENT', 'IN_CARE')).toBe('PERMANENT_CARE');
  });

  it('maps non-internal transfers to TRANSFERRED', () => {
    expect(newAnimalStatusForTransfer('INTER_ORGANISATION', 'IN_CARE')).toBe('TRANSFERRED');
    expect(newAnimalStatusForTransfer('VET_TRANSFER', 'IN_CARE')).toBe('TRANSFERRED');
    expect(newAnimalStatusForTransfer('RELEASE_TRANSFER', 'IN_CARE')).toBe('TRANSFERRED');
  });
});

describe('animalUpdateForTransfer', () => {
  const baseInput = {
    newStatus: 'IN_CARE' as const,
    transferDate: new Date('2026-04-20T00:00:00Z'),
    reasonForTransfer: 'Carer rotation',
  };

  it('hands custody to the new carer on internal carer transfers', () => {
    const patch = animalUpdateForTransfer({
      ...baseInput,
      transferType: 'INTERNAL_CARER',
      toCarerId: 'new-carer-123',
    });
    expect(patch).toEqual({
      status: 'IN_CARE',
      carerId: 'new-carer-123',
    });
  });

  it('throws when internal transfer lacks a toCarerId', () => {
    expect(() =>
      animalUpdateForTransfer({
        ...baseInput,
        transferType: 'INTERNAL_CARER',
        toCarerId: null,
      }),
    ).toThrow(/toCarerId is required/);
  });

  it('stamps outcome date and reason on non-internal transfers', () => {
    const patch = animalUpdateForTransfer({
      ...baseInput,
      newStatus: 'TRANSFERRED',
      transferType: 'INTER_ORGANISATION',
      toCarerId: 'external-456',
    });
    expect(patch).toEqual({
      status: 'TRANSFERRED',
      outcomeDate: baseInput.transferDate,
      outcomeReason: 'Carer rotation',
    });
    // Non-internal transfers do NOT reassign carerId — the animal is leaving this org.
    expect('carerId' in patch).toBe(false);
  });

  it('permanent-care placement stamps outcome and does not reassign carerId', () => {
    const patch = animalUpdateForTransfer({
      ...baseInput,
      newStatus: 'PERMANENT_CARE',
      transferType: 'PERMANENT_CARE_PLACEMENT',
      toCarerId: 'keeper-789',
    });
    expect(patch.status).toBe('PERMANENT_CARE');
    expect(patch.outcomeDate).toEqual(baseInput.transferDate);
    expect(patch.outcomeReason).toBe('Carer rotation');
    expect('carerId' in patch).toBe(false);
  });
});
