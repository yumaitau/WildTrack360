"use client";

import Image from "next/image";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSpeciesIcon } from "@/components/icons";
import RecordTimeline from "@/components/record-timeline";
import PhotoGallery from "@/components/photo-gallery";
import { Download, ArrowLeft, User, CalendarDays, MapPin } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { AddRecordForm } from "@/components/add-record-form";
import LocationMap from "@/components/location-map";
import type { Animal, Photo, Record } from "@/lib/types";
import React, { useState, useMemo, useEffect } from "react";
import { getCurrentJurisdiction } from "@/lib/config";
import { updateAnimal, createRecord } from "@/lib/data-store";

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
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);

  const handleAddRecord = async (newRecord: Record) => {
    // Add record to data store
    await createRecord(newRecord);
    
    // Update local state
    setRecords(prevRecords => [newRecord, ...prevRecords].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    
    // If this is a release record, update the animal status to "Released"
    if (newRecord.type === 'Release' && newRecord.location) {
      const updatedAnimal = {
        ...animal,
        status: 'Released' as const,
        finalOutcome: 'Successfully released',
        outcomeDate: newRecord.datetime || newRecord.date
      };
      setAnimal(updatedAnimal);
      
      // Update the animal in data store
      await updateAnimal(updatedAnimal.id, updatedAnimal);
    }
  };

  // Find the most recent release record
  const releaseRecord = useMemo(() => {
    return records.find(record => record.type === 'Release' && record.location);
  }, [records]);

  // Check if animal has a release record but status is not "Released" and update it
  useEffect(() => {
    if (releaseRecord && animal.status !== 'Released') {
      console.log('Found release record but animal status is not Released, updating...');
      const updatedAnimal = {
        ...animal,
        status: 'Released' as const,
        finalOutcome: 'Successfully released',
        outcomeDate: releaseRecord.datetime || releaseRecord.date
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
      await updateAnimal(updatedAnimal.id, updatedAnimal);
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
                <Image 
                  src={animal.photo} 
                  alt={animal.name}
                  fill
                  className="object-cover"
                  data-ai-hint={`${animal.species.toLowerCase()}`}
                />
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
                      <span className="font-semibold">Carer:</span> {animal.carer}
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
                      {animal.rescueCoordinates && (
                        <p className="text-sm text-blue-600">
                          Coordinates: {animal.rescueCoordinates.lat.toFixed(6)}, {animal.rescueCoordinates.lng.toFixed(6)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                 <div className="mt-6 flex gap-2">
                  <Button variant="secondary">
                    <Download className="mr-2 h-4 w-4"/>
                    Export CSV
                  </Button>
                  {releaseRecord && animal.status !== 'Released' && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        const updatedAnimal = {
                          ...animal,
                          status: 'Released' as const,
                          finalOutcome: 'Successfully released',
                          outcomeDate: releaseRecord.datetime || releaseRecord.date
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
              <AddRecordForm animalId={animal.id} onRecordAdd={handleAddRecord} />
              <RecordTimeline 
                records={records} 
                rescueLocation={animal.rescueCoordinates ? {
                  lat: animal.rescueCoordinates.lat,
                  lng: animal.rescueCoordinates.lng,
                  address: animal.rescueLocation
                } : undefined}
                jurisdiction={jurisdiction}
              />
            </div>
            <div className="space-y-8">
              <LocationMap 
                rescueLocation={animal.rescueLocation && animal.rescueCoordinates ? {
                  lat: animal.rescueCoordinates.lat,
                  lng: animal.rescueCoordinates.lng,
                  address: animal.rescueLocation
                } : undefined}
                releaseLocation={releaseRecord ? {
                  lat: releaseRecord.location!.lat,
                  lng: releaseRecord.location!.lng,
                  address: releaseRecord.location!.address
                } : undefined}
                animalName={animal.name}
                jurisdiction={jurisdiction}
              />
              <PhotoGallery initialPhotos={photos} animalId={animal.id} animalSpecies={animal.species} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
