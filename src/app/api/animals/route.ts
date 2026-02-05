import { NextResponse } from 'next/server'
import { getAnimals, createAnimal } from '@/lib/database'
import { auth } from '@clerk/nextjs/server'

export async function GET(request: Request) {
	const { userId, orgId: activeOrgId } = await auth()
	if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

	const { searchParams } = new URL(request.url)
	const requestedOrgId = searchParams.get('orgId') || activeOrgId || undefined

	try {
		if (!requestedOrgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
		if (activeOrgId && requestedOrgId !== activeOrgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
		const animals = await getAnimals(requestedOrgId)
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
		const created = await createAnimal({ ...body, clerkUserId: userId, clerkOrganizationId: requestedOrgId })
		return NextResponse.json(created, { status: 201 })
	} catch (err) {
		const message = err instanceof Error ? err.message : ''
		if (message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
		if (message === 'Organization ID is required') return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
		console.error('Error creating animal:', err)
		return NextResponse.json({ error: 'Failed to create animal' }, { status: 500 })
	}
}
