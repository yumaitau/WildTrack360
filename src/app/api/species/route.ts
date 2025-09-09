import { NextResponse } from 'next/server'
import { getSpecies, createSpecies } from '@/lib/database'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
	const { userId, orgId: activeOrgId } = await auth()
	if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	const { searchParams } = new URL(request.url)
	const orgId = searchParams.get('orgId') || activeOrgId || undefined
	try {
		if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
		const species = await getSpecies(orgId)
		return NextResponse.json(species)
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to fetch species'
		const status = message === 'Forbidden' ? 403 : message === 'Organization ID is required' ? 400 : 500
		return NextResponse.json({ error: message }, { status })
	}
}

export async function POST(request: Request) {
	const { userId, orgId: activeOrgId } = await auth()
	if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	const body = await request.json()
	const orgId = body.clerkOrganizationId || activeOrgId || 'default-org'
	try {
		if (!body.name) {
			return NextResponse.json({ error: 'Species name is required' }, { status: 400 })
		}
		const speciesData: any = {
			name: body.name,
			scientificName: body.scientificName || null,
			type: body.type || null,
			description: body.description || null,
			careRequirements: body.careRequirements || null,
			clerkUserId: userId,
			clerkOrganizationId: orgId
		}
		const created = await createSpecies(speciesData)
		return NextResponse.json(created, { status: 201 })
	} catch (error) {
		console.error('Error creating species:', error)
		const message = error instanceof Error ? error.message : 'Failed to create species'
		return NextResponse.json({ error: message }, { status: 500 })
	}
}

export async function PATCH(request: Request) {
	const { userId, orgId: activeOrgId } = await auth()
	if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	const { oldName, newName, orgId } = await request.json()
	try {
		if (!orgId || (activeOrgId && orgId !== activeOrgId)) return NextResponse.json({ error: !orgId ? 'Organization ID is required' : 'Forbidden' }, { status: !orgId ? 400 : 403 })
		const updated = await prisma.species.updateMany({
			where: { name: oldName, clerkOrganizationId: orgId || 'default-org' },
			data: { name: newName }
		})
		return NextResponse.json({ count: updated.count })
	} catch {
		return NextResponse.json({ error: 'Failed to update species' }, { status: 500 })
	}
}

export async function DELETE(request: Request) {
	const { userId, orgId: activeOrgId } = await auth()
	if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	const { name, orgId } = await request.json()
	try {
		if (!orgId || (activeOrgId && orgId !== activeOrgId)) return NextResponse.json({ error: !orgId ? 'Organization ID is required' : 'Forbidden' }, { status: !orgId ? 400 : 403 })
		const deleted = await prisma.species.deleteMany({
			where: { name, clerkOrganizationId: orgId || 'default-org' }
		})
		return NextResponse.json({ count: deleted.count })
	} catch {
		return NextResponse.json({ error: 'Failed to delete species' }, { status: 500 })
	}
}
