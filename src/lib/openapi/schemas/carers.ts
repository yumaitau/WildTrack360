import 'zod-openapi/extend';
import { z } from 'zod';

// OrgRole enum values, mirrored from the Prisma OrgRole enum.
const ORG_ROLE_VALUES = ['ADMIN', 'COORDINATOR_ALL', 'COORDINATOR', 'CARER_ALL', 'CARER'] as const;

// --- Carer Profile ---

export const CarerProfileDetail = z
  .object({
    id: z.string().openapi({ description: 'Clerk user ID.' }),
    phone: z.string().nullable(),
    licenseNumber: z.string().nullable(),
    licenseExpiry: z.string().datetime().nullable(),
    jurisdiction: z.string().nullable(),
    specialties: z.array(z.string()),
    notes: z.string().nullable(),
    active: z.boolean(),
    streetAddress: z.string().nullable(),
    suburb: z.string().nullable(),
    state: z.string().nullable(),
    postcode: z.string().nullable(),
    executivePosition: z.string().nullable(),
    speciesCoordinatorFor: z.string().nullable(),
    rehabilitatesKoala: z.boolean(),
    rehabilitatesFlyingFox: z.boolean(),
    rehabilitatesBirdOfPrey: z.boolean(),
    rehabilitatesVenomousSnake: z.boolean(),
    rehabilitatesMarineReptile: z.boolean(),
    memberSince: z.string().datetime().nullable(),
    trainingLevel: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ ref: 'CarerProfileDetail' });

export const UpdateCarerProfileBody = z
  .object({
    phone: z.string().optional(),
    licenseNumber: z.string().optional(),
    licenseExpiry: z.string().datetime().optional(),
    jurisdiction: z.string().optional(),
    specialties: z.array(z.string()).optional(),
    notes: z.string().optional(),
    active: z.boolean().optional(),
    streetAddress: z.string().optional(),
    suburb: z.string().optional(),
    state: z.string().optional(),
    postcode: z.string().optional(),
    executivePosition: z.string().optional(),
    speciesCoordinatorFor: z.string().optional(),
    rehabilitatesKoala: z.boolean().optional(),
    rehabilitatesFlyingFox: z.boolean().optional(),
    rehabilitatesBirdOfPrey: z.boolean().optional(),
    rehabilitatesVenomousSnake: z.boolean().optional(),
    rehabilitatesMarineReptile: z.boolean().optional(),
    memberSince: z.string().datetime().optional(),
    trainingLevel: z.string().optional(),
  })
  .openapi({ ref: 'UpdateCarerProfileBody' });

export const CarerMapEntry = z
  .object({
    id: z.string(),
    name: z.string(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    specialties: z.array(z.string()),
    suburb: z.string().nullable(),
    state: z.string().nullable(),
    postcode: z.string().nullable(),
    streetAddress: z.string().nullable(),
    activeAnimalCount: z.number().int(),
    lat: z.number(),
    lng: z.number(),
  })
  .openapi({ ref: 'CarerMapEntry' });

// --- Carer Training ---

export const CarerTraining = z
  .object({
    id: z.string(),
    carerId: z.string(),
    courseName: z.string(),
    provider: z.string().nullable(),
    date: z.string().datetime(),
    expiryDate: z.string().datetime().nullable(),
    certificateUrl: z.string().nullable(),
    certificateNumber: z.string().nullable(),
    trainingType: z.string().nullable(),
    trainingHours: z.number().int().nullable(),
    notes: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ ref: 'CarerTraining' });

// Clerk org member merged with their CarerProfile (mirrors EnrichedCarer in src/lib/types.ts).
// This is what GET /api/carers and GET /api/carers/{id} actually return.
export const EnrichedCarer = z
  .object({
    id: z.string().openapi({ description: 'Clerk user ID.' }),
    name: z.string().openapi({ description: 'Display name from Clerk, falling back to identifier or "Unknown".' }),
    email: z.string(),
    imageUrl: z.string(),
    phone: z.string().nullable(),
    licenseNumber: z.string().nullable(),
    licenseExpiry: z.string().datetime().nullable(),
    jurisdiction: z.string().nullable(),
    specialties: z.array(z.string()),
    notes: z.string().nullable(),
    active: z.boolean(),
    streetAddress: z.string().nullable(),
    suburb: z.string().nullable(),
    state: z.string().nullable(),
    postcode: z.string().nullable(),
    executivePosition: z.string().nullable(),
    speciesCoordinatorFor: z.string().nullable(),
    rehabilitatesKoala: z.boolean(),
    rehabilitatesFlyingFox: z.boolean(),
    rehabilitatesBirdOfPrey: z.boolean(),
    rehabilitatesVenomousSnake: z.boolean(),
    rehabilitatesMarineReptile: z.boolean(),
    memberSince: z.string().datetime().nullable(),
    trainingLevel: z.string().nullable(),
    memberId: z.string().nullable(),
    hasProfile: z.boolean().openapi({ description: 'True when a CarerProfile row exists for this member.' }),
    trainings: z.array(CarerTraining),
  })
  .openapi({ ref: 'EnrichedCarer', description: 'Org member enriched with CarerProfile and training data.' });

export const CreateCarerTrainingBody = z
  .object({
    carerId: z.string(),
    courseName: z.string(),
    provider: z.string().optional(),
    date: z.string().datetime(),
    expiryDate: z.string().datetime().optional(),
    certificateUrl: z.string().optional(),
    certificateNumber: z.string().optional(),
    trainingType: z.string().optional(),
    trainingHours: z.number().int().optional(),
    notes: z.string().optional(),
  })
  .openapi({ ref: 'CreateCarerTrainingBody' });

// --- RBAC ---

export const OrgMember = z
  .object({
    id: z.string(),
    userId: z.string().openapi({ description: 'Clerk user ID.' }),
    orgId: z.string().openapi({ description: 'Clerk organisation ID.' }),
    role: z.enum(ORG_ROLE_VALUES).openapi({ description: 'The member\'s OrgRole.' }),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ ref: 'OrgMember' });

export const MyRoleResponse = z
  .object({
    userId: z.string(),
    orgId: z.string(),
    role: z
      .enum(ORG_ROLE_VALUES)
      .openapi({ description: 'The current user\'s OrgRole; the API returns CARER when no explicit role is set.' }),
    orgMember: OrgMember.nullable(),
  })
  .openapi({ ref: 'MyRoleResponse' });

export const AssignRoleBody = z
  .object({
    targetUserId: z.string().openapi({ description: 'Clerk user ID of the member to assign a role.' }),
    role: z.enum(ORG_ROLE_VALUES),
  })
  .openapi({ ref: 'AssignRoleBody' });

export const CoordinatorAssignmentBody = z
  .object({
    orgMemberId: z.string().openapi({ description: 'OrgMember.id of the coordinator.' }),
    speciesGroupId: z.string().openapi({ description: 'SpeciesGroup.id to assign.' }),
  })
  .openapi({ ref: 'CoordinatorAssignmentBody' });

export const CoordinatorAssignment = z
  .object({
    id: z.string(),
    orgMemberId: z.string(),
    speciesGroupId: z.string(),
    createdAt: z.string().datetime(),
  })
  .openapi({ ref: 'CoordinatorAssignment' });

export const SpeciesGroup = z
  .object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    speciesNames: z.array(z.string()),
    orgId: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ ref: 'SpeciesGroup' });

export const CreateSpeciesGroupBody = z
  .object({
    slug: z.string().openapi({ description: 'Machine-readable key, e.g. "macropods".' }),
    name: z.string().openapi({ description: 'Display name, e.g. "Macropods".' }),
    description: z.string().optional(),
    speciesNames: z.array(z.string()).openapi({ description: 'Species names belonging to this group.' }),
  })
  .openapi({ ref: 'CreateSpeciesGroupBody' });

// --- Audit Logs ---

export const AuditLog = z
  .object({
    id: z.string(),
    userId: z.string(),
    userName: z.string().nullable(),
    userEmail: z.string().nullable(),
    orgId: z.string(),
    action: z.string().openapi({ description: 'AuditAction enum value.' }),
    entity: z.string().openapi({ description: 'Entity type, e.g. "Animal", "OrgMember".' }),
    entityId: z.string().nullable(),
    metadata: z.unknown().nullable(),
    createdAt: z.string().datetime(),
  })
  .openapi({ ref: 'AuditLog' });

export const AuditLogPage = z
  .object({
    data: z.array(AuditLog),
    pagination: z.object({
      page: z.number().int(),
      pageSize: z.number().int(),
      total: z.number().int(),
      totalPages: z.number().int(),
    }),
  })
  .openapi({ ref: 'AuditLogPage' });

// --- Carer Interest (admin) ---

export const CarerInterest = z
  .object({
    id: z.string(),
    clerkOrganizationId: z.string(),
    memberId: z.string().nullable(),
    name: z.string(),
    email: z.string(),
    phone: z.string().nullable(),
    experience: z.string().nullable(),
    availability: z.string().nullable(),
    message: z.string().nullable(),
    status: z.enum(['NEW', 'CONTACTED', 'APPROVED', 'DECLINED']),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ ref: 'CarerInterest' });

export const UpdateCarerInterestBody = z
  .object({
    id: z.string(),
    status: z.enum(['NEW', 'CONTACTED', 'APPROVED', 'DECLINED']),
  })
  .openapi({ ref: 'UpdateCarerInterestBody' });
