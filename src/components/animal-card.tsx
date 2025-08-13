import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { Animal } from '@prisma/client';
import { getSpeciesIcon } from './icons';
import { StatusBadge } from './status-badge';

interface AnimalCardProps {
  animal: Animal;
}

export default function AnimalCard({ animal }: AnimalCardProps) {
  return (
    <Link href={`/animals/${animal.id}`} className="group block">
      <Card className="h-full flex flex-col transition-all duration-300 ease-in-out group-hover:shadow-xl group-hover:-translate-y-1">
        <CardHeader className="p-0">
          <div className="relative aspect-video rounded-t-lg overflow-hidden">
            <Image
              src={animal.photo || '/Brandmark-Text-Vert.svg'}
              alt={`Photo of ${animal.name}`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              data-ai-hint={`${animal.species.toLowerCase()}`}
            />
          </div>
        </CardHeader>
        <CardContent className="flex-grow p-4">
          <CardTitle className="flex items-center gap-2 font-headline text-xl">
            {getSpeciesIcon(animal.species, { className: "h-6 w-6 text-primary"})}
            {animal.name}
          </CardTitle>
          <p className="text-muted-foreground">{animal.species}</p>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <StatusBadge status={animal.status} />
        </CardFooter>
      </Card>
    </Link>
  );
}
