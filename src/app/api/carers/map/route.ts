import { NextResponse } from 'next/server'
import { auth } from '@/lib/clerk-server'
import { getEnrichedCarers } from '@/lib/carer-helpers'
import { prisma } from '@/lib/prisma'
import { route } from '@/lib/openapi/route'
import { carerMapContract } from '../openapi'

export const GET = route(carerMapContract, async () => {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })

  try {
    const carers = await getEnrichedCarers(orgId)
    const animalCounts = await prisma.animal.groupBy({
      by: ['carerId'],
      where: { clerkOrganizationId: orgId, carerId: { not: null }, status: { in: ['ADMITTED', 'IN_CARE'] } },
      _count: { _all: true },
    })
    const countMap = new Map(animalCounts.map(a => [a.carerId!, a._count._all]))
    const carersWithAddress = carers.filter(c => c.suburb || c.postcode || c.streetAddress)
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
    const results = []

    for (const carer of carersWithAddress) {
      const address = [carer.streetAddress, carer.suburb, carer.state, carer.postcode].filter(Boolean).join(', ') + ', Australia'
      try {
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
        const res = await fetch(geocodeUrl)
        const data = await res.json()
        if (data.status === 'OK' && data.results?.[0]) {
          const { lat, lng } = data.results[0].geometry.location
          results.push({ id: carer.id, name: carer.name, phone: carer.phone, email: carer.email,
            specialties: carer.specialties, suburb: carer.suburb, state: carer.state,
            postcode: carer.postcode, streetAddress: carer.streetAddress,
            activeAnimalCount: countMap.get(carer.id) || 0, lat, lng })
        }
      } catch { continue }
    }

    return { data: results }
  } catch (error) {
    console.error('Error fetching carer map data:', error)
    return NextResponse.json({ error: 'Failed to fetch carer map data' }, { status: 500 })
  }
})
