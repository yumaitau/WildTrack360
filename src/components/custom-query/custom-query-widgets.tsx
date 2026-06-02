'use client';

// Dashboard section that renders saved queries flagged `showOnDashboard`.
// Each widget uses the same renderer as the workbench preview.

import * as React from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3 } from 'lucide-react';
import { QueryResultChart } from './query-result-chart';
import type { CustomQueryResult } from '@/lib/custom-query/types';

interface Widget {
  id: string;
  name: string;
  visualization: string;
  result: CustomQueryResult;
}

export function CustomQueryWidgets() {
  const [widgets, setWidgets] = React.useState<Widget[] | null>(null);

  React.useEffect(() => {
    let active = true;
    fetch('/api/report-queries/dashboard')
      .then((r) => (r.ok ? r.json() : { widgets: [] }))
      .then((data: { widgets?: Widget[] }) => {
        if (active) setWidgets(data.widgets ?? []);
      })
      .catch(() => active && setWidgets([]));
    return () => {
      active = false;
    };
  }, []);

  if (widgets === null) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (widgets.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <BarChart3 className="h-5 w-5" /> Custom reports
        </h2>
        <Link
          href="/tools/reporting"
          className="text-sm text-primary hover:underline"
        >
          Manage
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {widgets.map((w) => (
          <Card key={w.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{w.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <QueryResultChart result={w.result} height={220} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
