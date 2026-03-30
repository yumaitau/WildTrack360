import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { seedCallLogDefaults } from '@/lib/call-log-defaults'

export async function POST(request: Request) {
  const { userId, orgId: activeOrgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const orgId = activeOrgId
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })

  const seeded = await seedCallLogDefaults(orgId)

  if (!seeded) {
    return NextResponse.json({ message: 'Defaults already exist, nothing seeded' })
  }

  return NextResponse.json({ message: 'Default lookups seeded' }, { status: 201 })
}
