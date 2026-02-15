import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getEnrichedCarers, getEligibleCarerIdsForSpecies } from '@/lib/carer-helpers'

export async function GET(request: Request) {
	const { userId, orgId: activeOrgId } = await auth()
	if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	const { searchParams } = new URL(request.url)
	const orgId = searchParams.get('orgId') || activeOrgId || undefined
	const species = searchParams.get('species') || undefined
	const assignable = searchParams.get('assignable') === 'true'
	try {
		if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
		let carers = await getEnrichedCarers(orgId)

		// Filter out carers without a complete profile when requesting assignable carers
		if (assignable) {
			carers = carers.filter(c => c.hasProfile)
		}

		// Filter to carers eligible for the given species (via species group assignments)
		if (species) {
			const eligibleIds = await getEligibleCarerIdsForSpecies(orgId, species)
			if (eligibleIds) {
				carers = carers.filter(c => eligibleIds.has(c.id))
			}
		}

		return NextResponse.json(carers)
	} catch (error) {
		console.error('Error fetching enriched carers:', error)
		return NextResponse.json({ error: 'Failed to fetch carers' }, { status: 500 })
	}
}
