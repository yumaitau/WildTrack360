import { NextResponse } from 'next/server'
import { getAssets, createAsset } from '@/lib/database'
import { auth } from '@/lib/clerk-server'
import { logAudit } from '@/lib/audit'
import { route } from '@/lib/openapi/route'
import { listAssetsContract, createAssetContract } from './openapi'

export const GET = route(listAssetsContract, async () => {
	const { userId, orgId: activeOrgId } = await auth()
	if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	const orgId = activeOrgId
	try {
		if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
		const assets = await getAssets(orgId)
		return { data: assets }
	} catch {
		return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 })
	}
})

export const POST = route(createAssetContract, async ({ body }) => {
	const { userId, orgId: activeOrgId } = await auth()
	if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	const orgId = activeOrgId
	try {
		if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
		const created = await createAsset(body, { clerkUserId: userId, clerkOrganizationId: orgId })
		logAudit({ userId, orgId, action: 'CREATE', entity: 'Asset', entityId: created.id, metadata: { name: created.name, type: created.type } })
		return { data: created, status: 201 as const }
	} catch {
		return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 })
	}
})
