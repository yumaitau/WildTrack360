import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { speciesSeedData } from '../../../../../prisma/species-seed-data'
import { logAudit } from '@/lib/audit'

export async function POST() {
	const { userId, orgId } = await auth()
	if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })

	try {
		// Get existing species names for this org to avoid duplicates
		const existing = await prisma.species.findMany({
			where: { clerkOrganizationId: orgId },
			select: { name: true },
		})
		const existingNames = new Set(existing.map(s => s.name.toLowerCase()))

		// Filter to only species that don't already exist
		const toInsert = speciesSeedData.filter(
			s => !existingNames.has(s.name.toLowerCase())
		)

		if (toInsert.length === 0) {
			return NextResponse.json({ inserted: 0, message: 'All default species already exist.' })
		}

		// Bulk insert using createMany for performance
		const result = await prisma.species.createMany({
			data: toInsert.map(s => {
				let description = s.type
				if (s.subtype) description += ` - ${s.subtype}`
				description += `. Category: ${s.category}`
				if (s.speciesCode) description += `. Species Code: ${s.speciesCode}`

				return {
					name: s.name,
					scientificName: s.scientificName,
					type: s.type === 'Other' ? null : s.type,
					description,
					careRequirements: null,
					clerkUserId: userId,
					clerkOrganizationId: orgId,
				}
			}),
			skipDuplicates: true,
		})

		logAudit({
			userId,
			orgId,
			action: 'CREATE',
			entity: 'Species',
			metadata: { bulkSeed: true, count: result.count },
		})

		return NextResponse.json({
			inserted: result.count,
			message: `Successfully added ${result.count} default species.`,
		})
	} catch (error) {
		console.error('Error seeding species:', error)
		return NextResponse.json({ error: 'Failed to seed species' }, { status: 500 })
	}
}
