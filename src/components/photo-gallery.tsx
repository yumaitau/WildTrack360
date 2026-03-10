"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Button } from './ui/button';
import { Camera, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import type { Photo } from '@prisma/client';
import ImageUploadDialog from './image-upload-dialog';
import { getPhotoUrl } from '@/lib/photo-url';
import { useToast } from '@/hooks/use-toast';

interface PhotoGalleryProps {
  initialPhotos: Photo[];
  animalId: string;
  animalSpecies: string;
  canManagePhotos?: boolean;
}

export default function PhotoGallery({
  initialPhotos,
  animalId,
  animalSpecies,
  canManagePhotos = false,
}: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [isUploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleAddPhoto = (photo: Photo) => {
    setPhotos([photo, ...photos]);
  };

  const handleDeletePhoto = async (photoId: string) => {
    setDeletingPhotoId(photoId);
    try {
      const response = await fetch(`/api/photos/delete/${photoId}`, { method: 'DELETE' });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete photo');
      }
      setPhotos(prev => prev.filter(p => p.id !== photoId));
      toast({
        title: "Photo Deleted",
        description: "The photo has been permanently removed.",
      });
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete photo.",
        variant: "destructive",
      });
    } finally {
      setDeletingPhotoId(null);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-6 w-6 text-primary" />
          Photo Gallery
        </CardTitle>
        {canManagePhotos && (
          <Button size="sm" onClick={() => setUploadDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4"/>
            Add Photo
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {photos.length > 0 ? (
          <Carousel>
            <CarouselContent>
              {photos.map((photo) => (
                <CarouselItem key={photo.id}>
                  <div className="p-1">
                    <div className="relative overflow-hidden rounded-lg">
                       {/* eslint-disable-next-line @next/next/no-img-element */}
                       <img
                        src={getPhotoUrl(photo.url) || ''}
                        alt={photo.description}
                        className="w-full h-auto max-h-[400px] object-cover"
                      />
                      {canManagePhotos && (
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8"
                          disabled={deletingPhotoId === photo.id}
                          onClick={() => handleDeletePhoto(photo.id)}
                        >
                          {deletingPhotoId === photo.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
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
