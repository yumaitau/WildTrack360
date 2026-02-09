import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getEnrichedCarers } from '@/lib/carer-helpers'

export async function GET(request: Request) {
	const { userId, orgId: activeOrgId } = await auth()
	if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	const { searchParams } = new URL(request.url)
	const orgId = searchParams.get('orgId') || activeOrgId || undefined
	try {
		if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
		const carers = await getEnrichedCarers(orgId)
		return NextResponse.json(carers)
	} catch (error) {
		console.error('Error fetching enriched carers:', error)
		return NextResponse.json({ error: 'Failed to fetch carers' }, { status: 500 })
	}
}
