import { NextResponse } from 'next/server'
import { getAssets, createAsset } from '@/lib/database'
import { auth } from '@clerk/nextjs/server'

export async function GET(request: Request) {
	const { userId, orgId: activeOrgId } = await auth()
	if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	const { searchParams } = new URL(request.url)
	const orgId = searchParams.get('orgId') || activeOrgId || undefined
	try {
		if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
		const assets = await getAssets(userId, orgId)
		return NextResponse.json(assets)
	} catch (e) {
		return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 })
	}
}

export async function POST(request: Request) {
	const { userId, orgId: activeOrgId } = await auth()
	if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	const body = await request.json()
	const orgId = body.clerkOrganizationId || activeOrgId || undefined
	try {
		if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
		const created = await createAsset({ ...body, clerkUserId: userId, clerkOrganizationId: orgId })
		return NextResponse.json(created, { status: 201 })
	} catch (e) {
		return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 })
	}
}
