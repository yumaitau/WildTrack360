'use client';

// Builds the dashboard's draggable widget set: the built-in analytics charts
// plus any saved custom-QL reports flagged for the dashboard. Saved-report
// widgets are only loaded for users with org-level report access.

import * as React from 'react';
import { Animal } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SpeciesDistributionChart from '@/components/species-distribution-chart';
import RecentAdmissionsChart from '@/components/recent-admissions-chart';
import CarerWorkloadDashboard from '@/components/carer-workload-dashboard';
import ReleasesVsAdmissionsChart from '@/components/releases-vs-admissions-chart';
import { WidgetGrid, type DashboardWidget } from './widget-grid';
import { SavedQueryWidget } from './saved-query-widget';

interface SavedDashboardQuery {
  id: string;
  name: string;
}

interface DashboardWidgetsProps {
  animals: Animal[];
  carerMap: Record<string, string>;
  /** Whether the current user may load org-wide custom reports. */
  canUseReports: boolean;
}

export function DashboardWidgets({ animals, carerMap, canUseReports }: DashboardWidgetsProps) {
  const [savedQueries, setSavedQueries] = React.useState<SavedDashboardQuery[]>([]);

  React.useEffect(() => {
    if (!canUseReports) return;
    let cancelled = false;
    fetch('/api/ql/saved?dashboard=1')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: SavedDashboardQuery[]) => {
        if (!cancelled && Array.isArray(data)) setSavedQueries(data);
      })
      .catch(() => {
        /* leave dashboard without custom widgets on failure */
      });
    return () => {
      cancelled = true;
    };
  }, [canUseReports]);

  const widgets = React.useMemo<DashboardWidget[]>(() => {
    const base: DashboardWidget[] = [
      {
        id: 'species-distribution',
        title: 'Species Distribution',
        defaultSize: 'half',
        render: () => <SpeciesDistributionChart animals={animals} />,
      },
      {
        id: 'recent-admissions',
        title: 'Recent Admissions',
        defaultSize: 'half',
        render: () => <RecentAdmissionsChart animals={animals} />,
      },
      {
        id: 'carer-workload',
        title: 'Carer Workload',
        defaultSize: 'full',
        render: () => <CarerWorkloadDashboard animals={animals} carerMap={carerMap} />,
      },
      {
        id: 'releases-vs-admissions',
        title: 'Releases vs Admissions',
        defaultSize: 'full',
        render: () => <ReleasesVsAdmissionsChart animals={animals} />,
      },
    ];

    const custom: DashboardWidget[] = savedQueries.map((q) => ({
      id: `saved:${q.id}`,
      title: q.name,
      defaultSize: 'half',
      render: () => (
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-base">{q.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <SavedQueryWidget id={q.id} />
          </CardContent>
        </Card>
      ),
    }));

    return [...base, ...custom];
  }, [animals, carerMap, savedQueries]);

  return <WidgetGrid widgets={widgets} storageKey="home" title="Insights" />;
}
