import { NextResponse } from 'next/server'
import { updateAsset, deleteAsset } from '@/lib/database'
import { auth } from '@clerk/nextjs/server'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
	const { userId } = await auth()
	if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	const body = await request.json()
	try {
		const updated = await updateAsset(params.id, body)
		return NextResponse.json(updated)
	} catch (e) {
		return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 })
	}
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
	const { userId } = await auth()
	if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	try {
		await deleteAsset(params.id)
		return NextResponse.json({ ok: true })
	} catch (e) {
		return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 })
	}
}
