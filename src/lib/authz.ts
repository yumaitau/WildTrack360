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

export async function getFirstUserOrgId(userId: string): Promise<string | null> {
	if (!userId) return null
	const client = await clerkClient()
	const memberships = await client.users.getOrganizationMembershipList({ userId })
	return memberships.data[0]?.organization.id ?? null
}


