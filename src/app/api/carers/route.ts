import { NextResponse } from 'next/server'
import { auth } from '@/lib/clerk-server'
import { getEnrichedCarers, getEligibleCarerIdsForSpecies } from '@/lib/carer-helpers'
import { route } from '@/lib/openapi/route'
import { listCarersContract } from './openapi'

export const GET = route(listCarersContract, async ({ query }) => {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
  try {
    let carers = await getEnrichedCarers(orgId)
    if (query.assignable === 'true') carers = carers.filter(c => c.hasProfile)
    if (query.species) {
      const eligibleIds = await getEligibleCarerIdsForSpecies(orgId, query.species)
      if (eligibleIds) carers = carers.filter(c => eligibleIds.has(c.id))
    }
    return { data: carers }
  } catch (error) {
    console.error('Error fetching enriched carers:', error)
    return NextResponse.json({ error: 'Failed to fetch carers' }, { status: 500 })
  }
})
