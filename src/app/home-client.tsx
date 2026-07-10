// src/app/home-client.tsx
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PawPrint,
  PlusCircle,
  List,
  LayoutGrid,
  RefreshCw,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { Animal } from '@prisma/client';

// Local type for create-animal payload
type CreateAnimalData = {
  name: string;
  species: string;
  status:
    | 'ADMITTED'
    | 'IN_CARE'
    | 'READY_FOR_RELEASE'
    | 'RELEASED'
    | 'DECEASED'
    | 'TRANSFERRED'
    | 'PERMANENT_CARE';
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
import { useState, useEffect, useMemo, useCallback } from 'react';
import { AddAnimalDialog } from '@/components/add-animal-dialog';
import DashboardStats from '@/components/dashboard-stats';
import SpeciesDistributionChart from '@/components/species-distribution-chart';
import RecentAdmissionsChart from '@/components/recent-admissions-chart';
import CarerWorkloadDashboard from '@/components/carer-workload-dashboard';
import ReleasesVsAdmissionsChart from '@/components/releases-vs-admissions-chart';
import { QueryResultChart } from '@/components/custom-query/query-result-chart';
import { TrainingExpiryAlerts } from '@/components/training-expiry-alerts';
import { AdminComplianceChecklist } from '@/components/admin-compliance-checklist';
import { CallLogDashboard } from '@/components/call-log-dashboard';
import { FeedRosterSummaryCarer } from '@/components/feed-roster-summary-carer';
import { FeedRosterSummaryOrg } from '@/components/feed-roster-summary-org';
import { NSWReportingReminderBanner } from '@/components/nsw-reporting-reminder-banner';
import DraggableSections, { type DashboardSection } from '@/components/draggable-sections';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TREND_WINDOW_STORAGE_KEY,
  DEFAULT_TREND_WINDOW,
  validateTrendWindow,
  type TrendWindow,
} from '@/lib/dashboard-layout';
import type { FeedRosterItem } from '@/lib/feed-roster';
import type { NSWReminderBannerData } from '@/lib/nsw-reminder-types';
import type { CustomQueryResult } from '@/lib/custom-query/types';
import { useUser, useOrganization } from '@/lib/clerk-client';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getJurisdictionFromOrg } from '@/lib/config';
import { getCarerDisplayLabel } from '@/lib/carer-display';

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

interface DashboardReportWidget {
  id: string;
  name: string;
  visualization: string;
  result: CustomQueryResult;
}

interface HomeClientProps {
  initialAnimals: Animal[];
  species: any[];
  carers: any[];
  initialFeedRosterItems: FeedRosterItem[];
  nswReminderBanner: NSWReminderBannerData | null;
}

function CarerView({
  animals,
  viewMode,
  setViewMode,
  isLoading,
  onRefresh,
  onEdit,
  carersList,
  userRole,
  feedRosterItems,
}: {
  animals: Animal[];
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  isLoading: boolean;
  onRefresh: () => void;
  onEdit: (animal: Animal) => void;
  carersList: any[];
  userRole: string;
  feedRosterItems: FeedRosterItem[];
}) {
  const isOrgWide = userRole === 'CARER_ALL';
  const recentlyAdmitted = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return animals.filter((a) => new Date(a.dateFound) >= sevenDaysAgo);
  }, [animals]);

  return (
    <>
      {/* Feed Roster Summary */}
      <FeedRosterSummaryCarer items={feedRosterItems} isOrgWide={isOrgWide} />

      {/* Carer Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {isOrgWide ? 'All Animals' : 'Animals in My Care'}
            </CardTitle>
            <PawPrint className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{animals.length}</div>
            <p className="text-xs text-muted-foreground">
              {isOrgWide ? 'Organisation-wide caseload' : 'Currently assigned to you'}
            </p>
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
        <h2 className="text-2xl font-bold">{isOrgWide ? 'All Animals' : 'My Caseload'}</h2>
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
            aria-label="Refresh dashboard"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Animal List/Grid */}
      {animals.length === 0 ? (
        <Card className="p-8 text-center">
          <PawPrint className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">
            {isOrgWide
              ? 'No animals in the organisation yet'
              : 'No animals currently assigned to you'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {isOrgWide
              ? 'Animals will appear here once they are added to the organisation.'
              : 'Animals will appear here once they are assigned to your care.'}
          </p>
        </Card>
      ) : (
        <div className="bg-card rounded-lg shadow-md p-4 sm:p-6 mb-8">
          {viewMode === 'list' ? (
            <AnimalTable
              animals={animals}
              onEdit={onEdit}
              carerMap={Object.fromEntries(
                (carersList || []).map((c: any) => [c.id, getCarerDisplayLabel(c)])
              )}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {animals.map((animal) => (
                <div key={animal.id} className="bg-background rounded-lg p-4 border">
                  <h3 className="font-semibold text-lg">{animal.name}</h3>
                  {animal.orgAnimalId && (
                    <p className="text-xs font-mono text-muted-foreground">{animal.orgAnimalId}</p>
                  )}
                  <p className="text-sm text-muted-foreground">{animal.species}</p>
                  <p className="text-sm text-muted-foreground">Status: {animal.status}</p>
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
          <Button variant="outline">
            {isOrgWide ? 'View All Animals' : 'View All My Animals'}
          </Button>
        </Link>
      </div>
    </>
  );
}

function AdminCoordinatorView({
  animals,
  userRole,
  isLoading,
  onRefresh,
  onEdit,
  onAddNew,
  carersList,
  organization,
  jurisdiction,
  feedRosterItems,
  dashboardRefreshCycle,
}: {
  animals: Animal[];
  userRole: string;
  isLoading: boolean;
  onRefresh: () => void;
  onEdit: (animal: Animal) => void;
  onAddNew: () => void;
  carersList: any[];
  organization: any;
  jurisdiction: string;
  feedRosterItems: FeedRosterItem[];
  dashboardRefreshCycle: number;
}) {
  // Default trend timeframe for trend widgets. Persisted to the browser only.
  const [trendWindow, setTrendWindow] = useState<TrendWindow>(DEFAULT_TREND_WINDOW);
  useEffect(() => {
    try {
      setTrendWindow(validateTrendWindow(localStorage.getItem(TREND_WINDOW_STORAGE_KEY)));
    } catch {
      /* localStorage unavailable */
    }
  }, []);
  const handleTrendWindowChange = useCallback((weeks: TrendWindow) => {
    setTrendWindow(weeks);
    try {
      localStorage.setItem(TREND_WINDOW_STORAGE_KEY, String(weeks));
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  const carerMap = useMemo(
    () =>
      Object.fromEntries(
        (carersList || []).map((c: any) => [c.id, getCarerDisplayLabel(c)])
      ),
    [carersList]
  );
  const [customReportWidgets, setCustomReportWidgets] = useState<DashboardReportWidget[] | null>(
    null
  );

  useEffect(() => {
    let active = true;
    setCustomReportWidgets(null);

    fetch('/api/report-queries/dashboard')
      .then((response) => (response.ok ? response.json() : { widgets: [] }))
      .then((data: { widgets?: DashboardReportWidget[] }) => {
        if (active) setCustomReportWidgets(data.widgets ?? []);
      })
      .catch(() => {
        if (active) setCustomReportWidgets([]);
      });

    return () => {
      active = false;
    };
  }, [organization?.id, dashboardRefreshCycle]);

  const customReportSections: DashboardSection[] = useMemo(() => {
    if (customReportWidgets === null) {
      return [
        {
          id: 'custom-reports-loading',
          title: 'Custom Reports',
          resizable: true,
          node: (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Custom reports</CardTitle>
                <CardDescription>Loading pinned reporting widgets.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          ),
        },
      ];
    }

    return customReportWidgets.map((widget) => ({
      id: `custom-report-${widget.id}`,
      title: `Custom Report: ${widget.name}`,
      resizable: true,
      node: (
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">{widget.name}</CardTitle>
                <CardDescription>Saved custom report</CardDescription>
              </div>
              <Link href="/tools/reporting" className="text-sm text-primary hover:underline">
                Manage
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <QueryResultChart result={widget.result} height={220} />
          </CardContent>
        </Card>
      ),
    }));
  }, [customReportWidgets]);

  // Operational dashboard widgets. Each is draggable, hideable, and (where it
  // makes sense) resizable to half width. Order/visibility/size persist to
  // localStorage via DraggableSections.
  const dashboardSections: DashboardSection[] = useMemo(
    () => [
      { id: 'call-log', title: 'Call Log', node: <CallLogDashboard /> },
      {
        id: 'feed-roster',
        title: 'Feed Roster',
        node: <FeedRosterSummaryOrg items={feedRosterItems} />,
      },
      { id: 'stats', title: 'Key Stats', node: <DashboardStats animals={animals} /> },
      { id: 'training-alerts', title: 'Training Alerts', node: <TrainingExpiryAlerts /> },
      {
        id: 'species-distribution',
        title: 'Species Distribution',
        node: <SpeciesDistributionChart animals={animals} />,
        resizable: true,
      },
      {
        id: 'recent-admissions',
        title: 'Recent Admissions',
        node: <RecentAdmissionsChart animals={animals} weeks={trendWindow} />,
        resizable: true,
      },
      {
        id: 'carer-workload',
        title: 'Carer Workload',
        node: <CarerWorkloadDashboard animals={animals} carerMap={carerMap} />,
      },
      {
        id: 'releases-vs-admissions',
        title: 'Releases vs Admissions',
        node: <ReleasesVsAdmissionsChart animals={animals} />,
      },
      {
        id: 'animals',
        title: 'Animals',
        node: (
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Animals</CardTitle>
                  <CardDescription>
                    Search, filter, sort and page through the animals visible to your role.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" onClick={onAddNew}>
                    <PlusCircle className="mr-1 h-4 w-4" />
                    Add Animal
                  </Button>
                  <Button asChild size="sm" variant="secondary">
                    <Link href="/animals">Manage Animals</Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <AnimalTable animals={animals} onEdit={onEdit} carerMap={carerMap} />
            </CardContent>
          </Card>
        ),
      },
      ...customReportSections,
    ],
    [animals, carerMap, customReportSections, feedRosterItems, onAddNew, onEdit, trendWindow]
  );

  return (
    <>
      {/* Admin Compliance Checklist */}
      {userRole === 'ADMIN' && (
        <AdminComplianceChecklist
          carers={carersList}
          animals={animals}
          organization={organization}
          jurisdiction={jurisdiction}
        />
      )}

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex-1">
          <Button onClick={onAddNew} className="w-full sm:w-auto">
            <PlusCircle className="h-4 w-4 mr-2" />
            Add New Animal
          </Button>
        </div>
        <div>
          <Link href="/animals">
            <Button variant="outline" className="w-full sm:w-auto">
              Manage Animals
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            aria-label="Refresh dashboard"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Draggable dashboard widgets */}
      <DraggableSections
        sections={dashboardSections}
        showTrendWindow
        trendWindow={trendWindow}
        onTrendWindowChange={handleTrendWindowChange}
      />

      {/* Animals Without Carers Alert */}
      {animals.filter((a) => !a.carerId).length > 0 && (
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
              {animals
                .filter((a) => !a.carerId)
                .slice(0, 6)
                .map((animal) => (
                  <div
                    key={animal.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border"
                  >
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
            {animals.filter((a) => !a.carerId).length > 6 && (
              <div className="mt-4 text-center">
                <Link href="/animals">
                  <Button variant="outline">
                    View All {animals.filter((a) => !a.carerId).length} Animals Without Carers
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
              These organisation members need their carer profile completed before animals can be
              assigned to them
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(carersList || [])
                .filter((c: any) => !c.hasProfile)
                .slice(0, 6)
                .map((carer: any) => (
                  <div
                    key={carer.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border"
                  >
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
                    View All {(carersList || []).filter((c: any) => !c.hasProfile).length}{' '}
                    Incomplete Profiles
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Animals Without Animal IDs Banner */}
      {userRole === 'ADMIN' && animals.filter((a) => !a.orgAnimalId).length > 0 && (
        <Card className="border-blue-200 bg-blue-50 mb-8">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-800">
                  {animals.filter((a) => !a.orgAnimalId).length} animal
                  {animals.filter((a) => !a.orgAnimalId).length !== 1 ? 's' : ''} missing an Animal
                  ID
                </p>
                <p className="text-sm text-blue-600">
                  Edit each animal to assign an ID, or configure auto-generation in Admin &gt;
                  Organisation Settings.
                </p>
              </div>
            </div>
            <Link href="/animals">
              <Button variant="outline" size="sm">
                Manage Animals
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Compliance Section */}
      <div className="bg-card rounded-lg shadow-md p-4 sm:p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-xl sm:text-2xl font-bold">Compliance</h2>
          <Link href="/compliance">
            <Button size="sm" variant="secondary">
              Open Compliance
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          {jurisdiction === 'NATIONAL'
            ? 'Manage release checklists for your animals. State-specific compliance features are available when a jurisdiction is configured.'
            : 'View compliance overview, registers, hygiene logs, incident reports, and release checklists. Generate reports for your organization.'}
        </p>
      </div>
    </>
  );
}

export default function HomeClient({
  initialAnimals,
  species,
  carers,
  initialFeedRosterItems,
  nswReminderBanner,
}: HomeClientProps) {
  const { user, isLoaded: userLoaded } = useUser();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { toast } = useToast();
  const router = useRouter();

  const [animals, setAnimals] = useState<Animal[]>(initialAnimals);
  const [speciesList, setSpeciesList] = useState(species || []);
  const [carersList, setCarersList] = useState(carers || []);
  const [feedRosterItems, setFeedRosterItems] = useState<FeedRosterItem[]>(
    initialFeedRosterItems || []
  );
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [animalToEdit, setAnimalToEdit] = useState<Animal | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(false);
  const [greeting, setGreeting] = useState('');
  const orgJurisdiction = useMemo(() => getJurisdictionFromOrg(organization), [organization]);
  const [userRole, setUserRole] = useState<string>('CARER');
  const [hasIncompleteProfile, setHasIncompleteProfile] = useState(false);
  const [dashboardRefreshCycle, setDashboardRefreshCycle] = useState(0);

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

        // Check if current user has an incomplete profile (CARER/COORDINATOR only, not *_ALL)
        if (role !== 'ADMIN' && role !== 'COORDINATOR_ALL' && role !== 'CARER_ALL' && user) {
          const currentCarer = (newCarers || []).find((c: any) => c.id === user.id);
          setHasIncompleteProfile(currentCarer?.hasProfile === false);
        } else {
          setHasIncompleteProfile(false);
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

  const refreshRoster = useCallback(async () => {
    if (!organization) return;
    try {
      const items = await apiJson<FeedRosterItem[]>(`/api/feed-roster?orgId=${organization.id}`);
      setFeedRosterItems(items || []);
    } catch (error) {
      console.error('Error loading feed roster:', error);
    }
  }, [organization]);

  useEffect(() => {
    refreshRoster();
  }, [refreshRoster]);

  useEffect(() => {
    const hourSydney = Number(
      new Date().toLocaleString('en-AU', {
        hour: '2-digit',
        hour12: false,
        timeZone: 'Australia/Sydney',
      })
    );
    const msg =
      hourSydney < 12 ? 'Good morning' : hourSydney < 18 ? 'Good afternoon' : 'Good evening';
    setGreeting(msg);
  }, []);

  const handleOpenAddAnimal = useCallback(() => {
    setIsAddDialogOpen(true);
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
      setAnimals((prev) => [created, ...prev]);
      setIsAddDialogOpen(false);
      setDashboardRefreshCycle((cycle) => cycle + 1);
      refreshRoster();
    } catch (error) {
      console.error('Error adding animal:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to add animal',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  };

  const handleEditAnimal = useCallback(
    (animal: Animal) => {
      router.push(`/animals/${animal.id}`);
    },
    [router]
  );

  const handleRefresh = async () => {
    if (!user || !organization) return;

    setIsLoading(true);
    try {
      const orgId = organization.id;
      const [newAnimals, newSpecies, newCarers] = await Promise.all([
        apiJson<Animal[]>(`/api/animals?orgId=${orgId}`),
        apiJson<any[]>(`/api/species?orgId=${orgId}`),
        apiJson<any[]>(`/api/carers?orgId=${orgId}`),
        refreshRoster(),
      ]);
      setAnimals(newAnimals);
      setSpeciesList(newSpecies);
      setCarersList(newCarers);
      setDashboardRefreshCycle((cycle) => cycle + 1);

      // Re-check incomplete profile on refresh
      if (
        userRole !== 'ADMIN' &&
        userRole !== 'COORDINATOR_ALL' &&
        userRole !== 'CARER_ALL' &&
        user
      ) {
        const currentCarer = (newCarers || []).find((c: any) => c.id === user.id);
        setHasIncompleteProfile(currentCarer?.hasProfile === false);
      } else {
        setHasIncompleteProfile(false);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!userLoaded || !orgLoaded) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Please sign in</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {greeting}{user.firstName ? `, ${user.firstName}` : ''}
          </h1>
          {organization?.name && (
            <p className="mt-1 text-sm text-muted-foreground">
              {organization.name}{orgJurisdiction ? ` · ${orgJurisdiction} jurisdiction` : ''}
            </p>
          )}
        </div>

        <NSWReportingReminderBanner reminder={nswReminderBanner} />

        {/* Incomplete Profile Banner */}
        {hasIncompleteProfile && (
          <div className="flex items-center gap-3 p-4 mb-6 rounded-lg border border-amber-300 bg-amber-50 text-amber-800">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">
              Your carer profile is incomplete. Please contact your organisation administrator to
              complete your profile before animals can be assigned to you.
            </p>
          </div>
        )}

        {userRole === 'CARER' || userRole === 'CARER_ALL' ? (
          <CarerView
            animals={animals}
            viewMode={viewMode}
            setViewMode={setViewMode}
            isLoading={isLoading}
            onRefresh={handleRefresh}
            onEdit={handleEditAnimal}
            carersList={carersList}
            userRole={userRole}
            feedRosterItems={feedRosterItems}
          />
        ) : (
          <AdminCoordinatorView
            animals={animals}
            userRole={userRole}
            isLoading={isLoading}
            onRefresh={handleRefresh}
            onEdit={handleEditAnimal}
            onAddNew={handleOpenAddAnimal}
            carersList={carersList}
            organization={organization}
            jurisdiction={orgJurisdiction}
            feedRosterItems={feedRosterItems}
            dashboardRefreshCycle={dashboardRefreshCycle}
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
          label: s.name,
        }))}
        carers={(carersList || [])
          .filter((c: any) => c.hasProfile)
          .map((c: any) => ({
            value: c.id,
            label: c.name,
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
