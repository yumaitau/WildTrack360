import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function POST(request: Request) {
	const { userId, orgId } = await auth()
	if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })

	try {
		const { ids } = await request.json()

		if (!Array.isArray(ids) || ids.length === 0) {
			return NextResponse.json({ error: 'ids array is required' }, { status: 400 })
		}

		const result = await prisma.species.deleteMany({
			where: {
				id: { in: ids },
				clerkOrganizationId: orgId,
			},
		})

		logAudit({
			userId,
			orgId,
			action: 'DELETE',
			entity: 'Species',
			metadata: { bulkDelete: true, count: result.count },
		})

		return NextResponse.json({
			deleted: result.count,
			message: `Successfully deleted ${result.count} species.`,
		})
	} catch (error) {
		console.error('Error bulk deleting species:', error)
		return NextResponse.json({ error: 'Failed to delete species' }, { status: 500 })
	}
}
