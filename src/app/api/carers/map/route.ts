import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getEnrichedCarers } from '@/lib/carer-helpers'
import { prisma } from '@/lib/prisma'

export interface CarerMapEntry {
  id: string
  name: string
  phone: string | null
  email: string
  specialties: string[]
  suburb: string | null
  state: string | null
  postcode: string | null
  streetAddress: string | null
  activeAnimalCount: number
  lat: number
  lng: number
}

export async function GET(request: Request) {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })

  try {
    const carers = await getEnrichedCarers(orgId)

    // Get active animal counts per carer
    const animalCounts = await prisma.animal.groupBy({
      by: ['carerId'],
      where: {
        clerkOrganizationId: orgId,
        carerId: { not: null },
        status: { in: ['ADMITTED', 'IN_CARE'] },
      },
      _count: { _all: true },
    })
    const countMap = new Map(
      animalCounts.map(a => [a.carerId!, a._count._all])
    )

    // Filter to carers that have an address we can geocode
    const carersWithAddress = carers.filter(
      c => c.suburb || c.postcode || c.streetAddress
    )

    // Geocode addresses using Google Maps Geocoding API
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
    const results: CarerMapEntry[] = []

    for (const carer of carersWithAddress) {
      const addressParts = [
        carer.streetAddress,
        carer.suburb,
        carer.state,
        carer.postcode,
      ].filter(Boolean)
      const address = addressParts.join(', ') + ', Australia'

      try {
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
        const res = await fetch(geocodeUrl)
        const data = await res.json()

        if (data.status === 'OK' && data.results?.[0]) {
          const { lat, lng } = data.results[0].geometry.location
          results.push({
            id: carer.id,
            name: carer.name,
            phone: carer.phone,
            email: carer.email,
            specialties: carer.specialties,
            suburb: carer.suburb,
            state: carer.state,
            postcode: carer.postcode,
            streetAddress: carer.streetAddress,
            activeAnimalCount: countMap.get(carer.id) || 0,
            lat,
            lng,
          })
        }
      } catch {
        // Skip carers whose address couldn't be geocoded
        continue
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error fetching carer map data:', error)
    return NextResponse.json({ error: 'Failed to fetch carer map data' }, { status: 500 })
  }
}
