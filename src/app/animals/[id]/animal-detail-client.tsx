"use client";

import Image from "next/image";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSpeciesIcon } from "@/components/icons";
import RecordTimeline from "@/components/record-timeline";
import { ArrowLeft, User, CalendarDays, MapPin } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { AddRecordForm } from "@/components/add-record-form";
import LocationMap from "@/components/location-map";
import { type Animal, type Photo, type Record } from "@/lib/types";
import React, { useState, useMemo, useEffect } from "react";
import { getCurrentJurisdiction } from "@/lib/config";
import { AnimalStatus, RecordType } from "@prisma/client";
import { AddAnimalDialog } from "@/components/add-animal-dialog";
import { useOrganization } from "@clerk/nextjs";

interface AnimalDetailClientProps {
  initialAnimal: Animal;
  initialRecords: Record[];
  initialPhotos: Photo[];
}

export default function AnimalDetailClient({ 
  initialAnimal, 
  initialRecords, 
  initialPhotos 
}: AnimalDetailClientProps) {
  const [animal, setAnimal] = useState<Animal>(initialAnimal);
  const [records, setRecords] = useState<Record[]>(initialRecords);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const { organization } = useOrganization();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [speciesOptions, setSpeciesOptions] = useState<any[]>([]);
  const [carerOptions, setCarerOptions] = useState<any[]>([]);

  useEffect(() => {
    const loadLookups = async () => {
      if (!organization) return;
      try {
        const orgId = organization.id;
        const [species, carers] = await Promise.all([
          fetch(`/api/species?orgId=${orgId}`).then(r => r.json()),
          fetch(`/api/carers?orgId=${orgId}`).then(r => r.json()),
        ]);
        setSpeciesOptions((species || []).map((s: any) => ({ value: s.name, label: s.name })));
        setCarerOptions((carers || []).map((c: any) => ({ value: c.id, label: c.name })));
      } catch (e) {
        console.error('Failed loading lookups', e);
      }
    };
    loadLookups();
  }, [organization]);

  const handleAddRecord = async (newRecord: any) => {
    // Persist record via API to respect auth/org scoping
    await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRecord),
    });
    
    // Update local state
    setRecords(prevRecords => [newRecord, ...prevRecords].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    
    // If this is a release record, update the animal status to Released
    if (newRecord.type === 'RELEASE') {
      const updatedAnimal = {
        ...animal,
        status: AnimalStatus.RELEASED,
        outcome: 'Successfully released',
        outcomeDate: new Date(newRecord.datetime || newRecord.date)
      };
      setAnimal(updatedAnimal);
      // Persist animal update via API
      await fetch(`/api/animals/${updatedAnimal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedAnimal),
      })
    }
  };

  // Find the most recent release record
  const releaseRecord = useMemo(() => {
    return records.find(record => record.type === RecordType.RELEASE);
  }, [records]);

  // Check if animal has a release record but status is not "Released" and update it
  useEffect(() => {
    if (releaseRecord && animal.status !== AnimalStatus.RELEASED) {
      console.log('Found release record but animal status is not Released, updating...');
      const updatedAnimal = {
        ...animal,
        status: AnimalStatus.RELEASED,
        outcome: 'Successfully released',
        outcomeDate: releaseRecord.date
      };
      setAnimal(updatedAnimal);
      updateAnimalInStorage(updatedAnimal);
    }
  }, [releaseRecord, animal.status]);

  // Get current jurisdiction for compliance checking
  const jurisdiction = getCurrentJurisdiction();

  // Function to update animal in data store
  const updateAnimalInStorage = async (updatedAnimal: Animal) => {
    try {
      await fetch(`/api/animals/${updatedAnimal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedAnimal),
      })
      console.log('Animal status updated in data store');
    } catch (error) {
      console.error('Error updating animal in data store:', error);
    }
  };

  // Debug: Log animal data to see what's available
  console.log('Animal data:', {
    id: animal.id,
    name: animal.name,
    rescueLocation: animal.rescueLocation,
    rescueCoordinates: animal.rescueCoordinates,
    status: animal.status,
    hasReleaseRecord: !!releaseRecord,
    releaseRecordDate: releaseRecord?.date
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <Button asChild variant="ghost">
             <Link href="/" className="flex items-center gap-2 text-primary">
              <ArrowLeft className="h-4 w-4" />
              Back to All Animals
            </Link>
          </Button>
        </div>
        
        <main>
          <Card className="mb-8 overflow-hidden shadow-lg">
            <div className="md:flex">
              <div className="md:w-1/3 relative h-64 md:h-auto">
                {/* Image removed per request (no upload/photo UI here) */}
                <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                  {animal.name}
                </div>
              </div>
              <div className="md:w-2/3 p-6 flex flex-col justify-between">
                <div>
                  <StatusBadge status={animal.status} className="mb-4" />
                  <h1 className="font-headline text-4xl lg:text-5xl font-bold text-primary flex items-center gap-4">
                    {getSpeciesIcon(animal.species, { className: "h-10 w-10"})}
                    {animal.name}
                  </h1>
                  <p className="text-xl text-muted-foreground mt-1">{animal.species}</p>
                  
                  <div className="flex flex-wrap gap-4 mt-6 text-foreground">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-accent"/>
                      <span className="font-semibold">Carer:</span> {(animal as any)?.carer?.name ?? '—'}
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-accent"/>
                      <span className="font-semibold">Date Found:</span> {new Date(animal.dateFound).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                  
                  {/* Rescue Location Information */}
                  {animal.rescueLocation && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-5 w-5 text-blue-600"/>
                        <span className="font-semibold text-blue-800">Rescue Location</span>
                      </div>
                      <p className="text-blue-700 mb-2">{animal.rescueLocation}</p>
                      {(() => {
                        const rc = animal.rescueCoordinates as unknown as { lat?: number; lng?: number } | null;
                        return rc && typeof rc.lat === 'number' && typeof rc.lng === 'number';
                      })() && (
                        <p className="text-sm text-blue-600">
                          {(() => {
                            const rc = animal.rescueCoordinates as unknown as { lat?: number; lng?: number } | null;
                            const lat = rc?.lat as number | undefined;
                            const lng = rc?.lng as number | undefined;
                            return `Coordinates: ${lat?.toFixed(6)}, ${lng?.toFixed(6)}`;
                          })()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                 <div className="mt-6 flex gap-2">
                  <Button variant="outline" onClick={() => setIsEditOpen(true)}>Edit Animal</Button>
                  {releaseRecord && animal.status !== AnimalStatus.RELEASED && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        const updatedAnimal = {
                          ...animal,
                          status: AnimalStatus.RELEASED,
                          outcome: 'Successfully released',
                          outcomeDate: releaseRecord.date
                        };
                        setAnimal(updatedAnimal);
                        updateAnimalInStorage(updatedAnimal);
                      }}
                    >
                      Fix Status to Released
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {animal.status !== AnimalStatus.RELEASED ? (
                <AddRecordForm animalId={animal.id} onRecordAdd={handleAddRecord} />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Animal Released</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      This animal has been released. Adding new logs or locations is disabled.
                    </p>
                  </CardContent>
                </Card>
              )}
              <RecordTimeline 
                records={records} 
                rescueLocation={((): { lat: number; lng: number; address: string } | undefined => {
                  const rc = animal.rescueCoordinates as unknown as { lat?: number; lng?: number } | null;
                  if (rc && typeof rc.lat === 'number' && typeof rc.lng === 'number') {
                    return { lat: rc.lat, lng: rc.lng, address: animal.rescueLocation || 'Unknown location' };
                  }
                  return undefined;
                })()}
                jurisdiction={jurisdiction}
              />
            </div>
            <div className="space-y-8">
              <LocationMap 
                rescueLocation={((): { lat: number; lng: number; address: string } | undefined => {
                  const rc = animal.rescueCoordinates as unknown as { lat?: number; lng?: number } | null;
                  if (rc && typeof rc.lat === 'number' && typeof rc.lng === 'number') {
                    return { lat: rc.lat, lng: rc.lng, address: animal.rescueLocation || 'Unknown location' };
                  }
                  return undefined;
                })()}
                releaseLocation={undefined}
                animalName={animal.name}
                jurisdiction={jurisdiction}
              />
              {/* Photo gallery removed per request */}
            </div>
          </div>
        </main>
      </div>
      {/* Edit Animal Dialog */}
      <AddAnimalDialog
        isOpen={isEditOpen}
        setIsOpen={setIsEditOpen}
        onAnimalAdd={async (data: any) => {
          try {
            await fetch(`/api/animals/${animal.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...data, clerkOrganizationId: organization?.id }),
            });
            setAnimal(prev => ({ ...prev, ...data } as any));
            setIsEditOpen(false);
          } catch (e) {
            console.error('Failed to save animal', e);
          }
        }}
        animalToEdit={animal as any}
        species={speciesOptions}
        carers={carerOptions}
      />
    </div>
  );
}
