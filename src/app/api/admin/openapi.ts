import { z } from 'zod';
import { defineContract } from '@/lib/openapi/contract';

// ── Admin: Carer Interest ───────────────────────────────────────────────────

export const listCarerInterestContract = defineContract({
  method: 'get',
  path: '/api/admin/carer-interest',
  summary: 'List carer interest applications (admin)',
  tags: ['Admin'],
  security: 'clerkSession',
  responses: {
    200: { description: 'Carer interest list', schema: z.object({ interests: z.array(z.object({}).passthrough()) }) },
  },
  successStatus: 200,
});

export const updateCarerInterestContract = defineContract({
  method: 'patch',
  path: '/api/admin/carer-interest',
  summary: 'Update carer interest status (admin)',
  tags: ['Admin'],
  security: 'clerkSession',
  request: {
    body: z.object({ id: z.string(), status: z.string() }),
  },
  responses: {
    200: { description: 'Updated', schema: z.object({ ok: z.boolean() }) },
  },
  successStatus: 200,
});

// ── Admin: EOFY ─────────────────────────────────────────────────────────────

export const eofyReportContract = defineContract({
  method: 'get',
  path: '/api/admin/eofy',
  summary: 'End-of-financial-year donor summary (admin)',
  tags: ['Admin'],
  security: 'clerkSession',
  request: {
    query: z.object({ fy: z.string().optional() }),
  },
  responses: {
    200: { description: 'EOFY donor totals file', schema: z.unknown().openapi('EofyReport') },
  },
  successStatus: 200,
});

// ── Admin: Full Data Export ─────────────────────────────────────────────────

export const dataExportContract = defineContract({
  method: 'get',
  path: '/api/admin/export',
  summary: 'Full organisation data export as zip (admin)',
  tags: ['Admin'],
  security: 'clerkSession',
  responses: {
    200: { description: 'Zip archive containing XLSX + S3 files', schema: z.unknown().openapi('DataExport') },
  },
  successStatus: 200,
});

// ── Admin: NSW Registers Export ─────────────────────────────────────────────

export const nswRegistersExportContract = defineContract({
  method: 'get',
  path: '/api/admin/export/nsw-registers',
  summary: 'Export NSW transfer/permanent-care registers (admin)',
  tags: ['Admin'],
  security: 'clerkSession',
  request: {
    query: z.object({
      register: z.string().optional(),
      format: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }),
  },
  responses: {
    200: { description: 'Register export (CSV or XLSX)', schema: z.unknown().openapi('NSWRegisterExport') },
  },
  successStatus: 200,
});

// ── Admin: Onboarding Status ────────────────────────────────────────────────

export const onboardingStatusContract = defineContract({
  method: 'get',
  path: '/api/admin/onboarding',
  summary: 'Membership platform onboarding checklist status (admin)',
  tags: ['Admin'],
  security: 'clerkSession',
  responses: {
    200: {
      description: 'Onboarding checklist booleans',
      schema: z.object({
        squareConnected: z.boolean(),
        hasTiers: z.boolean(),
        receiptsConfigured: z.boolean(),
        joinPagePublic: z.boolean(),
        hasMembers: z.boolean(),
        hasNewsPost: z.boolean(),
      }),
    },
  },
  successStatus: 200,
});

// ── Admin: Org Settings ─────────────────────────────────────────────────────

export const getOrgSettingsContract = defineContract({
  method: 'get',
  path: '/api/admin/org-settings',
  summary: 'Get organisation settings (admin)',
  tags: ['Admin'],
  security: 'clerkSession',
  responses: {
    200: { description: 'Organisation settings', schema: z.object({}).passthrough() },
  },
  successStatus: 200,
});

export const updateOrgSettingsContract = defineContract({
  method: 'patch',
  path: '/api/admin/org-settings',
  summary: 'Update organisation settings (admin)',
  tags: ['Admin'],
  security: 'clerkSession',
  request: {
    body: z.object({}).passthrough(),
  },
  responses: {
    200: { description: 'Updated settings', schema: z.object({}).passthrough() },
  },
  successStatus: 200,
});

// ── Admin: Delete User ──────────────────────────────────────────────────────

export const deleteUserContract = defineContract({
  method: 'delete',
  path: '/api/admin/users/{userId}',
  summary: 'Delete a user from the organisation (admin)',
  tags: ['Admin'],
  security: 'clerkSession',
  request: { params: z.object({ userId: z.string() }) },
  responses: {
    200: { description: 'User deleted', schema: z.object({ success: z.boolean() }) },
  },
  successStatus: 200,
});

// ── Admin: Invite User ──────────────────────────────────────────────────────

export const inviteUserContract = defineContract({
  method: 'post',
  path: '/api/admin/invite',
  summary: 'Invite a user to the organisation (admin)',
  tags: ['Admin'],
  security: 'clerkSession',
  request: {
    body: z.object({ emailAddress: z.string().email() }),
  },
  responses: {
    200: { description: 'Invitation created', schema: z.object({ id: z.string() }) },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden or invitation not permitted by Clerk' },
    502: { description: 'Invitation provider failed' },
  },
  successStatus: 200,
});
