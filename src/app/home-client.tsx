// src/app/home-client.tsx
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PawPrint, PlusCircle, Download, Settings, List, LayoutGrid, Shield, User, RefreshCw } from 'lucide-react';
import { Animal } from '@/lib/types';
import { AnimalTable } from '@/components/animal-table';
import { useState, useEffect } from 'react';
import { AddAnimalDialog } from '@/components/add-animal-dialog';
import { updateAnimal, createAnimal, getAnimals, getSpecies, getCarers } from '@/lib/data-store';
import DashboardStats from '@/components/dashboard-stats';
import SpeciesDistributionChart from '@/components/species-distribution-chart';
import RecentAdmissionsChart from '@/components/recent-admissions-chart';
import CarerDistributionChart from '@/components/carer-distribution-chart';
import ReleasesVsAdmissionsChart from '@/components/releases-vs-admissions-chart';
import AnimalCard from '@/components/animal-card';
import { Input } from '@/components/ui/input';
import { useSearchParams } from 'next/navigation';

interface HomeClientProps {
  initialAnimals: Animal[];
  species: string[];
  carers: string[];
}

export default function HomeClient({ initialAnimals, species, carers }: HomeClientProps) {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [speciesList, setSpeciesList] = useState<string[]>(species);
  const [carersList, setCarersList] = useState<string[]>(carers);

  // Load data from data store on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [animalsData, speciesData, carersData] = await Promise.all([
          getAnimals(),
          getSpecies(),
          getCarers()
        ]);
        
        setAnimals(animalsData.sort((a: Animal, b: Animal) => 
          new Date(b.dateFound).getTime() - new Date(a.dateFound).getTime()
        ));
        setSpeciesList(speciesData);
        setCarersList(carersData);
        
        console.log('HomeClient - loaded data from data store:', {
          animals: animalsData.length,
          species: speciesData.length,
          carers: carersData.length
        });
      } catch (error) {
        console.error('Error loading data from data store:', error);
        // Fallback to initial props if data store fails
        setAnimals(initialAnimals);
        setSpeciesList(species);
        setCarersList(carers);
      }
    };

    loadData();
  }, [initialAnimals, species, carers]);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [animalToEdit, setAnimalToEdit] = useState<Animal | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchTerm, setSearchTerm] = useState('');

  const searchParams = useSearchParams();
  const admissionDateFilter = searchParams.get('admissionDate');

  // Hardcoded user for demo purposes - in real app this would come from auth context
  const currentUser = {
    name: "John Doe",
    role: "admin" as "admin" | "carer" | "coordinator"
  };

  useEffect(() => {
    if (admissionDateFilter) {
      setViewMode('table');
    }
  }, [admissionDateFilter]);

  // Listen for localStorage changes to refresh data
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'wildhub-animals' || e.key === 'wildhub-records') {
        const refreshData = async () => {
          try {
            const [animalsData, speciesData, carersData] = await Promise.all([
              getAnimals(),
              getSpecies(),
              getCarers()
            ]);
            
            setAnimals(animalsData.sort((a: Animal, b: Animal) => 
              new Date(b.dateFound).getTime() - new Date(a.dateFound).getTime()
            ));
            setSpeciesList(speciesData);
            setCarersList(carersData);
          } catch (error) {
            console.error('Error refreshing data from data store:', error);
          }
        };
        refreshData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Manual refresh function for debugging
  const refreshAnimalsData = async () => {
    try {
      const [animalsData, speciesData, carersData] = await Promise.all([
        getAnimals(),
        getSpecies(),
        getCarers()
      ]);
      
      setAnimals(animalsData.sort((a: Animal, b: Animal) => 
        new Date(b.dateFound).getTime() - new Date(a.dateFound).getTime()
      ));
      setSpeciesList(speciesData);
      setCarersList(carersData);
      
      console.log('Manual refresh - data from data store:', {
        animals: animalsData.length,
        species: speciesData.length,
        carers: carersData.length,
        releasedAnimals: animalsData.filter((a: Animal) => a.status === 'Released').map((a: Animal) => a.name)
      });
    } catch (error) {
      console.error('Error manually refreshing data:', error);
    }
  };

  const handleOpenAddDialog = () => {
    setAnimalToEdit(null);
    setAddDialogOpen(true);
  };
  
  const handleOpenEditDialog = (animal: Animal) => {
    setAnimalToEdit(animal);
    setAddDialogOpen(true);
  }

  const handleAnimalSubmit = async (submittedAnimal: Animal) => {
    console.log('handleAnimalSubmit called with:', submittedAnimal);
    const isEditing = animals.some(animal => animal.id === submittedAnimal.id);
    
    if (isEditing) {
      // Update existing animal
      try {
        await updateAnimal(submittedAnimal.id, submittedAnimal);
        console.log('Animal updated successfully');
      } catch (error) {
        console.error('Error updating animal:', error);
      }
    } else {
      // Create new animal
      try {
        await createAnimal(submittedAnimal);
        console.log('Animal created successfully');
      } catch (error) {
        console.error('Error creating animal:', error);
      }
    }
    
    // Refresh animals from data store
    await refreshAnimalsData();
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
            <div className="flex items-center gap-3">
              {/* Primary Actions */}
              <div className="flex items-center gap-2">
                <Button onClick={handleOpenAddDialog}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Animal
                </Button>
                <Button asChild variant="default">
                  <Link href="/animals">
                    <List className="mr-2 h-4 w-4" />
                    View All Animals
                  </Link>
                </Button>
              </div>

              {/* Navigation */}
              <div className="flex items-center gap-2">
                <Button asChild variant="outline">
                  <Link href="/compliance">
                    <Shield className="mr-2 h-4 w-4" />
                    Compliance
                  </Link>
                </Button>
                {currentUser.role === 'admin' && (
                  <Button asChild variant="outline">
                    <Link href="/admin">
                      <User className="mr-2 h-4 w-4" />
                      Admin
                    </Link>
                  </Button>
                )}
              </div>

              {/* Utilities */}
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={refreshAnimalsData}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                <Button variant="secondary">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
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
          <div className="grid gap-8 md:grid-cols-2">
            <RecentAdmissionsChart animals={animals} />
            <ReleasesVsAdmissionsChart animals={animals} />
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
                    <Button asChild variant="outline">
                      <Link href="/animals">
                        <List className="mr-2 h-4 w-4" />
                        View All Animals
                      </Link>
                    </Button>
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
        speciesOptions={speciesList}
        carerOptions={carersList}
      />
    </div>
  );
}
