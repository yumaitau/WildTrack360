import { describe, expect, it } from 'vitest';
import { pickPortalEditable } from './portal';

describe('pickPortalEditable', () => {
  it('keeps the editable contact + address fields', () => {
    const out = pickPortalEditable({
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '0400000000',
      addressLine1: '1 Test St',
      addressLine2: '',
      suburb: 'Sydney',
      state: 'NSW',
      postcode: '2000',
      country: 'AU',
    });
    expect(out).toEqual({
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '0400000000',
      addressLine1: '1 Test St',
      addressLine2: '',
      suburb: 'Sydney',
      state: 'NSW',
      postcode: '2000',
      country: 'AU',
    });
  });

  it('drops admin-only fields and unknown keys', () => {
    const out = pickPortalEditable({
      firstName: 'Jane',
      email: 'attacker@example.com',
      status: 'CANCELLED',
      memberNumber: 'M-9999',
      clerkOrganizationId: 'org_evil',
      customFields: { x: 1 },
      randomThing: true,
    });
    expect(out).toEqual({ firstName: 'Jane' });
  });

  it('passes null through for clearing optional fields', () => {
    const out = pickPortalEditable({ phone: null, addressLine2: null });
    expect(out).toEqual({ phone: null, addressLine2: null });
  });
});
