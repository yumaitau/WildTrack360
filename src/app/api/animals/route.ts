import { NextResponse } from 'next/server'
import { createAnimal } from '@/lib/database'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getUserRole, getAuthorisedSpecies, hasPermission } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'

export async function GET(request: Request) {
	const { userId, orgId: activeOrgId } = await auth()
	if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

	const { searchParams } = new URL(request.url)
	const requestedOrgId = searchParams.get('orgId') || activeOrgId || undefined

	try {
		if (!requestedOrgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
		if (activeOrgId && requestedOrgId !== activeOrgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

		const role = await getUserRole(userId, requestedOrgId)

		// ADMIN / COORDINATOR_ALL / CARER_ALL: sees all animals in the org
		if (role === 'ADMIN' || role === 'COORDINATOR_ALL' || role === 'CARER_ALL') {
			const animals = await prisma.animal.findMany({
				where: { clerkOrganizationId: requestedOrgId },
				include: { carer: true, records: true, photos: true },
				orderBy: { dateFound: 'desc' },
			})
			return NextResponse.json(animals)
		}

		// COORDINATOR: sees all animals whose species is in their assigned species groups
		if (role === 'COORDINATOR') {
			const authorisedSpecies = await getAuthorisedSpecies(userId, requestedOrgId)
			const animals = await prisma.animal.findMany({
				where: {
					clerkOrganizationId: requestedOrgId,
					...(authorisedSpecies && authorisedSpecies.length > 0
						? { species: { in: authorisedSpecies } }
						: { id: '__none__' }), // no species assignments → no animals
				},
				include: { carer: true, records: true, photos: true },
				orderBy: { dateFound: 'desc' },
			})
			return NextResponse.json(animals)
		}

		// CARER: sees only animals assigned to them
		const animals = await prisma.animal.findMany({
			where: {
				clerkOrganizationId: requestedOrgId,
				carerId: userId,
			},
			include: { carer: true, records: true, photos: true },
			orderBy: { dateFound: 'desc' },
		})
		return NextResponse.json(animals)
	} catch (err) {
		const message = err instanceof Error ? err.message : ''
		if (message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
		if (message === 'Organization ID is required') return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
		console.error('Error fetching animals:', err)
		return NextResponse.json({ error: 'Failed to fetch animals' }, { status: 500 })
	}
}

export async function POST(request: Request) {
	const { userId, orgId: activeOrgId } = await auth()
	if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

	const body = await request.json()
	const requestedOrgId = body.clerkOrganizationId || activeOrgId || undefined

	try {
		if (!requestedOrgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
		if (activeOrgId && requestedOrgId !== activeOrgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

		// Only ADMIN and COORDINATOR can create animals
		const role = await getUserRole(userId, requestedOrgId)
		if (!hasPermission(role, 'animal:create')) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
		}

		const created = await createAnimal({ ...body, clerkUserId: userId, clerkOrganizationId: requestedOrgId })
		logAudit({ userId, orgId: requestedOrgId, action: 'CREATE', entity: 'Animal', entityId: created.id, metadata: { name: created.name, species: created.species } })
		return NextResponse.json(created, { status: 201 })
	} catch (err) {
		const message = err instanceof Error ? err.message : ''
		if (message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
		if (message === 'Organization ID is required') return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
		console.error('Error creating animal:', err)
		return NextResponse.json({ error: 'Failed to create animal' }, { status: 500 })
	}
}
