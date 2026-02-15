"use client";

import Image from "next/image";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSpeciesIcon } from "@/components/icons";
import RecordTimeline from "@/components/record-timeline";
import { ArrowLeft, User, CalendarDays, MapPin, Rocket, Trash2, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { AddRecordForm } from "@/components/add-record-form";
import LocationMap from "@/components/location-map";
import { type Animal, type Photo, type Record } from "@/lib/types";
import React, { useState, useMemo, useEffect } from "react";
import { getCurrentJurisdiction } from "@/lib/config";
import { AnimalStatus, RecordType } from "@prisma/client";
import { AddAnimalDialog } from "@/components/add-animal-dialog";
import { DeleteAnimalDialog } from "@/components/delete-animal-dialog";
import { useOrganization, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

interface AnimalDetailClientProps {
  initialAnimal: Animal;
  initialRecords: Record[];
  initialPhotos: Photo[];
  releaseChecklist?: any;
  userMap?: { [clerkUserId: string]: string };
}

export default function AnimalDetailClient({
  initialAnimal,
  initialRecords,
  initialPhotos,
  releaseChecklist,
  userMap = {},
}: AnimalDetailClientProps) {
  const [animal, setAnimal] = useState<Animal>(initialAnimal);
  const [records, setRecords] = useState<Record[]>(initialRecords);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const { organization } = useOrganization();
  const { user } = useUser();
  const [liveUserMap, setLiveUserMap] = useState<{ [clerkUserId: string]: string }>(userMap);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isAssignCarerOpen, setIsAssignCarerOpen] = useState(false);
  const [selectedCarerId, setSelectedCarerId] = useState<string>(animal.carerId || "");
  const [isAssigningCarer, setIsAssigningCarer] = useState(false);
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
          fetch(`/api/carers?orgId=${orgId}&species=${encodeURIComponent(animal.species)}&assignable=true`),
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
  }, [organization, animal.species]);

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

    const savedRecord = await recordResponse.json();

    // Ensure the current user is in the user map for "Recorded by" display
    if (savedRecord.clerkUserId && user && !liveUserMap[savedRecord.clerkUserId]) {
      const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.emailAddresses?.[0]?.emailAddress || "Unknown";
      setLiveUserMap(prev => ({ ...prev, [savedRecord.clerkUserId]: name }));
    }

    // Update local state with the full server record (includes id, createdAt, clerkUserId, etc.)
    setRecords(prevRecords => [savedRecord, ...prevRecords].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
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

  const handleAssignCarer = async () => {
    setIsAssigningCarer(true);
    try {
      const res = await fetch(`/api/animals/${animal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carerId: selectedCarerId || null,
          clerkOrganizationId: organization?.id,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to assign carer' }));
        throw new Error(err.error || 'Failed to assign carer');
      }
      const updated = await res.json();
      setAnimal(prev => ({ ...prev, ...updated }));
      setIsAssignCarerOpen(false);
      toast({
        title: "Carer Updated",
        description: selectedCarerId
          ? `Carer assigned to ${animal.name}.`
          : `Carer removed from ${animal.name}.`,
      });
    } catch (e) {
      console.error('Failed to assign carer', e);
      toast({
        variant: 'destructive',
        title: 'Assignment failed',
        description: e instanceof Error ? e.message : 'Failed to assign carer',
      });
    } finally {
      setIsAssigningCarer(false);
    }
  };

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
            <div>
              <div className="p-6 flex flex-col justify-between">
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
                      <span className="font-semibold">Carer:</span> {carerOptions.find(c => c.value === animal.carerId)?.label ?? '—'}
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-2"
                        onClick={() => {
                          setSelectedCarerId(animal.carerId || "");
                          setIsAssignCarerOpen(true);
                        }}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        {animal.carerId ? 'Change Carer' : 'Assign Carer'}
                      </Button>
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
                  
                  {/* Detailed Animal Information */}
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Basic Details */}
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg mb-2">Basic Details</h3>
                      {animal.sex && (
                        <div className="flex items-start gap-2">
                          <span className="font-medium text-muted-foreground">Sex:</span>
                          <span>{animal.sex}</span>
                        </div>
                      )}
                      {animal.ageClass && (
                        <div className="flex items-start gap-2">
                          <span className="font-medium text-muted-foreground">Age Class:</span>
                          <span>{animal.ageClass}</span>
                        </div>
                      )}
                      {animal.age && (
                        <div className="flex items-start gap-2">
                          <span className="font-medium text-muted-foreground">Age:</span>
                          <span>{animal.age}</span>
                        </div>
                      )}
                      {animal.dateOfBirth && (
                        <div className="flex items-start gap-2">
                          <span className="font-medium text-muted-foreground">Date of Birth:</span>
                          <span>{new Date(animal.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                      )}
                      {animal.outcomeDate && (
                        <div className="flex items-start gap-2">
                          <span className="font-medium text-muted-foreground">Outcome Date:</span>
                          <span>{new Date(animal.outcomeDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                      )}
                      {animal.outcome && (
                        <div className="flex items-start gap-2">
                          <span className="font-medium text-muted-foreground">Outcome:</span>
                          <span>{animal.outcome}</span>
                        </div>
                      )}
                    </div>

                    {/* NSW Compliance Fields */}
                    {jurisdiction === 'NSW' && (
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg mb-2">NSW Compliance Data</h3>
                        {animal.encounterType && (
                          <div className="flex items-start gap-2">
                            <span className="font-medium text-muted-foreground">Encounter Type:</span>
                            <span>{animal.encounterType}</span>
                          </div>
                        )}
                        {animal.initialWeightGrams !== null && animal.initialWeightGrams !== undefined && (
                          <div className="flex items-start gap-2">
                            <span className="font-medium text-muted-foreground">Initial Weight:</span>
                            <span>{animal.initialWeightGrams}g</span>
                          </div>
                        )}
                        {animal.animalCondition && (
                          <div className="flex items-start gap-2">
                            <span className="font-medium text-muted-foreground">Animal Condition:</span>
                            <span>{animal.animalCondition}</span>
                          </div>
                        )}
                        {animal.pouchCondition && (
                          <div className="flex items-start gap-2">
                            <span className="font-medium text-muted-foreground">Pouch Condition:</span>
                            <span>{animal.pouchCondition}</span>
                          </div>
                        )}
                        {animal.fate && (
                          <div className="flex items-start gap-2">
                            <span className="font-medium text-muted-foreground">Fate:</span>
                            <span>{animal.fate}</span>
                          </div>
                        )}
                        {animal.markBandMicrochip && (
                          <div className="flex items-start gap-2">
                            <span className="font-medium text-muted-foreground">Mark/Band/Microchip:</span>
                            <span>{animal.markBandMicrochip}</span>
                          </div>
                        )}
                        {animal.lifeStage && (
                          <div className="flex items-start gap-2">
                            <span className="font-medium text-muted-foreground">Life Stage:</span>
                            <span>{animal.lifeStage}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Address Details */}
                    {(animal.rescueAddress || animal.rescueSuburb || animal.rescuePostcode || 
                      animal.releaseAddress || animal.releaseSuburb || animal.releasePostcode) && (
                      <div className="space-y-2 md:col-span-2">
                        <h3 className="font-semibold text-lg mb-2">Address Details</h3>
                        
                        {(animal.rescueAddress || animal.rescueSuburb || animal.rescuePostcode) && (
                          <div className="mb-3">
                            <h4 className="font-medium text-muted-foreground mb-1">Rescue Address:</h4>
                            <div className="ml-4 space-y-1">
                              {animal.rescueAddress && <div>{animal.rescueAddress}</div>}
                              {(animal.rescueSuburb || animal.rescuePostcode) && (
                                <div>
                                  {animal.rescueSuburb && <span>{animal.rescueSuburb}</span>}
                                  {animal.rescueSuburb && animal.rescuePostcode && <span>, </span>}
                                  {animal.rescuePostcode && <span>{animal.rescuePostcode}</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {(animal.releaseAddress || animal.releaseSuburb || animal.releasePostcode) && (
                          <div>
                            <h4 className="font-medium text-muted-foreground mb-1">Release Address:</h4>
                            <div className="ml-4 space-y-1">
                              {animal.releaseAddress && <div>{animal.releaseAddress}</div>}
                              {(animal.releaseSuburb || animal.releasePostcode) && (
                                <div>
                                  {animal.releaseSuburb && <span>{animal.releaseSuburb}</span>}
                                  {animal.releaseSuburb && animal.releasePostcode && <span>, </span>}
                                  {animal.releasePostcode && <span>{animal.releasePostcode}</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    {animal.notes && (
                      <div className="space-y-2 md:col-span-2">
                        <h3 className="font-semibold text-lg mb-2">Notes</h3>
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm whitespace-pre-wrap">{animal.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
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
                userMap={liveUserMap}
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
            const res = await fetch(`/api/animals/${animal.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...data, clerkOrganizationId: organization?.id }),
            });
            if (!res.ok) {
              const err = await res.json().catch(() => ({ error: 'Failed to update animal' }));
              throw new Error(err.error || 'Failed to update animal');
            }
            const updated = await res.json();
            setAnimal(prev => ({ ...prev, ...updated }));
            setIsEditOpen(false);
          } catch (e) {
            console.error('Failed to save animal', e);
            toast({
              variant: 'destructive',
              title: 'Update failed',
              description: e instanceof Error ? e.message : 'Failed to update animal',
            });
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

      {/* Assign Carer Dialog */}
      <Dialog open={isAssignCarerOpen} onOpenChange={setIsAssignCarerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{animal.carerId ? 'Change' : 'Assign'} Carer for {animal.name}</DialogTitle>
            <DialogDescription>
              Select a carer to assign to this animal. Only carers with completed profiles are shown.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedCarerId} onValueChange={setSelectedCarerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a carer" />
              </SelectTrigger>
              <SelectContent>
                {carerOptions.map((c: any) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            {animal.carerId && (
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedCarerId("");
                  handleAssignCarer();
                }}
                disabled={isAssigningCarer}
              >
                Remove Carer
              </Button>
            )}
            <Button onClick={handleAssignCarer} disabled={isAssigningCarer || !selectedCarerId}>
              {isAssigningCarer ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
