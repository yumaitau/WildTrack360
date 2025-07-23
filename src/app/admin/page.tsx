import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PawPrint, User, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSpecies, getCarers, getAssets } from '@/lib/data-store';
import { SpeciesManagement } from './species-management';
import { CarerManagement } from './carer-management';
import { AssetManagement } from './asset-management';


export default async function AdminPage() {
  const species = await getSpecies();
  const carers = await getCarers();
  const assets = await getAssets();

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
