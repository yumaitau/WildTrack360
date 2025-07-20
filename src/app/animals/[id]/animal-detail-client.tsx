"use client";

import Image from "next/image";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSpeciesIcon } from "@/components/icons";
import RecordTimeline from "@/components/record-timeline";
import PhotoGallery from "@/components/photo-gallery";
import { Download, ArrowLeft, User, CalendarDays } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { AddRecordForm } from "@/components/add-record-form";
import type { Animal, Photo, Record } from "@/lib/types";
import { useState } from "react";

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

  const handleAddRecord = (newRecord: Record) => {
    setRecords(prevRecords => [newRecord, ...prevRecords].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

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
                </div>
                 <div className="mt-6">
                  <Button variant="secondary">
                    <Download className="mr-2 h-4 w-4"/>
                    Export CSV
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <AddRecordForm animalId={animal.id} onRecordAdd={handleAddRecord} />
              <RecordTimeline records={records} />
            </div>
            <div>
              <PhotoGallery initialPhotos={photos} animalId={animal.id} animalSpecies={animal.species} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
