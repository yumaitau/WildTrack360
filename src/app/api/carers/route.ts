import { NextResponse } from 'next/server'
import { getCarers, createCarer } from '@/lib/database'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
	const { userId, orgId: activeOrgId } = await auth()
	if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	const { searchParams } = new URL(request.url)
	const orgId = searchParams.get('orgId') || activeOrgId || undefined
	try {
		if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
		const carers = await getCarers(orgId)
		return NextResponse.json(carers)
	} catch {
		return NextResponse.json({ error: 'Failed to fetch carers' }, { status: 500 })
	}
}

export async function POST(request: Request) {
	const { userId, orgId: activeOrgId } = await auth()
	if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	const body = await request.json()
	const orgId = body.clerkOrganizationId || activeOrgId || undefined
	try {
		if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
		const created = await createCarer({ ...body, clerkUserId: userId, clerkOrganizationId: orgId })
		return NextResponse.json(created, { status: 201 })
	} catch {
		return NextResponse.json({ error: 'Failed to create carer' }, { status: 500 })
	}
}

export async function PATCH(request: Request) {
	const { userId, orgId: activeOrgId } = await auth()
	if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	const { oldName, newName, orgId } = await request.json()
	try {
		if (!orgId || (activeOrgId && orgId !== activeOrgId)) return NextResponse.json({ error: !orgId ? 'Organization ID is required' : 'Forbidden' }, { status: !orgId ? 400 : 403 })
		const updated = await prisma.carer.updateMany({
			where: { name: oldName, clerkOrganizationId: orgId || 'default-org' },
			data: { name: newName }
		})
		return NextResponse.json({ count: updated.count })
	} catch {
		return NextResponse.json({ error: 'Failed to update carer' }, { status: 500 })
	}
}

export async function DELETE(request: Request) {
	const { userId, orgId: activeOrgId } = await auth()
	if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	const { name, orgId } = await request.json()
	try {
		if (!orgId || (activeOrgId && orgId !== activeOrgId)) return NextResponse.json({ error: !orgId ? 'Organization ID is required' : 'Forbidden' }, { status: !orgId ? 400 : 403 })
		const deleted = await prisma.carer.deleteMany({
			where: { name, clerkOrganizationId: orgId || 'default-org' }
		})
		return NextResponse.json({ count: deleted.count })
	} catch {
		return NextResponse.json({ error: 'Failed to delete carer' }, { status: 500 })
	}
}
