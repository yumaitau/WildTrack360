"use client"

import { useEffect, useState, use } from "react";
import { getAnimalById, getRecordsByAnimalId, getPhotosByAnimalId } from "@/lib/data-store";
import { notFound } from "next/navigation";
import AnimalDetailClient from "./animal-detail-client";
import { Animal, Record, Photo } from "@/lib/types";

type AnimalDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function AnimalDetailPage({ params }: AnimalDetailPageProps) {
  const unwrappedParams = use(params) as { id: string };
  const [animalData, setAnimalData] = useState<Animal | null>(null);
  const [recordsData, setRecordsData] = useState<Record[]>([]);
  const [photosData, setPhotosData] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFoundError, setNotFoundError] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const animal = await getAnimalById(unwrappedParams.id);
        if (!animal) {
          setNotFoundError(true);
          return;
        }

        const records = await getRecordsByAnimalId(unwrappedParams.id);
        const photos = await getPhotosByAnimalId(unwrappedParams.id);

        setAnimalData(animal);
        setRecordsData(records);
        setPhotosData(photos);
      } catch (error) {
        console.error('Error loading animal data:', error);
        setNotFoundError(true);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [unwrappedParams.id]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading animal details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (notFoundError || !animalData) {
    notFound();
  }

  return (
    <AnimalDetailClient 
      initialAnimal={animalData}
      initialRecords={recordsData}
      initialPhotos={photosData}
    />
  );
}
