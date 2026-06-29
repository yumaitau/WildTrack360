import { NextResponse } from 'next/server'
import { auth } from '@/lib/clerk-server'
import { seedCallLogDefaults } from '@/lib/call-log-defaults'
import { route } from '@/lib/openapi/route'
import { seedLookupsContract } from '../openapi'

export const POST = route(seedLookupsContract, async () => {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!orgId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
  const seeded = await seedCallLogDefaults(orgId)
  if (!seeded) return { data: { message: 'Defaults already exist, nothing seeded' }, status: 200 as const }
  return { data: { message: 'Default lookups seeded' }, status: 201 as const }
})
