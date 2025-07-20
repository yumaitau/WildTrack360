// src/app/home-client.tsx
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PawPrint, PlusCircle, Download, Settings, List, LayoutGrid } from 'lucide-react';
import { Animal } from '@/lib/types';
import { AnimalTable } from '@/components/animal-table';
import { useState, useEffect } from 'react';
import { AddAnimalDialog } from '@/components/add-animal-dialog';
import DashboardStats from '@/components/dashboard-stats';
import SpeciesDistributionChart from '@/components/species-distribution-chart';
import RecentAdmissionsChart from '@/components/recent-admissions-chart';
import CarerDistributionChart from '@/components/carer-distribution-chart';
import AnimalCard from '@/components/animal-card';
import { Input } from '@/components/ui/input';
import { useSearchParams } from 'next/navigation';

interface HomeClientProps {
  initialAnimals: Animal[];
  species: string[];
  carers: string[];
}

export default function HomeClient({ initialAnimals, species, carers }: HomeClientProps) {
  const [animals, setAnimals] = useState<Animal[]>(initialAnimals);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [animalToEdit, setAnimalToEdit] = useState<Animal | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchTerm, setSearchTerm] = useState('');

  const searchParams = useSearchParams();
  const admissionDateFilter = searchParams.get('admissionDate');

  useEffect(() => {
    if (admissionDateFilter) {
      setViewMode('table');
    }
  }, [admissionDateFilter]);

  const handleOpenAddDialog = () => {
    setAnimalToEdit(null);
    setAddDialogOpen(true);
  };
  
  const handleOpenEditDialog = (animal: Animal) => {
    setAnimalToEdit(animal);
    setAddDialogOpen(true);
  }

  const handleAnimalSubmit = (submittedAnimal: Animal) => {
    const isEditing = animals.some(animal => animal.id === submittedAnimal.id);
    let updatedAnimals;
    if (isEditing) {
        updatedAnimals = animals.map(animal => animal.id === submittedAnimal.id ? submittedAnimal : animal);
    } else {
        updatedAnimals = [submittedAnimal, ...animals];
    }
    setAnimals(updatedAnimals.sort((a,b) => new Date(b.dateFound).getTime() - new Date(a.dateFound).getTime()));
  };
  
  const filteredAnimals = animals.filter(animal => {
    const matchesSearch = animal.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          animal.species.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = admissionDateFilter ? animal.dateFound === admissionDateFilter : true;
    return matchesSearch && matchesDate;
  });

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="bg-card shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-full">
                <PawPrint className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold font-headline text-primary">
                WildHub
              </h1>
            </Link>
            <div className="flex items-center gap-2">
              <Button onClick={handleOpenAddDialog}>
                <PlusCircle className="mr-2" />
                Add Animal
              </Button>
               <Button variant="secondary">
                <Download className="mr-2" />
                Export All
              </Button>
              <Button asChild variant="outline" size="icon">
                <Link href="/admin">
                  <Settings />
                  <span className="sr-only">Admin Settings</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <DashboardStats animals={animals} />
          <div className="grid gap-8 md:grid-cols-2">
            <SpeciesDistributionChart animals={animals} />
            <CarerDistributionChart animals={animals} />
          </div>
           <div className="grid gap-8">
             <RecentAdmissionsChart animals={animals} />
           </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-primary">Animal Records</h2>
                <div className="flex items-center gap-2">
                   {(viewMode === 'grid' && !admissionDateFilter) && (
                     <Input 
                        placeholder="Search animals..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-48"
                     />
                   )}
                    <Button variant="outline" size="icon" onClick={() => setViewMode('grid')}>
                        <LayoutGrid className={viewMode === 'grid' ? 'text-primary' : ''}/>
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setViewMode('table')}>
                        <List className={viewMode === 'table' ? 'text-primary' : ''}/>
                    </Button>
                </div>
            </div>

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredAnimals.map(animal => (
                        <AnimalCard key={animal.id} animal={animal} />
                    ))}
                </div>
            ) : (
                <AnimalTable animals={filteredAnimals} onEdit={handleOpenEditDialog} />
            )}
          </div>
        </div>
      </main>
       <footer className="text-center py-4 text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} WildHub. All rights reserved.</p>
      </footer>
      <AddAnimalDialog 
        isOpen={isAddDialogOpen}
        setIsOpen={setAddDialogOpen}
        onAnimalAdd={handleAnimalSubmit}
        animalToEdit={animalToEdit}
        speciesOptions={species}
        carerOptions={carers}
      />
    </div>
  );
}
