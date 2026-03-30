import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

const ASSET_SAFE_FIELDS = [
	'name', 'type', 'description', 'status', 'location',
	'assignedTo', 'purchaseDate', 'lastMaintenance', 'notes',
] as const;

function pickAssetFields(data: Record<string, unknown>): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const key of ASSET_SAFE_FIELDS) {
		if (key in data) {
			result[key] = data[key];
		}
	}
	return result;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const { userId, orgId } = await auth()
	if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	const body = await request.json()
	try {
		const safeFields = pickAssetFields(body)
		const result = await prisma.asset.updateMany({
			where: { id, clerkOrganizationId: orgId },
			data: safeFields,
		})
		if (result.count === 0) return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
		const updated = await prisma.asset.findUnique({ where: { id } })
		logAudit({ userId, orgId, action: 'UPDATE', entity: 'Asset', entityId: id, metadata: { fields: Object.keys(safeFields) } })
		return NextResponse.json(updated)
	} catch (e) {
		return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 })
	}
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const { userId, orgId } = await auth()
	if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	try {
		const result = await prisma.asset.deleteMany({
			where: { id, clerkOrganizationId: orgId },
		})
		if (result.count === 0) return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
		logAudit({ userId, orgId, action: 'DELETE', entity: 'Asset', entityId: id })
		return NextResponse.json({ ok: true })
	} catch (e) {
		return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 })
	}
}
