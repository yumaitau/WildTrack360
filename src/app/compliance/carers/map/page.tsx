import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import CarerMapPageClient from './carer-map-page-client'

export default async function CarerMapPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  return <CarerMapPageClient />
}
