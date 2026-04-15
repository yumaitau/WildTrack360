"use client"

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api'
import { useGoogleMaps } from '@/components/google-maps-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MapPin, Phone, Mail, Users, Map, Satellite, Expand, Search, X, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import Link from 'next/link'
import type { CarerMapEntry } from '@/app/api/carers/map/route'

interface CarerMapProps {
  initialSpeciesFilter?: string
  onSelectCarer?: (carer: CarerMapEntry) => void
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
}

const DEFAULT_CENTER = { lat: -33.8688, lng: 151.2093 } // Sydney default
const DEFAULT_ZOOM = 10

export default function CarerMap({ initialSpeciesFilter, onSelectCarer }: CarerMapProps) {
  const { isLoaded } = useGoogleMaps()
  const [carers, setCarers] = useState<CarerMapEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCarer, setSelectedCarer] = useState<CarerMapEntry | null>(null)
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap')
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Filters
  const [specialtyFilter, setSpecialtyFilter] = useState(initialSpeciesFilter || 'all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function fetchCarers() {
      try {
        const res = await fetch('/api/carers/map')
        if (!res.ok) throw new Error('Failed to fetch carer locations')
        const data: CarerMapEntry[] = await res.json()
        setCarers(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load map data')
      } finally {
        setLoading(false)
      }
    }
    fetchCarers()
  }, [])

  // Derive unique specialties for filter dropdown
  const allSpecialties = useMemo(() => {
    const set = new Set<string>()
    carers.forEach(c => c.specialties.forEach(s => set.add(s)))
    return Array.from(set).sort()
  }, [carers])

  // Derive unique suburbs for search
  const allSuburbs = useMemo(() => {
    const set = new Set<string>()
    carers.forEach(c => {
      if (c.suburb) set.add(c.suburb)
    })
    return Array.from(set).sort()
  }, [carers])

  // Apply filters
  const filteredCarers = useMemo(() => {
    return carers.filter(c => {
      // Specialty filter
      if (specialtyFilter !== 'all') {
        if (!c.specialties.some(s => s.toLowerCase() === specialtyFilter.toLowerCase())) {
          return false
        }
      }

      // Search query (name, suburb, postcode)
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchesName = c.name.toLowerCase().includes(q)
        const matchesSuburb = c.suburb?.toLowerCase().includes(q)
        const matchesPostcode = c.postcode?.includes(q)
        if (!matchesName && !matchesSuburb && !matchesPostcode) return false
      }

      return true
    })
  }, [carers, specialtyFilter, searchQuery])

  // Calculate map center from filtered carers
  const mapCenter = useMemo(() => {
    if (filteredCarers.length === 0) return DEFAULT_CENTER
    const avgLat = filteredCarers.reduce((sum, c) => sum + c.lat, 0) / filteredCarers.length
    const avgLng = filteredCarers.reduce((sum, c) => sum + c.lng, 0) / filteredCarers.length
    return { lat: avgLat, lng: avgLng }
  }, [filteredCarers])

  const handleMarkerClick = useCallback((carer: CarerMapEntry) => {
    setSelectedCarer(carer)
  }, [])

  const activeFilterCount = [
    specialtyFilter !== 'all' ? 1 : 0,
    searchQuery ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading carer locations...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-20 text-center">
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!isLoaded) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading map...</span>
        </CardContent>
      </Card>
    )
  }

  const MapView = ({ containerStyle }: { containerStyle: React.CSSProperties }) => (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={mapCenter}
      zoom={DEFAULT_ZOOM}
      options={{
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        mapTypeId: mapType,
      }}
    >
      {filteredCarers.map(carer => (
        <Marker
          key={carer.id}
          position={{ lat: carer.lat, lng: carer.lng }}
          title={carer.name}
          onClick={() => handleMarkerClick(carer)}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: '#16a34a',
            fillOpacity: 1,
            strokeColor: 'white',
            strokeWeight: 2,
          }}
          label={{
            text: String(carer.activeAnimalCount),
            color: 'white',
            fontSize: '11px',
            fontWeight: 'bold',
          }}
        />
      ))}

      {selectedCarer && (
        <InfoWindow
          position={{ lat: selectedCarer.lat, lng: selectedCarer.lng }}
          onCloseClick={() => setSelectedCarer(null)}
        >
          <div className="min-w-[220px] max-w-[300px] p-1">
            <h3 className="font-semibold text-base mb-2">{selectedCarer.name}</h3>

            {selectedCarer.phone && (
              <div className="flex items-center gap-2 text-sm mb-1">
                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <a href={`tel:${selectedCarer.phone}`} className="text-blue-600 hover:underline">
                  {selectedCarer.phone}
                </a>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm mb-1">
              <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{selectedCarer.email}</span>
            </div>

            <div className="flex items-center gap-2 text-sm mb-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span>
                {[selectedCarer.suburb, selectedCarer.state, selectedCarer.postcode]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm mb-2">
              <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span>{selectedCarer.activeAnimalCount} animal{selectedCarer.activeAnimalCount !== 1 ? 's' : ''} in care</span>
            </div>

            {selectedCarer.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedCarer.specialties.map((s, i) => (
                  <span
                    key={i}
                    className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-2 pt-2 border-t flex items-center gap-3">
              <Link
                href={`/compliance/carers/${selectedCarer.id}`}
                className="text-sm text-blue-600 hover:underline"
              >
                View full profile
              </Link>
              {onSelectCarer && (
                <button
                  type="button"
                  onClick={() => onSelectCarer(selectedCarer)}
                  className="text-sm font-medium text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded"
                >
                  Assign
                </button>
              )}
            </div>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  )

  return (
    <>
      <div className="space-y-4">
        {/* Filter controls */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, suburb, or postcode..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>

              <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Species specialty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All specialties</SelectItem>
                  {allSpecialties.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

            </div>

            <div className="flex items-center justify-between mt-3">
              <p className="text-sm text-muted-foreground">
                Showing {filteredCarers.length} of {carers.length} carer{carers.length !== 1 ? 's' : ''} on map
              </p>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSpecialtyFilter('all')
                    setSearchQuery('')
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Map */}
        <Card>
          <CardContent className="p-0">
            <div className="relative h-[500px] sm:h-[600px]">
              <MapView containerStyle={mapContainerStyle} />

              <div className="absolute top-3 right-3 z-10 flex gap-1">
                <Button
                  onClick={() => setIsFullscreen(true)}
                  size="sm"
                  variant="secondary"
                >
                  <Expand className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => setMapType(mapType === 'roadmap' ? 'satellite' : 'roadmap')}
                  size="sm"
                  variant="secondary"
                >
                  {mapType === 'roadmap' ? (
                    <><Satellite className="h-4 w-4 mr-1" /> Satellite</>
                  ) : (
                    <><Map className="h-4 w-4 mr-1" /> Street</>
                  )}
                </Button>
              </div>

              {/* Legend */}
              <div className="absolute bottom-3 left-3 flex gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur px-3 py-1.5 rounded-md shadow-sm">
                  <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                  <span className="text-sm">Carer location</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur px-3 py-1.5 rounded-md shadow-sm">
                  <span className="text-sm">Number = animals in care</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fullscreen dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 flex flex-col">
          <DialogHeader className="p-4 pb-2 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Carer Map
              <Badge variant="secondary" className="ml-2">
                {filteredCarers.length} carer{filteredCarers.length !== 1 ? 's' : ''}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="relative flex-1 p-4 pt-2">
            <MapView containerStyle={{ width: '100%', height: '100%', borderRadius: '0.5rem' }} />
            <Button
              onClick={() => setMapType(mapType === 'roadmap' ? 'satellite' : 'roadmap')}
              size="sm"
              variant="secondary"
              className="absolute top-4 right-6 z-10"
            >
              {mapType === 'roadmap' ? (
                <><Satellite className="h-4 w-4 mr-1" /> Satellite</>
              ) : (
                <><Map className="h-4 w-4 mr-1" /> Street</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
