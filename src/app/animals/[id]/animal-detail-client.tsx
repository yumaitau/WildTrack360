"use client";

import Image from "next/image";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSpeciesIcon } from "@/components/icons";
import RecordTimeline from "@/components/record-timeline";
import { ArrowLeft, User, CalendarDays, MapPin, Rocket, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { AddRecordForm } from "@/components/add-record-form";
import LocationMap from "@/components/location-map";
import { type Animal, type Photo, type Record } from "@/lib/types";
import React, { useState, useMemo, useEffect } from "react";
import { getCurrentJurisdiction } from "@/lib/config";
import { AnimalStatus, RecordType } from "@prisma/client";
import { AddAnimalDialog } from "@/components/add-animal-dialog";
import { DeleteAnimalDialog } from "@/components/delete-animal-dialog";
import { useOrganization } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

interface AnimalDetailClientProps {
  initialAnimal: Animal;
  initialRecords: Record[];
  initialPhotos: Photo[];
  releaseChecklist?: any;
}

export default function AnimalDetailClient({ 
  initialAnimal, 
  initialRecords, 
  initialPhotos,
  releaseChecklist 
}: AnimalDetailClientProps) {
  const [animal, setAnimal] = useState<Animal>(initialAnimal);
  const [records, setRecords] = useState<Record[]>(initialRecords);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const { organization } = useOrganization();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [speciesOptions, setSpeciesOptions] = useState<any[]>([]);
  const [carerOptions, setCarerOptions] = useState<any[]>([]);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const loadLookups = async () => {
      if (!organization) return;
      try {
        const orgId = organization.id;
        const [speciesResponse, carersResponse] = await Promise.all([
          fetch(`/api/species?orgId=${orgId}`),
          fetch(`/api/carers?orgId=${orgId}`),
        ]);
        
        const species = await speciesResponse.json();
        const carers = await carersResponse.json();
        
        // Set up default species if none exist
        const defaultSpecies = [
          { value: 'Kangaroo', label: 'Kangaroo' },
          { value: 'Koala', label: 'Koala' },
          { value: 'Wombat', label: 'Wombat' },
          { value: 'Echidna', label: 'Echidna' },
          { value: 'Possum', label: 'Possum' },
          { value: 'Wallaby', label: 'Wallaby' },
          { value: 'Bird', label: 'Bird' },
          { value: 'Reptile', label: 'Reptile' },
          { value: 'Other', label: 'Other' }
        ];
        
        // Set up default carers if none exist
        const defaultCarers = [
          { value: 'default-carer', label: 'Default Carer' }
        ];
        
        if (species && species.length > 0) {
          setSpeciesOptions(species.map((s: any) => ({ value: s.name, label: s.name })));
        } else {
          setSpeciesOptions(defaultSpecies);
        }
        
        if (carers && carers.length > 0) {
          setCarerOptions(carers.map((c: any) => ({ value: c.id, label: c.name })));
        } else {
          setCarerOptions(defaultCarers);
        }
      } catch (e) {
        console.error('Failed loading lookups', e);
        // Set defaults on error
        setSpeciesOptions([
          { value: 'Kangaroo', label: 'Kangaroo' },
          { value: 'Other', label: 'Other' }
        ]);
        setCarerOptions([
          { value: 'default-carer', label: 'Default Carer' }
        ]);
      }
    };
    loadLookups();
  }, [organization]);

  const handleAddRecord = async (newRecord: any) => {
    // Check if this is a release record - redirect to release checklist
    if (newRecord.type === 'RELEASE') {
      // Always redirect to release checklist for releases
      // The checklist will handle the entire release process
      window.location.href = `/compliance/release-checklist/new?animalId=${animal.id}`;
      return;
    }
    
    // For non-release records, persist via API
    const recordResponse = await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRecord),
    });
    
    if (!recordResponse.ok) {
      console.error('Failed to save record');
      return;
    }
    
    // Update local state
    setRecords(prevRecords => [newRecord, ...prevRecords].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  // Find the most recent release record
  const releaseRecord = useMemo(() => {
    return records.find(record => record.type === RecordType.RELEASE);
  }, [records]);

  // No need to sync status - the release checklist handles everything
  // This effect is removed to prevent conflicts

  // Get current jurisdiction for compliance checking
  const jurisdiction = getCurrentJurisdiction();

  // Function to update animal in data store
  const updateAnimalInStorage = async (updatedAnimal: Animal) => {
    try {
      const response = await fetch(`/api/animals/${updatedAnimal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedAnimal),
      });
      
      if (response.ok) {
        console.log('Animal status updated in data store');
        return true;
      } else {
        console.error('Failed to update animal status:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Error updating animal in data store:', error);
      return false;
    }
  };

  // Function to delete animal
  const handleDeleteAnimal = async () => {
    try {
      const response = await fetch(`/api/animals/${animal.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete animal');
      }
      
      toast({
        title: "Animal Deleted",
        description: `${animal.name} has been permanently deleted.`,
      });
      
      router.push('/');
    } catch (error) {
      console.error('Error deleting animal:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete animal. Please try again.",
      });
      throw error;
    }
  };

  // Debug: Log animal data to see what's available
  console.log('Animal data:', {
    id: animal.id,
    name: animal.name,
    rescueLocation: animal.rescueLocation,
    rescueCoordinates: animal.rescueCoordinates,
    rescueCoordinatesType: typeof animal.rescueCoordinates,
    rescueCoordinatesStringified: JSON.stringify(animal.rescueCoordinates),
    releaseLocation: animal.releaseLocation || releaseChecklist?.releaseLocation,
    releaseCoordinates: animal.releaseCoordinates || releaseChecklist?.releaseCoordinates,
    releaseNotes: animal.releaseNotes,
    dateReleased: animal.dateReleased,
    status: animal.status,
    hasReleaseRecord: !!releaseRecord,
    releaseRecordDate: releaseRecord?.date
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="flex items-center gap-2 text-primary">
              <ArrowLeft className="h-4 w-4" />
              Back to All Animals
            </Button>
          </Link>
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
                  
                  {/* Release Location Information - from Animal model or ReleaseChecklist */}
                  {(animal.releaseLocation || releaseChecklist?.releaseLocation) && (
                    <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-5 w-5 text-green-600"/>
                        <span className="font-semibold text-green-800">Release Location</span>
                      </div>
                      <p className="text-green-700 mb-2">{animal.releaseLocation || releaseChecklist.releaseLocation}</p>
                      {(() => {
                        const coords = (animal.releaseCoordinates || releaseChecklist?.releaseCoordinates) as { lat?: number; lng?: number } | null;
                        return coords && typeof coords.lat === 'number' && typeof coords.lng === 'number';
                      })() && (
                        <p className="text-sm text-green-600">
                          {(() => {
                            const coords = (animal.releaseCoordinates || releaseChecklist?.releaseCoordinates) as { lat?: number; lng?: number } | null;
                            const lat = coords?.lat as number | undefined;
                            const lng = coords?.lng as number | undefined;
                            return `Coordinates: ${lat?.toFixed(6)}, ${lng?.toFixed(6)}`;
                          })()}
                        </p>
                      )}
                      {(animal.dateReleased || releaseChecklist?.releaseDate) && (
                        <p className="text-sm text-green-600 mt-1">
                          Released on: {new Date(animal.dateReleased || releaseChecklist.releaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      )}
                      {animal.releaseNotes && (
                        <p className="text-sm text-green-600 mt-2">
                          Notes: {animal.releaseNotes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                 <div className="mt-6 flex gap-2">
                  <Button variant="outline" onClick={() => setIsEditOpen(true)}>Edit Animal</Button>
                  {(animal.status === AnimalStatus.IN_CARE || animal.status === AnimalStatus.READY_FOR_RELEASE) && (
                    <Button 
                      variant="default" 
                      onClick={() => {
                        window.location.href = `/compliance/release-checklist/new?animalId=${animal.id}`;
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Rocket className="mr-2 h-4 w-4" />
                      Release Animal
                    </Button>
                  )}
                  <Button 
                    variant="destructive" 
                    onClick={() => setIsDeleteOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {animal.status !== AnimalStatus.RELEASED ? (
                <>
                  {animal.status === AnimalStatus.IN_CARE && (
                    <Card className="border-blue-200 bg-blue-50">
                      <CardHeader>
                        <CardTitle className="text-blue-800">Ready to Release?</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-blue-700 mb-4">
                          If this animal is ready for release, use the Release button above to start the compliance checklist process.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                  <AddRecordForm animalId={animal.id} onRecordAdd={handleAddRecord} />
                </>
              ) : (
                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-green-800">Animal Successfully Released</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-green-700">
                      This animal has been released on {animal.dateReleased ? new Date(animal.dateReleased).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown date'}.
                    </p>
                    {animal.releaseLocation && (
                      <p className="text-sm text-green-700 mt-2">
                        Release location: {animal.releaseLocation}
                      </p>
                    )}
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
                releaseLocation={((): { lat: number; lng: number; address: string } | undefined => {
                  // Try Animal model first, then ReleaseChecklist
                  const coords = (animal.releaseCoordinates || releaseChecklist?.releaseCoordinates) as { lat?: number; lng?: number } | null;
                  const location = animal.releaseLocation || releaseChecklist?.releaseLocation;
                  
                  if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number' && location) {
                    return { lat: coords.lat, lng: coords.lng, address: location };
                  }
                  return undefined;
                })()}
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
      
      {/* Delete Animal Dialog */}
      <DeleteAnimalDialog
        isOpen={isDeleteOpen}
        setIsOpen={setIsDeleteOpen}
        animalName={animal.name}
        onConfirm={handleDeleteAnimal}
      />
    </div>
  );
}
