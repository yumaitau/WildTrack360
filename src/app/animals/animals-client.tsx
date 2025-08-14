"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PawPrint, PlusCircle, ArrowLeft, List, LayoutGrid, Search } from 'lucide-react';
import { Animal } from '@/lib/types';
import { AnimalTable } from '@/components/animal-table';
import { useState, useEffect } from 'react';
import { AddAnimalDialog } from '@/components/add-animal-dialog';
import AnimalCard from '@/components/animal-card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useUser, useOrganization } from '@clerk/nextjs';

interface AnimalsClientProps {
  initialAnimals: Animal[];
  species: string[];
  carers: string[];
}

export default function AnimalsClient({ initialAnimals, species, carers }: AnimalsClientProps) {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [speciesList, setSpeciesList] = useState<string[]>(species);
  const [carersList, setCarersList] = useState<string[]>(carers);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [animalToEdit, setAnimalToEdit] = useState<Animal | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [speciesFilter, setSpeciesFilter] = useState<string>('all');
  const { user } = useUser();
  const { organization } = useOrganization();
  // Load data via API on component mount/org change
  useEffect(() => {
    const loadData = async () => {
      try {
        if (!organization) return;
        const orgId = organization.id;
        const [animalsData, speciesData, carersData] = await Promise.all([
          fetch(`/api/animals?orgId=${orgId}`).then(r => r.json()),
          fetch(`/api/species?orgId=${orgId}`).then(r => r.json()),
          fetch(`/api/carers?orgId=${orgId}`).then(r => r.json()),
        ]);
        
        setAnimals(animalsData.sort((a: Animal, b: Animal) => 
          new Date(b.dateFound).getTime() - new Date(a.dateFound).getTime()
        ));
        setSpeciesList(speciesData.map((s: any) => s.name || ''));
        setCarersList(carersData.map((c: any) => c.name || ''));
      } catch (error) {
        console.error('Error loading data from data store:', error);
        // Fallback to initial props if data store fails
        setAnimals(initialAnimals);
        setSpeciesList(species);
        setCarersList(carers);
      }
    };

    loadData();
  }, [initialAnimals, species, carers, organization]);

  // Listen for localStorage changes to refresh data (legacy support); refetch via API
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'wildtrack360-animals' || e.key === 'wildtrack360-records') {
        const refreshData = async () => {
          try {
            if (!organization) return;
            const orgId = organization.id;
            const [animalsData, speciesData, carersData] = await Promise.all([
              fetch(`/api/animals?orgId=${orgId}`).then(r => r.json()),
              fetch(`/api/species?orgId=${orgId}`).then(r => r.json()),
              fetch(`/api/carers?orgId=${orgId}`).then(r => r.json()),
            ]);
            
            setAnimals(animalsData.sort((a: Animal, b: Animal) => 
              new Date(b.dateFound).getTime() - new Date(a.dateFound).getTime()
            ));
            setSpeciesList(speciesData.map((s: any) => s.name || ''));
            setCarersList(carersData.map((c: any) => c.name || ''));
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

  const handleOpenAddDialog = () => {
    setAnimalToEdit(null);
    setAddDialogOpen(true);
  };
  
  const handleOpenEditDialog = (animal: Animal) => {
    setAnimalToEdit(animal);
    setAddDialogOpen(true);
  }

  // Adapter for AddAnimalDialog (create-only)
  const handleAnimalAdd = async (animalData: any) => {
    if (!user || !organization) return;
    try {
      await fetch('/api/animals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...animalData, clerkOrganizationId: organization.id })
      });
      const [animalsData, speciesData, carersData] = await Promise.all([
        fetch(`/api/animals?orgId=${organization.id}`).then(r => r.json()),
        fetch(`/api/species?orgId=${organization.id}`).then(r => r.json()),
        fetch(`/api/carers?orgId=${organization.id}`).then(r => r.json()),
      ]);
      setAnimals(animalsData.sort((a: Animal, b: Animal) => new Date(b.dateFound).getTime() - new Date(a.dateFound).getTime()));
      setSpeciesList(speciesData.map((s: any) => s.name || ''));
      setCarersList(carersData.map((c: any) => c.name || ''));
      setAddDialogOpen(false);
    } catch (error) {
      console.error('Error adding animal via API:', error);
    }
  };

  const handleAnimalSubmit = async (submittedAnimal: Animal) => {
    const isEditing = animals.some(animal => animal.id === submittedAnimal.id);
    
    if (isEditing) {
      try {
        await fetch(`/api/animals/${submittedAnimal.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submittedAnimal),
        });
      } catch (error) {
        console.error('Error updating animal:', error);
      }
    } else {
      try {
        await fetch('/api/animals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submittedAnimal),
        });
      } catch (error) {
        console.error('Error creating animal:', error);
      }
    }
    
    // Refresh animals from data store
    const refreshData = async () => {
      try {
        const orgId = organization?.id;
        const [animalsData, speciesData, carersData] = await Promise.all([
          fetch(`/api/animals?orgId=${orgId}`).then(r => r.json()),
          fetch(`/api/species?orgId=${orgId}`).then(r => r.json()),
          fetch(`/api/carers?orgId=${orgId}`).then(r => r.json()),
        ]);
        
        setAnimals(animalsData.sort((a: Animal, b: Animal) => 
          new Date(b.dateFound).getTime() - new Date(a.dateFound).getTime()
        ));
        setSpeciesList(speciesData.map((s: any) => s.name || ''));
        setCarersList(carersData.map((c: any) => c.name || ''));
      } catch (error) {
        console.error('Error refreshing data:', error);
      }
    };
    await refreshData();
  };
  
  const filteredAnimals = animals.filter(animal => {
    const matchesSearch = animal.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          animal.species.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || animal.status === statusFilter;
    const matchesSpecies = speciesFilter === 'all' || animal.species === speciesFilter;
    return matchesSearch && matchesStatus && matchesSpecies;
  });

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="bg-card shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary rounded-full">
                  <PawPrint className="h-6 w-6 text-primary-foreground" />
                </div>
                <h1 className="text-3xl font-bold font-headline text-primary">
                  All Animal Records
                </h1>
              </div>
            </div>
            <Button onClick={handleOpenAddDialog}>
              <PlusCircle className="mr-2" />
              Add Animal
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Filters and Search */}
          <div className="bg-card p-6 rounded-lg shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input 
                  placeholder="Search animals..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="In Care">In Care</SelectItem>
                  <SelectItem value="Released">Released</SelectItem>
                  <SelectItem value="Deceased">Deceased</SelectItem>
                </SelectContent>
              </Select>
              <Select value={speciesFilter} onValueChange={setSpeciesFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by species" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Species</SelectItem>
                  {speciesList.map(species => (
                    <SelectItem key={species} value={species}>{species}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setViewMode('grid')}>
                  <LayoutGrid className={viewMode === 'grid' ? 'text-primary' : ''}/>
                </Button>
                <Button variant="outline" size="icon" onClick={() => setViewMode('table')}>
                  <List className={viewMode === 'table' ? 'text-primary' : ''}/>
                </Button>
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">
              Showing {filteredAnimals.length} of {animals.length} animals
            </p>
          </div>

          {/* Animal Records */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredAnimals.map(animal => (
                <AnimalCard key={animal.id} animal={animal} />
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-lg shadow-sm">
              <AnimalTable animals={filteredAnimals} onEdit={handleOpenEditDialog} />
            </div>
          )}

          {filteredAnimals.length === 0 && (
            <div className="text-center py-12">
              <PawPrint className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">No animals found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </main>

      <AddAnimalDialog 
        isOpen={isAddDialogOpen}
        setIsOpen={setAddDialogOpen}
        onAnimalAdd={handleAnimalAdd}
        animalToEdit={animalToEdit}
        species={speciesList}
        carers={carersList}
      />
    </div>
  );
} 