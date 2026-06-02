import { describe, it, expect } from 'vitest';
import { canUseCustomReports } from './access';

describe('canUseCustomReports', () => {
  it('allows ADMIN and COORDINATOR_ALL (org-wide visibility)', () => {
    expect(canUseCustomReports('ADMIN')).toBe(true);
    expect(canUseCustomReports('COORDINATOR_ALL')).toBe(true);
  });

  it('denies species-scoped coordinators and carers', () => {
    expect(canUseCustomReports('COORDINATOR')).toBe(false);
    expect(canUseCustomReports('CARER_ALL')).toBe(false);
    expect(canUseCustomReports('CARER')).toBe(false);
  });
});
