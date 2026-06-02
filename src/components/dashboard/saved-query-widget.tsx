'use client';

// Renders one saved query on the dashboard by running it server-side and
// drawing the result with its saved chart type. An invalid saved query shows an
// inline error state rather than crashing the dashboard.

import * as React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { ChartType } from '@/lib/ql/sources';
import type { QueryResult } from '@/lib/ql/types';
import { QueryResultView } from '@/components/ql/query-result-view';

interface RunResponse {
  id: string;
  name: string;
  chartType: ChartType;
  result: QueryResult;
}

export function SavedQueryWidget({ id }: { id: string }) {
  const [data, setData] = React.useState<RunResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/ql/saved/${id}/run`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error || 'Failed to run report');
        return body as RunResponse;
      })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to run report');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <span>This report could not be run: {error ?? 'unknown error'}</span>
      </div>
    );
  }

  return <QueryResultView result={data.result} chartType={data.chartType} />;
}
