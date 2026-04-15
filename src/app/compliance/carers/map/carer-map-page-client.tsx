"use client"

import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Home } from 'lucide-react'
import Link from 'next/link'
import CarerMap from '@/components/carer-map'

export default function CarerMapPageClient() {
  const searchParams = useSearchParams()
  const speciesFilter = searchParams.get('species') || undefined

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/compliance/carers">
          <Button variant="outline" size="icon" className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <Link href="/">
          <Button variant="outline" size="icon" className="shrink-0">
            <Home className="h-4 w-4" />
          </Button>
        </Link>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold">Carer Map</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            View carer locations and find the nearest available carer
          </p>
        </div>
      </div>

      <CarerMap initialSpeciesFilter={speciesFilter} />
    </div>
  )
}
