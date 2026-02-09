'server-only'

import { clerkClient } from '@clerk/nextjs/server'

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
 * Returns true if the user holds an admin role in the given organization.
 */
export async function isOrgAdmin(userId: string, orgId: string): Promise<boolean> {
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
