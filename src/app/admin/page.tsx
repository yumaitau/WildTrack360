"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PawPrint, User, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Asset } from '@prisma/client';
import { SpeciesManagement } from './species-management';
import { CarerManagement } from './carer-management';
import { AssetManagement } from './asset-management';
import { useUser, useOrganization } from '@clerk/nextjs';

async function apiJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function AdminPage() {
  const [species, setSpecies] = useState<string[]>([]);
  const [carers, setCarers] = useState<string[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();
  const { organization } = useOrganization();
  useEffect(() => {
    const loadData = async () => {
      try {
        const orgId = organization?.id || 'default-org';
        const [speciesData, carersData, assetsData] = await Promise.all([
          apiJson<any[]>(`/api/species?orgId=${orgId}`),
          apiJson<any[]>(`/api/carers?orgId=${orgId}`),
          apiJson<Asset[]>(`/api/assets?orgId=${orgId}`)
        ]);
        setSpecies(speciesData.map(s => s.name));
        setCarers(carersData.map(c => c.name));
        setAssets(assetsData);
      } catch (error) {
        console.error('Error loading admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [organization]);

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
        <Tabs defaultValue="species">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="species">
              <PawPrint className="mr-2 h-4 w-4" />
              Manage Species
            </TabsTrigger>
            <TabsTrigger value="carers">
              <User className="mr-2 h-4 w-4" />
              Manage Carers
            </TabsTrigger>
            <TabsTrigger value="assets">
              <Package className="mr-2 h-4 w-4" />
              Manage Assets
            </TabsTrigger>
          </TabsList>
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
                <CardTitle>Carer List</CardTitle>
              </CardHeader>
              <CardContent>
                <CarerManagement initialCarers={carers} />
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
        </Tabs>
      </main>
    </div>
  );
}
