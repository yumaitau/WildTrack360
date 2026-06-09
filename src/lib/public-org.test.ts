import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('./prisma', () => ({
  prisma: { organisationSettings: { findFirst: vi.fn() } },
}));
vi.mock('./features', () => ({ isFeatureEnabled: vi.fn() }));
vi.mock('./square/oauth', () => ({ getConnection: vi.fn() }));

import { resolvePublicOrg } from './public-org';
import { prisma } from './prisma';
import { isFeatureEnabled } from './features';
import { getConnection } from './square/oauth';

const findFirst = prisma.organisationSettings.findFirst as unknown as ReturnType<typeof vi.fn>;
const featureEnabled = isFeatureEnabled as unknown as ReturnType<typeof vi.fn>;
const connection = getConnection as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID = 'app-1';
});

describe('resolvePublicOrg', () => {
  it('rejects malformed handles without touching the DB', async () => {
    expect(await resolvePublicOrg('')).toBeNull();
    expect(await resolvePublicOrg('bad handle!')).toBeNull();
    expect(await resolvePublicOrg('a/b')).toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('returns null when no org maps to the handle', async () => {
    findFirst.mockResolvedValue(null);
    expect(await resolvePublicOrg('rescue')).toBeNull();
  });

  it('returns null when the membership feature is disabled', async () => {
    findFirst.mockResolvedValue({ clerkOrganisationId: 'org_1', legalName: 'Rescue', orgUrl: 'rescue' });
    featureEnabled.mockResolvedValue(false);
    expect(await resolvePublicOrg('rescue')).toBeNull();
  });

  it('returns null when Square is not connected', async () => {
    findFirst.mockResolvedValue({ clerkOrganisationId: 'org_1', legalName: 'Rescue' });
    featureEnabled.mockResolvedValue(true);
    connection.mockResolvedValue(null);
    expect(await resolvePublicOrg('rescue')).toBeNull();
  });

  it('returns null when the connection is revoked', async () => {
    findFirst.mockResolvedValue({ clerkOrganisationId: 'org_1' });
    featureEnabled.mockResolvedValue(true);
    connection.mockResolvedValue({ locationId: 'loc_1', revokedAt: new Date() });
    expect(await resolvePublicOrg('rescue')).toBeNull();
  });

  it('resolves a connected, feature-enabled org', async () => {
    findFirst.mockResolvedValue({ clerkOrganisationId: 'org_1', legalName: 'Rescue Inc' });
    featureEnabled.mockResolvedValue(true);
    connection.mockResolvedValue({ locationId: 'loc_1', revokedAt: null });
    expect(await resolvePublicOrg('rescue')).toMatchObject({
      orgId: 'org_1',
      orgName: 'Rescue Inc',
      locationId: 'loc_1',
      applicationId: 'app-1',
    });
  });
});
