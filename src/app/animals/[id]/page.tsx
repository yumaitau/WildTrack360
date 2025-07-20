import { getAnimalById, getRecordsByAnimalId, getPhotosByAnimalId } from "@/lib/data";
import { notFound } from "next/navigation";
import AnimalDetailClient from "./animal-detail-client";

type AnimalDetailPageProps = {
  params: {
    id: string;
  };
};

export default async function AnimalDetailPage({ params }: AnimalDetailPageProps) {
  const animalData = await getAnimalById(params.id);
  
  if (!animalData) {
    notFound();
  }
  
  const recordsData = await getRecordsByAnimalId(params.id);
  const photosData = await getPhotosByAnimalId(params.id);

  return (
    <AnimalDetailClient 
      initialAnimal={animalData}
      initialRecords={recordsData}
      initialPhotos={photosData}
    />
  );
}
