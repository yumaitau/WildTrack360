'server-only'

import { clerkClient } from '@clerk/nextjs/server'
import { getOrgMember } from './rbac'

export async function ensureUserInOrg(userId: string, orgId?: string): Promise<string> {
	if (!userId) throw new Error('Unauthorized')
	if (!orgId) throw new Error('Organization ID is required')
	const client = await clerkClient()
	const memberships = await client.users.getOrganizationMembershipList({ userId })
	const allowed = memberships.data.some((m: any) => m.organization.id === orgId)
	if (!allowed) throw new Error('Forbidden')
	return orgId
}

/**
 * Returns true if the user holds the ADMIN role in WildTrack360's own RBAC system.
 * Falls back to checking Clerk's org:admin role ONLY if no OrgMember record exists
 * at all (graceful migration path for existing orgs that haven't provisioned RBAC yet).
 * If an OrgMember record exists with a non-ADMIN role, the Clerk fallback is NOT used
 * — this prevents bypassing an intentional RBAC demotion.
 */
export async function isOrgAdmin(userId: string, orgId: string): Promise<boolean> {
	const member = await getOrgMember(userId, orgId)

	// If an OrgMember record exists, use it as the source of truth
	if (member) {
		return member.role === 'ADMIN'
	}

	// No OrgMember record at all — fall back to Clerk role for migration
	const client = await clerkClient()
	const memberships = await client.users.getOrganizationMembershipList({ userId })
	const membership = memberships.data.find((m: any) => m.organization.id === orgId)
	return membership?.role === 'org:admin'
}

export async function getFirstUserOrgId(userId: string): Promise<string | null> {
	if (!userId) return null
	const client = await clerkClient()
	const memberships = await client.users.getOrganizationMembershipList({ userId })
	return memberships.data[0]?.organization.id ?? null
}
