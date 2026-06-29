import { NextResponse } from 'next/server'
import { createAnimal } from '@/lib/database'
import { auth } from '@/lib/clerk-server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getUserRole, getAuthorisedSpecies, hasPermission } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import { commitAnimalId } from '@/lib/animalId/generate'
import { route } from '@/lib/openapi/route'
import { listAnimalsContract, createAnimalContract } from './openapi'

export const GET = route(listAnimalsContract, async ({ request }) => {
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
			return { data: animals }
		}

		// COORDINATOR: sees animals in assigned species groups plus animals assigned to them
		if (role === 'COORDINATOR') {
			const authorisedSpecies = await getAuthorisedSpecies(userId, requestedOrgId)
			const animals = await prisma.animal.findMany({
				where: {
					clerkOrganizationId: requestedOrgId,
					OR: [
						...(authorisedSpecies && authorisedSpecies.length > 0
							? [{ species: { in: authorisedSpecies } }]
							: []),
						{ carerId: userId },
					],
				},
				include: { carer: true, records: true, photos: true },
				orderBy: { dateFound: 'desc' },
			})
			return { data: animals }
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
		return { data: animals }
	} catch (err) {
		const message = err instanceof Error ? err.message : ''
		if (message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
		if (message === 'Organization ID is required') return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
		console.error('Error fetching animals:', err)
		return NextResponse.json({ error: 'Failed to fetch animals' }, { status: 500 })
	}
})

export const POST = route(createAnimalContract, async ({ body }) => {
	const { userId, orgId: activeOrgId } = await auth()
	if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

	// body is the validated, passthrough request payload (mutable copy).
	const data = { ...(body as Record<string, unknown>) }
	const requestedOrgId = (data.clerkOrganizationId as string) || activeOrgId || undefined

	try {
		if (!requestedOrgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
		if (activeOrgId && requestedOrgId !== activeOrgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

		// Only ADMIN and COORDINATOR can create animals
		const role = await getUserRole(userId, requestedOrgId)
		if (!hasPermission(role, 'animal:create')) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
		}

		const autoGenerate = data._autoGenerateOrgAnimalId === true
		delete data._autoGenerateOrgAnimalId

		if (autoGenerate) {
			// Use a transaction to atomically claim a sequence number and create the animal
			const created = await prisma.$transaction(async (tx) => {
				const generatedId = await commitAnimalId(
					tx,
					requestedOrgId,
					(data.dateFound as string) || new Date().toISOString(),
					data.species as string
				)
				data.orgAnimalId = generatedId
				return createAnimal({ ...data, clerkUserId: userId, clerkOrganizationId: requestedOrgId }, tx)
			})
			logAudit({ userId, orgId: requestedOrgId, action: 'CREATE', entity: 'Animal', entityId: created.id, metadata: { name: created.name, species: created.species, orgAnimalId: created.orgAnimalId } })
			return { data: created, status: 201 }
		}

		const created = await createAnimal({ ...data, clerkUserId: userId, clerkOrganizationId: requestedOrgId })
		logAudit({ userId, orgId: requestedOrgId, action: 'CREATE', entity: 'Animal', entityId: created.id, metadata: { name: created.name, species: created.species, orgAnimalId: created.orgAnimalId } })
		return { data: created, status: 201 }
	} catch (err) {
		// Catch unique constraint violation on orgAnimalId
		if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
			return NextResponse.json(
				{ error: `Animal ID "${data.orgAnimalId}" is already in use by another animal in this organisation.` },
				{ status: 422 }
			)
		}
		const message = err instanceof Error ? err.message : ''
		if (message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
		if (message === 'Organization ID is required') return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
		console.error('Error creating animal:', err)
		return NextResponse.json({ error: 'Failed to create animal' }, { status: 500 })
	}
})
