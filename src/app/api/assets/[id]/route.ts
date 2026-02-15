import { NextResponse } from 'next/server'
import { updateAsset, deleteAsset } from '@/lib/database'
import { auth } from '@clerk/nextjs/server'
import { logAudit } from '@/lib/audit'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const { userId, orgId } = await auth()
	if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	const body = await request.json()
	try {
		const updated = await updateAsset(id, body)
		logAudit({ userId, orgId: orgId || updated.clerkOrganizationId, action: 'UPDATE', entity: 'Asset', entityId: id, metadata: { fields: Object.keys(body) } })
		return NextResponse.json(updated)
	} catch (e) {
		return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 })
	}
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const { userId, orgId } = await auth()
	if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	try {
		const deletedAsset = await deleteAsset(id)
		logAudit({ userId, orgId: orgId || deletedAsset.clerkOrganizationId, action: 'DELETE', entity: 'Asset', entityId: id })
		return NextResponse.json({ ok: true })
	} catch (e) {
		return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 })
	}
}
