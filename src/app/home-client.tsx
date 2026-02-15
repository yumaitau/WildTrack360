// src/app/home-client.tsx
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PawPrint, PlusCircle, Settings, List, LayoutGrid, Shield, ShieldCheck, ShieldAlert, User, RefreshCw, LogOut, Building, AlertTriangle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Animal } from '@prisma/client';

// Local type for create-animal payload
type CreateAnimalData = {
  name: string;
  species: string;
  status: 'ADMITTED' | 'IN_CARE' | 'READY_FOR_RELEASE' | 'RELEASED' | 'DECEASED' | 'TRANSFERRED';
  dateFound: Date;
  dateReleased: Date | null;
  outcomeDate: Date | null;
  outcome: string | null;
  photo: string | null;
  notes: string | null;
  rescueLocation: string | null;
  rescueCoordinates: { lat: number; lng: number } | null;
  carerId: string | null;
};
import { AnimalTable } from '@/components/animal-table';
import { useState, useEffect, useMemo } from 'react';
import { AddAnimalDialog } from '@/components/add-animal-dialog';
import DashboardStats from '@/components/dashboard-stats';
import SpeciesDistributionChart from '@/components/species-distribution-chart';
import RecentAdmissionsChart from '@/components/recent-admissions-chart';
import CarerWorkloadDashboard from '@/components/carer-workload-dashboard';
import ReleasesVsAdmissionsChart from '@/components/releases-vs-admissions-chart';
import { TrainingExpiryAlerts } from '@/components/training-expiry-alerts';
import { AdminComplianceChecklist } from '@/components/admin-compliance-checklist';
import { useUser, useOrganization, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getCurrentJurisdiction } from '@/lib/config';

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

interface HomeClientProps {
  initialAnimals: Animal[];
  species: any[];
  carers: any[];
}

function CarerView({
  animals,
  viewMode,
  setViewMode,
  isLoading,
  onRefresh,
  onEdit,
  carersList,
}: {
  animals: Animal[];
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  isLoading: boolean;
  onRefresh: () => void;
  onEdit: (animal: Animal) => void;
  carersList: any[];
}) {
  const recentlyAdmitted = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return animals.filter(a => new Date(a.dateFound) >= sevenDaysAgo);
  }, [animals]);

  return (
    <>
      {/* Carer Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Animals in My Care</CardTitle>
            <PawPrint className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{animals.length}</div>
            <p className="text-xs text-muted-foreground">Currently assigned to you</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recently Admitted</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentlyAdmitted.length}</div>
            <p className="text-xs text-muted-foreground">Added in the last 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* View Controls */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">My Caseload</h2>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Animal List/Grid */}
      {animals.length === 0 ? (
        <Card className="p-8 text-center">
          <PawPrint className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No animals currently assigned to you</p>
          <p className="text-sm text-muted-foreground mt-1">Animals will appear here once they are assigned to your care.</p>
        </Card>
      ) : (
        <div className="bg-card rounded-lg shadow-md p-6 mb-8">
          {viewMode === 'list' ? (
            <AnimalTable
              animals={animals}
              onEdit={onEdit}
              carerMap={Object.fromEntries((carersList || []).map((c: any) => [c.id, c.name]))}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {animals.map((animal) => (
                <div key={animal.id} className="bg-background rounded-lg p-4 border">
                  <h3 className="font-semibold text-lg">{animal.name}</h3>
                  <p className="text-sm text-muted-foreground">{animal.species}</p>
                  <p className="text-sm text-muted-foreground">
                    Status: {animal.status}
                  </p>
                  <div className="mt-3">
                    <Button size="sm" variant="outline" onClick={() => onEdit(animal)}>
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick link */}
      <div className="text-center">
        <Link href="/animals">
          <Button variant="outline">View All My Animals</Button>
        </Link>
      </div>
    </>
  );
}

function AdminCoordinatorView({
  animals,
  userRole,
  viewMode,
  setViewMode,
  isLoading,
  onRefresh,
  onEdit,
  onAddNew,
  carersList,
  organization,
  jurisdiction,
}: {
  animals: Animal[];
  userRole: string;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  isLoading: boolean;
  onRefresh: () => void;
  onEdit: (animal: Animal) => void;
  onAddNew: () => void;
  carersList: any[];
  organization: any;
  jurisdiction: string;
}) {
  return (
    <>
      {/* Admin Compliance Checklist */}
      {userRole === 'ADMIN' && (
        <AdminComplianceChecklist
          carers={carersList}
          organization={organization}
          jurisdiction={jurisdiction}
        />
      )}

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex-1">
          <Button
            onClick={onAddNew}
            className="w-full sm:w-auto"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add New Animal
          </Button>
        </div>
        <div>
          <Link href="/animals">
            <Button variant="outline" className="w-full sm:w-auto">Manage Animals</Button>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 gap-6 mb-8">
        <DashboardStats animals={animals} />
      </div>

      {/* Training Alerts */}
      <div className="mb-8">
        <TrainingExpiryAlerts />
      </div>

      {/* Animals Table/Grid */}
      <div className="bg-card rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Animals</h2>
          <div className="flex items-center gap-2">
            <Link href="/animals">
              <Button size="sm" variant="secondary">Manage Animals</Button>
            </Link>
          </div>
        </div>

        {viewMode === 'list' ? (
          <AnimalTable
            animals={animals}
            onEdit={onEdit}
            carerMap={Object.fromEntries((carersList || []).map((c: any) => [c.id, c.name]))}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {animals.map((animal) => (
              <div key={animal.id} className="bg-background rounded-lg p-4 border">
                <h3 className="font-semibold text-lg">{animal.name}</h3>
                <p className="text-sm text-muted-foreground">{animal.species}</p>
                <p className="text-sm text-muted-foreground">
                  Status: {animal.status}
                </p>
                <div className="mt-3">
                  <Button size="sm" variant="outline" onClick={() => onEdit(animal)}>
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Animals Without Carers Alert */}
      {animals.filter(a => !a.carerId).length > 0 && (
        <Card className="border-orange-200 bg-orange-50 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Animals Without Assigned Carers
            </CardTitle>
            <CardDescription>
              These animals need a carer assigned for proper care and compliance tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {animals.filter(a => !a.carerId).slice(0, 6).map((animal) => (
                <div key={animal.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex-1">
                    <div className="font-medium">{animal.name}</div>
                    <div className="text-sm text-muted-foreground">{animal.species}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Status: {animal.status.replace(/_/g, ' ')}
                    </div>
                  </div>
                  <Link href={`/animals/${animal.id}`}>
                    <Button variant="outline" size="sm">
                      Assign Carer
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
            {animals.filter(a => !a.carerId).length > 6 && (
              <div className="mt-4 text-center">
                <Link href="/animals">
                  <Button variant="outline">
                    View All {animals.filter(a => !a.carerId).length} Animals Without Carers
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Incomplete Carer Profiles Alert (ADMIN only - only admins can action this) */}
      {userRole === 'ADMIN' && (carersList || []).filter((c: any) => !c.hasProfile).length > 0 && (
        <Card className="border-orange-200 bg-orange-50 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Carers With Incomplete Profiles
            </CardTitle>
            <CardDescription>
              These organisation members need their carer profile completed before animals can be assigned to them
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(carersList || []).filter((c: any) => !c.hasProfile).slice(0, 6).map((carer: any) => (
                <div key={carer.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex-1">
                    <div className="font-medium">{carer.name}</div>
                    <div className="text-sm text-muted-foreground">{carer.email}</div>
                  </div>
                  <Link href="/admin">
                    <Button variant="outline" size="sm">
                      Complete Profile
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
            {(carersList || []).filter((c: any) => !c.hasProfile).length > 6 && (
              <div className="mt-4 text-center">
                <Link href="/admin">
                  <Button variant="outline">
                    View All {(carersList || []).filter((c: any) => !c.hasProfile).length} Incomplete Profiles
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Compliance Section */}
      <div className="bg-card rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Compliance</h2>
          <Link href="/compliance">
            <Button size="sm" variant="secondary">Open Compliance</Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          View compliance overview, registers, hygiene logs, incident reports, and release checklists. Generate reports for your organization.
        </p>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-8 mb-8">
        <SpeciesDistributionChart animals={animals} />
        <RecentAdmissionsChart animals={animals} />
      </div>

      <div className="grid grid-cols-1 gap-8 mb-8">
        <CarerWorkloadDashboard animals={animals} carerMap={Object.fromEntries((carersList || []).map((c: any) => [c.id, c.name]))} />
      </div>

      <div className="grid grid-cols-1 gap-8 mb-8">
        <ReleasesVsAdmissionsChart animals={animals} />
      </div>
    </>
  );
}

export default function HomeClient({ initialAnimals, species, carers }: HomeClientProps) {
  const { user, isLoaded: userLoaded } = useUser();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { signOut } = useClerk();
  const { toast } = useToast();
  const router = useRouter();
  
  const [animals, setAnimals] = useState<Animal[]>(initialAnimals);
  const [speciesList, setSpeciesList] = useState(species || []);
  const [carersList, setCarersList] = useState(carers || []);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [animalToEdit, setAnimalToEdit] = useState<Animal | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [orgJurisdiction, setOrgJurisdiction] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('CARER');
  const [hasIncompleteProfile, setHasIncompleteProfile] = useState(false);

  // Load species, carers, and user role from API for current organization
  useEffect(() => {
    const fetchLookups = async () => {
      if (!organization) return;
      try {
        const orgId = organization.id;
        const [newSpecies, newCarers, roleData] = await Promise.all([
          apiJson<any[]>(`/api/species?orgId=${orgId}`),
          apiJson<any[]>(`/api/carers?orgId=${orgId}`),
          apiJson<any>('/api/rbac/my-role'),
        ]);
        setSpeciesList(newSpecies || []);
        setCarersList(newCarers || []);
        const role = roleData.role || 'CARER';
        setUserRole(role);

        // Check if current user has an incomplete profile (CARER/COORDINATOR only)
        if (role !== 'ADMIN' && user) {
          const currentCarer = (newCarers || []).find((c: any) => c.id === user.id);
          setHasIncompleteProfile(currentCarer?.hasProfile === false);
        }
      } catch (error) {
        console.error('Error loading species/carers:', error);
        setSpeciesList([]);
        setCarersList([]);
      }
    };
    fetchLookups();
  }, [organization, user]);

  // Load animals from API for current organization
  useEffect(() => {
    const fetchAnimals = async () => {
      if (!organization) return;
      try {
        const orgId = organization.id;
        const newAnimals = await apiJson<Animal[]>(`/api/animals?orgId=${orgId}`);
        setAnimals(newAnimals);
      } catch (error) {
        console.error('Error loading animals:', error);
      }
    };
    fetchAnimals();
  }, [organization]);

  useEffect(() => {
    const hourSydney = Number(
      new Date().toLocaleString('en-AU', {
        hour: '2-digit',
        hour12: false,
        timeZone: 'Australia/Sydney',
      })
    );
    const msg = hourSydney < 12 ? 'Good morning' : hourSydney < 18 ? 'Good afternoon' : 'Good evening';
    setGreeting(msg);
  }, []);

  useEffect(() => {
    // Resolve jurisdiction from Clerk org/user public metadata or env fallback
    try {
      const j = getCurrentJurisdiction();
      setOrgJurisdiction(j);
    } catch {
      setOrgJurisdiction('ACT');
    }
  }, []);

  const handleAddAnimal = async (animalData: CreateAnimalData) => {
    if (!user || !organization) return;

    try {
      const created = await apiJson<Animal>(`/api/animals`, {
        method: 'POST',
        body: JSON.stringify({
          ...animalData,
          clerkOrganizationId: organization.id,
        }),
      });
      setAnimals(prev => [created, ...prev]);
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Error adding animal:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to add animal',
        description: error instanceof Error ? error.message : 'Please try again.'
      });
    }
  };

  const handleEditAnimal = async (animal: Animal) => {
    router.push(`/animals/${animal.id}`);
  };

  const handleRefresh = async () => {
    if (!user || !organization) return;
    
    setIsLoading(true);
    try {
      const orgId = organization.id;
      const [newAnimals, newSpecies, newCarers] = await Promise.all([
        apiJson<Animal[]>(`/api/animals?orgId=${orgId}`),
        apiJson<any[]>(`/api/species?orgId=${orgId}`),
        apiJson<any[]>(`/api/carers?orgId=${orgId}`),
      ]);
      setAnimals(newAnimals);
      setSpeciesList(newSpecies);
      setCarersList(newCarers);

      // Re-check incomplete profile on refresh
      if (userRole !== 'ADMIN' && user) {
        const currentCarer = (newCarers || []).find((c: any) => c.id === user.id);
        setHasIncompleteProfile(currentCarer?.hasProfile === false);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut({ redirectUrl: '/logout-success' });
  };

  if (!userLoaded || !orgLoaded) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Please sign in</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="bg-card shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center gap-3">
              <PawPrint className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold font-headline text-primary">
                WildTrack360
              </h1>
            </Link>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium">
                    Welcome, {user.firstName} {user.lastName}
                  </p>
                  <div className="flex items-center gap-2">
                    {organization?.name && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        {organization.name}
                      </span>
                    )}
                    <Badge variant={userRole === 'ADMIN' ? 'default' : userRole === 'COORDINATOR' ? 'secondary' : 'outline'} className="text-xs">
                      {userRole === 'ADMIN' && <ShieldAlert className="h-3 w-3 mr-1" />}
                      {userRole === 'COORDINATOR' && <ShieldCheck className="h-3 w-3 mr-1" />}
                      {userRole === 'CARER' && <Shield className="h-3 w-3 mr-1" />}
                      {userRole}
                    </Badge>
                  </div>
                </div>
              </div>
              {userRole !== 'CARER' && (
                <Link href="/admin">
                  <Button size="sm">
                    {userRole === 'ADMIN' ? 'Admin' : 'Coordinator'}
                  </Button>
                </Link>
              )}
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Brandmark Logo Section */}
      <div className="flex justify-center py-4">
        <div className="relative h-40 w-96">
          <Image
            src="/Brandmark-Text-Vert.svg"
            alt="WildTrack360 Logo"
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* User + Organization Summary under Brandmark */}
      <div className="flex flex-col items-center gap-2 mb-2 px-4 text-center">
        <p className="text-lg font-medium">
          {greeting}{user?.firstName ? `, ${user.firstName} ${user.lastName || ''}` : ''}
        </p>
        {organization?.name && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{organization.name}</span>
            {orgJurisdiction && (
              <span className="text-xs border rounded px-2 py-0.5 bg-muted text-muted-foreground">Jurisdiction: {orgJurisdiction}</span>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Incomplete Profile Banner */}
        {hasIncompleteProfile && (
          <div className="flex items-center gap-3 p-4 mb-6 rounded-lg border border-amber-300 bg-amber-50 text-amber-800">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">
              Your carer profile is incomplete. Please contact your organisation administrator to complete your profile before animals can be assigned to you.
            </p>
          </div>
        )}

        {userRole === 'CARER' ? (
          <CarerView
            animals={animals}
            viewMode={viewMode}
            setViewMode={setViewMode}
            isLoading={isLoading}
            onRefresh={handleRefresh}
            onEdit={handleEditAnimal}
            carersList={carersList}
          />
        ) : (
          <AdminCoordinatorView
            animals={animals}
            userRole={userRole}
            viewMode={viewMode}
            setViewMode={setViewMode}
            isLoading={isLoading}
            onRefresh={handleRefresh}
            onEdit={handleEditAnimal}
            onAddNew={() => setIsAddDialogOpen(true)}
            carersList={carersList}
            organization={organization}
            jurisdiction={orgJurisdiction}
          />
        )}
      </main>

      {/* Add Animal Dialog */}
      <AddAnimalDialog
        isOpen={isAddDialogOpen}
        setIsOpen={setIsAddDialogOpen}
        onAnimalAdd={handleAddAnimal}
        animalToEdit={animalToEdit}
        species={(speciesList || []).map((s: any) => ({ 
          value: s.name, 
          label: s.name 
        }))}
        carers={(carersList || []).filter((c: any) => c.hasProfile).map((c: any) => ({
          value: c.id,
          label: c.name
        }))}
      />

      {/* Footer */}
      <footer className="bg-card mt-16 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; {new Date().getFullYear()} WildTrack360. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
