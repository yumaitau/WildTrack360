"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PawPrint, Package, Users, Leaf, ScrollText, FileSpreadsheet, ChevronDown, LayoutDashboard, ShieldCheck, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Asset } from '@prisma/client';
import { SpeciesManagement } from './species-management';
import { AssetManagement } from './asset-management';
import { PeopleManagement } from './people-management';
import { SpeciesGroupManagement } from './species-group-management';
import { AuditLogViewer } from './audit-log-viewer';
import { DataExport } from './data-export';
import { useUser, useOrganization } from '@clerk/nextjs';

async function apiJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

interface QuickAction {
  label: string;
  description: string;
  icon: React.ReactNode;
  tab: string;
  adminOnly: boolean;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Manage People',
    description: 'View and manage organisation members, assign roles to carers and coordinators.',
    icon: <Users className="h-6 w-6" />,
    tab: 'people',
    adminOnly: true,
  },
  {
    label: 'Species Groups',
    description: 'Create species groups and assign coordinators to manage them. View the assignment overview.',
    icon: <Leaf className="h-6 w-6" />,
    tab: 'species-groups',
    adminOnly: true,
  },
  {
    label: 'Manage Species',
    description: 'Add, edit, or remove species from your organisation\'s species list.',
    icon: <PawPrint className="h-6 w-6" />,
    tab: 'species',
    adminOnly: true,
  },
  {
    label: 'Assets',
    description: 'Track and manage equipment, supplies, and other assets used in wildlife care.',
    icon: <Package className="h-6 w-6" />,
    tab: 'assets',
    adminOnly: false,
  },
  {
    label: 'Audit Log',
    description: 'View an immutable record of all actions taken within the organisation.',
    icon: <ScrollText className="h-6 w-6" />,
    tab: 'audit-log',
    adminOnly: true,
  },
  {
    label: 'Data Export',
    description: 'Export organisation data for reporting, compliance, or backup purposes.',
    icon: <FileSpreadsheet className="h-6 w-6" />,
    tab: 'data-export',
    adminOnly: true,
  },
];

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
        if (role === 'CARER' || role === 'CARER_ALL') {
          router.replace('/');
          return;
        }
        setSpecies(speciesData.map(s => s.name));
        setAssets(assetsData);
        setUserRole(role);
      } catch (error) {
        console.error('Error loading admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id]);

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

  const visibleActions = QUICK_ACTIONS.filter((a) => !a.adminOnly || isAdmin);

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
        <Tabs value={activeTab ?? 'home'} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap w-full gap-1 h-auto p-1">
            <TabsTrigger value="home">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Home
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="people">
                <Users className="mr-2 h-4 w-4" />
                People
              </TabsTrigger>
            )}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      activeTab === 'species-groups' || activeTab === 'species'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground'
                    }`}
                  >
                    <PawPrint className="mr-2 h-4 w-4" />
                    Species
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[var(--radix-dropdown-menu-trigger-width)]">
                  <DropdownMenuItem onClick={() => setActiveTab('species-groups')}>
                    <Leaf className="mr-2 h-4 w-4" />
                    Species Groups
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab('species')}>
                    <PawPrint className="mr-2 h-4 w-4" />
                    Manage Species
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <TabsTrigger value="assets">
              <Package className="mr-2 h-4 w-4" />
              Assets
            </TabsTrigger>
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      activeTab === 'audit-log' || activeTab === 'data-export'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground'
                    }`}
                  >
                    <ScrollText className="mr-2 h-4 w-4" />
                    Admin Options
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[var(--radix-dropdown-menu-trigger-width)]">
                  <DropdownMenuItem onClick={() => setActiveTab('audit-log')}>
                    <ScrollText className="mr-2 h-4 w-4" />
                    Audit Log
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab('data-export')}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Data Export
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </TabsList>

          {/* Home / Landing Tab */}
          <TabsContent value="home">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">
                  Welcome{user?.firstName ? `, ${user.firstName}` : ''}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {organization?.name ? `Managing ${organization.name}. ` : ''}
                  Choose a quick action below or use the tabs above to navigate.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleActions.map((action) => (
                  <button
                    key={action.tab}
                    onClick={() => setActiveTab(action.tab)}
                    className="text-left group"
                  >
                    <Card className="h-full transition-colors hover:border-primary/50 hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2 rounded-lg">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="rounded-lg bg-primary/10 text-primary p-2.5">
                            {action.icon}
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                        </div>
                        <CardTitle className="text-base mt-3">{action.label}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-sm leading-relaxed">
                          {action.description}
                        </CardDescription>
                      </CardContent>
                    </Card>
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="people">
              <PeopleManagement />
            </TabsContent>
          )}
          {isAdmin && (
            <TabsContent value="species-groups">
              <SpeciesGroupManagement />
            </TabsContent>
          )}
          {isAdmin && (
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
          )}
          {isAdmin && (
            <TabsContent value="audit-log">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ScrollText className="h-5 w-5" />
                    Audit Log
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Immutable record of all actions taken within this organisation. All timestamps are displayed in Australian Eastern Time (AEST/AEDT). Audit entries are logged automatically for every create, update, and delete operation and must not be modified or deleted.
                  </p>
                </CardHeader>
                <CardContent>
                  <AuditLogViewer />
                </CardContent>
              </Card>
            </TabsContent>
          )}
          {isAdmin && (
            <TabsContent value="data-export">
              <DataExport />
            </TabsContent>
          )}
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
