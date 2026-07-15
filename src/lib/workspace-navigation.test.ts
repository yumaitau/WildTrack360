import { describe, expect, it } from 'vitest';

import {
  filterCommandItemsForRole,
  getActiveWorkspaceNavigationId,
  getMobileMoreNavigation,
  getMobilePrimaryNavigation,
  getWorkspaceNavigation,
  getWorkspaceRoleLabel,
  isWorkspaceRoute,
} from './workspace-navigation';

describe('workspace navigation', () => {
  it('keeps carer navigation focused on daily care work', () => {
    expect(getWorkspaceNavigation('CARER').map((item) => item.id)).toEqual([
      'dashboard',
      'animals',
      'feed',
      'tools',
    ]);
  });

  it('adds coordinator and organisation workflows for privileged roles', () => {
    expect(getWorkspaceNavigation('COORDINATOR').map((item) => item.id)).toEqual([
      'dashboard',
      'animals',
      'calls',
      'compliance',
      'tools',
      'organisation',
    ]);
    expect(getWorkspaceNavigation('ADMIN')).toEqual(getWorkspaceNavigation('COORDINATOR_ALL'));
  });

  it('reveals the Forms destination only when the CUSTOM_FORMS flag is on', () => {
    expect(
      getWorkspaceNavigation('CARER', { customFormsEnabled: true }).map((item) => item.id)
    ).toEqual(['dashboard', 'animals', 'feed', 'forms', 'tools']);
    expect(
      getWorkspaceNavigation('COORDINATOR', { customFormsEnabled: true }).map((item) => item.id)
    ).toEqual(['dashboard', 'animals', 'calls', 'compliance', 'forms', 'tools', 'organisation']);
    expect(getWorkspaceNavigation('CARER').some((item) => item.id === 'forms')).toBe(false);
  });

  it('keeps four primary destinations in the privileged mobile bar', () => {
    expect(getMobilePrimaryNavigation('ADMIN').map((item) => item.id)).toEqual([
      'dashboard',
      'animals',
      'calls',
      'compliance',
    ]);
    expect(getMobileMoreNavigation('ADMIN').map((item) => item.id)).toEqual([
      'tools',
      'organisation',
    ]);
  });

  it('moves overflow carer destinations into More when Forms is enabled', () => {
    const options = { customFormsEnabled: true };

    expect(getMobilePrimaryNavigation('CARER', options).map((item) => item.id)).toEqual([
      'dashboard',
      'animals',
      'feed',
      'forms',
    ]);
    expect(getMobileMoreNavigation('CARER', options).map((item) => item.id)).toEqual(['tools']);
  });

  it('selects the most specific active destination', () => {
    const items = getWorkspaceNavigation('ADMIN');
    expect(getActiveWorkspaceNavigationId('/compliance/call-logs/new', items)).toBe('calls');
    expect(getActiveWorkspaceNavigationId('/compliance/hygiene', items)).toBe('compliance');
    expect(getActiveWorkspaceNavigationId('/tools/feed-roster', items)).toBe('tools');
    expect(getActiveWorkspaceNavigationId('/portal', items)).toBeNull();
  });

  it('shows the workspace shell only on interactive workspace routes', () => {
    expect(isWorkspaceRoute('/')).toBe(true);
    expect(isWorkspaceRoute('/animals/animal-1')).toBe(true);
    expect(isWorkspaceRoute('/forms/form-1/fill')).toBe(true);
    expect(isWorkspaceRoute('/portal')).toBe(false);
    expect(isWorkspaceRoute('/landing')).toBe(false);
    expect(isWorkspaceRoute('/animals/animal-1/print')).toBe(false);
    expect(isWorkspaceRoute('/admin/payments/payment-1/receipt')).toBe(false);
  });

  it('filters command destinations using the same role boundary', () => {
    const items = [
      { id: 'dashboard', group: 'Main' },
      { id: 'animals', group: 'Care' },
      { id: 'compliance', group: 'Compliance' },
      { id: 'new-incident', group: 'Actions' },
      { id: 'tools', group: 'Tools' },
      { id: 'admin', group: 'Admin' },
      { id: 'admin-people', group: 'Admin' },
      { id: 'admin-settings', group: 'Admin' },
    ];

    expect(filterCommandItemsForRole(items, 'CARER').map((item) => item.id)).toEqual([
      'dashboard',
      'animals',
      'tools',
    ]);
    expect(filterCommandItemsForRole(items, 'COORDINATOR').map((item) => item.id)).toEqual([
      'dashboard',
      'animals',
      'compliance',
      'new-incident',
      'tools',
      'admin',
    ]);
    expect(filterCommandItemsForRole(items, null)).toEqual([]);
    expect(filterCommandItemsForRole(items, 'ADMIN')).toEqual(items);
  });

  it.each([
    ['ADMIN', 'Administrator'],
    ['COORDINATOR', 'Coordinator'],
    ['COORDINATOR_ALL', 'Coordinator (all species)'],
    ['CARER_ALL', 'Carer (all animals)'],
    ['CARER', 'Carer'],
  ] as const)('labels the %s workspace role', (role, label) => {
    expect(getWorkspaceRoleLabel(role)).toBe(label);
  });
});
