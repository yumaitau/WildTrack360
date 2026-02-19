"use client";

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Button } from './ui/button';
import { Camera, PlusCircle } from 'lucide-react';
import type { Photo } from '@prisma/client';
import ImageUploadDialog from './image-upload-dialog';

interface PhotoGalleryProps {
  initialPhotos: Photo[];
  animalId: string;
  animalSpecies: string;
}

type NewPhotoInput = { id: string; animalId: string; url: string; date: Date; description: string };

export default function PhotoGallery({ initialPhotos, animalId, animalSpecies }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [isUploadDialogOpen, setUploadDialogOpen] = useState(false);
  
  const handleAddPhoto = (newPhoto: NewPhotoInput) => {
    const photo: Photo = {
      ...newPhoto,
      createdAt: new Date(),
      updatedAt: new Date(),
      clerkUserId: '',
      clerkOrganizationId: '',
      environment: 'PRODUCTION',
    };
    setPhotos([photo, ...photos]);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-6 w-6 text-primary" />
          Photo Gallery
        </CardTitle>
        <Button size="sm" onClick={() => setUploadDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4"/>
          Add Photo
        </Button>
      </CardHeader>
      <CardContent>
        {photos.length > 0 ? (
          <Carousel>
            <CarouselContent>
              {photos.map((photo) => (
                <CarouselItem key={photo.id}>
                  <div className="p-1">
                    <div className="relative aspect-4/3 overflow-hidden rounded-lg">
                       <Image
                        src={photo.url}
                        alt={photo.description}
                        fill
                        className="object-cover"
                        data-ai-hint={`${animalSpecies.toLowerCase()}`}
                      />
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                        <p className="font-semibold">{new Date(photo.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <p>{photo.description}</p>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No photos have been added yet.</p>
          </div>
        )}
      </CardContent>
      <ImageUploadDialog
        isOpen={isUploadDialogOpen}
        setIsOpen={setUploadDialogOpen}
        onPhotoAdd={handleAddPhoto}
        animalId={animalId}
      />
    </Card>
  );
}
