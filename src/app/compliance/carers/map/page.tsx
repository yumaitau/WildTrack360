import { auth } from '@/lib/clerk-server'
import { redirect } from 'next/navigation'
import CarerMapPageClient from './carer-map-page-client'

export default async function CarerMapPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  return <CarerMapPageClient />
}
