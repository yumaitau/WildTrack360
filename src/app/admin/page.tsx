"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PawPrint, User, Package, Users, ShieldCheck, Leaf } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Asset } from '@prisma/client';
import { SpeciesManagement } from './species-management';
import { CarerManagement } from './carer-management';
import { AssetManagement } from './asset-management';
import { UserManagement } from './user-management';
import { RoleManagement } from './role-management';
import { SpeciesGroupManagement } from './species-group-management';
import { useUser, useOrganization } from '@clerk/nextjs';

async function apiJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function AdminPage() {
  const [species, setSpecies] = useState<string[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const { user } = useUser();
  const { organization } = useOrganization();
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      try {
        const orgId = organization?.id || 'default-org';
        const [speciesData, assetsData, roleData] = await Promise.all([
          apiJson<any[]>(`/api/species?orgId=${orgId}`),
          apiJson<Asset[]>(`/api/assets?orgId=${orgId}`),
          apiJson<any>('/api/rbac/my-role'),
        ]);
        const role = roleData.role || 'CARER';
        if (role === 'CARER') {
          router.replace('/');
          return;
        }
        setSpecies(speciesData.map(s => s.name));
        setAssets(assetsData);
        setUserRole(role);
        setActiveTab(role === 'ADMIN' ? 'roles' : 'species');
      } catch (error) {
        console.error('Error loading admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [organization]);

  const isAdmin = userRole === 'ADMIN';

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card shadow-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary">Admin Panel</h1>
            <Button asChild variant="ghost">
              <Link href="/" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>
        </header>
        <main className="container mx-auto p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading admin data...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">Admin Panel</h1>
          <Link href="/" className="flex items-center gap-2">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <Tabs value={activeTab ?? (isAdmin ? "roles" : "species")} onValueChange={setActiveTab}>
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-6' : 'grid-cols-4'}`}>
            {isAdmin && (
              <TabsTrigger value="roles">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Roles
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="species-groups">
                <Leaf className="mr-2 h-4 w-4" />
                Species Groups
              </TabsTrigger>
            )}
            <TabsTrigger value="species">
              <PawPrint className="mr-2 h-4 w-4" />
              Manage Species
            </TabsTrigger>
            <TabsTrigger value="carers">
              <User className="mr-2 h-4 w-4" />
              Carer Profiles
            </TabsTrigger>
            <TabsTrigger value="assets">
              <Package className="mr-2 h-4 w-4" />
              Manage Assets
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="mr-2 h-4 w-4" />
              Manage Users
            </TabsTrigger>
          </TabsList>
          {isAdmin && (
            <TabsContent value="roles">
              <RoleManagement onCarerRoleAssigned={() => setActiveTab('carers')} />
            </TabsContent>
          )}
          {isAdmin && (
            <TabsContent value="species-groups">
              <SpeciesGroupManagement />
            </TabsContent>
          )}
          <TabsContent value="species">
            <Card>
              <CardHeader>
                <CardTitle>Species List</CardTitle>
              </CardHeader>
              <CardContent>
                <SpeciesManagement initialSpecies={species} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="carers">
            <Card>
              <CardHeader>
                <CardTitle>Carer Profiles</CardTitle>
              </CardHeader>
              <CardContent>
                <CarerManagement />
              </CardContent>
            </Card>
          </TabsContent>
           <TabsContent value="assets">
            <Card>
              <CardHeader>
                <CardTitle>Asset List</CardTitle>
              </CardHeader>
              <CardContent>
                <AssetManagement initialAssets={assets} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
