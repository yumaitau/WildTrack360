import { prisma } from '@/lib/prisma'

const DEFAULT_REASONS = [
  'Barbed Wire',
  'Electrocution',
  'Found on Ground',
  'Motor Vehicle',
  'Unknown',
]

const DEFAULT_ACTIONS = [
  'Advice Given',
  'Energex Attendance Requested',
  'None Required',
  'None Taken',
  'Referred Elsewhere',
  'Rescuer Sent',
]

const DEFAULT_REFERRERS = [
  'Australia Zoo',
  'Currumbin Sanctuary',
  'None Specified',
  'Other - See Notes',
  'Other Group',
  'Phone Book',
  'RSPCA',
  'Website',
]

const DEFAULT_OUTCOMES = [
  'Awaiting Rescue',
  'Dead on Arrival',
  'Died',
  'Escaped',
  'Euthanased',
  'In Care',
  'In Care With Baby',
  'Not Found',
  'Released',
  'Unknown',
]

/**
 * Seeds default call log lookup values for an organisation if none exist.
 * Safe to call multiple times — only inserts when a lookup type is empty.
 */
export async function seedCallLogDefaults(orgId: string) {
  const [reasonCount, actionCount, referrerCount, outcomeCount] = await Promise.all([
    prisma.callLogReason.count({ where: { clerkOrganizationId: orgId } }),
    prisma.callLogAction.count({ where: { clerkOrganizationId: orgId } }),
    prisma.callLogReferrer.count({ where: { clerkOrganizationId: orgId } }),
    prisma.callLogOutcome.count({ where: { clerkOrganizationId: orgId } }),
  ])

  const promises: Promise<unknown>[] = []

  if (reasonCount === 0) {
    promises.push(prisma.callLogReason.createMany({
      data: DEFAULT_REASONS.map((label, i) => ({
        label, displayOrder: i + 1, active: true, clerkOrganizationId: orgId,
      })),
    }))
  }

  if (actionCount === 0) {
    promises.push(prisma.callLogAction.createMany({
      data: DEFAULT_ACTIONS.map((label, i) => ({
        label, displayOrder: i + 1, active: true, clerkOrganizationId: orgId,
      })),
    }))
  }

  if (referrerCount === 0) {
    promises.push(prisma.callLogReferrer.createMany({
      data: DEFAULT_REFERRERS.map((label, i) => ({
        label, displayOrder: i + 1, active: true, clerkOrganizationId: orgId,
      })),
    }))
  }

  if (outcomeCount === 0) {
    promises.push(prisma.callLogOutcome.createMany({
      data: DEFAULT_OUTCOMES.map((label, i) => ({
        label, displayOrder: i + 1, active: true, clerkOrganizationId: orgId,
      })),
    }))
  }

  if (promises.length > 0) {
    await Promise.all(promises)
  }

  return promises.length > 0
}
