'use client';

// Shared renderer for custom-query results. Used by both the preview workbench
// and dashboard widgets so a saved query looks identical in both places.

import * as React from 'react';
import {
  barY,
  colorLegend,
  defineChart,
  lineY,
} from '@tanstack/charts';
import { Chart } from '@tanstack/charts/react';
import { pie, polar, radialArc } from '@tanstack/charts/polar';
import { scaleBand } from '@tanstack/charts/scales/band';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { scalePoint } from '@tanstack/charts/scales/point';
import { tooltip } from '@tanstack/charts/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CHART_COLORS } from '@/components/ui/chart';
import type { CustomQueryResult } from '@/lib/custom-query/types';
import { getUserFriendlyErrorMessage } from '@/lib/user-friendly-error';

function formatNumber(n: number): string {
  return Number.isInteger(n)
    ? n.toLocaleString()
    : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

interface Props {
  result: CustomQueryResult;
  height?: number;
}

export function QueryResultChart({ result, height = 280 }: Props) {
  if (!result.ok) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {getUserFriendlyErrorMessage(
          result.error,
          "We couldn't run this query. Check it and try again."
        )}
      </div>
    );
  }

  const rows = result.rows ?? [];
  const visualization = result.visualization ?? 'table';

  // ── number ──
  if (visualization === 'number') {
    const value =
      result.value ?? rows.reduce((sum, r) => sum + r.value, 0);
    return (
      <div className="flex h-full flex-col items-center justify-center py-8">
        <div className="text-4xl font-bold tabular-nums">{formatNumber(value)}</div>
        {result.metric && (
          <div className="mt-1 text-sm text-muted-foreground">{result.metric}</div>
        )}
      </div>
    );
  }

  // ── table ──
  if (visualization === 'table') {
    return <ResultTable result={result} />;
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        No data for this query.
      </div>
    );
  }

  // ── bar ──
  if (visualization === 'bar') {
    return <BarResultChart rows={rows} height={height} />;
  }

  // ── pie ──
  if (visualization === 'pie') {
    return <PieResultChart rows={rows} height={height} />;
  }

  // ── line ──
  if (visualization === 'line') {
    return (
      <LineResultChart
        rows={rows}
        series={result.series ?? []}
        height={height}
      />
    );
  }

  return <ResultTable result={result} />;
}

function BarResultChart({
  rows,
  height,
}: {
  rows: Array<{ label: string; value: number }>;
  height: number;
}) {
  const definition = React.useMemo(() => {
    const labels = rows.map((r) => r.label);
    return defineChart({
      marks: [
        barY(rows, {
          x: 'label',
          y: 'value',
          color: 'label',
          radius: 4,
          inset: 2,
          key: 'label',
        }),
      ],
      x: {
        scale: () => scaleBand<string>().domain(labels).padding(0.2),
        axis: {
          tickLabels: {
            fontSize: 12,
            rotate: rows.length > 6 ? -30 : 0,
          },
        },
      },
      y: {
        scale: scaleLinear,
        nice: true,
        grid: true,
      },
      color: {
        domain: labels,
        range: labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
      },
      tooltip,
    });
  }, [rows]);

  return (
    <div style={{ height }} className="w-full">
      <Chart
        definition={definition}
        height={height}
        ariaLabel="Query result bar chart"
        className="h-full w-full"
      />
    </div>
  );
}

function PieResultChart({
  rows,
  height,
}: {
  rows: Array<{ label: string; value: number }>;
  height: number;
}) {
  const definition = React.useMemo(() => {
    const data = rows.map((r) => ({ name: r.label, value: r.value }));
    const slices = pie(data, { value: 'value', gapAngle: 0.02 });
    const names = data.map((d) => d.name);

    return defineChart({
      marks: [
        polar({
          inset: 8,
          radiusRatio: 0.88,
          marks: [
            radialArc(slices, {
              innerRadius: ({ radius }) => radius * 0.45,
              cornerRadius: 3,
              color: 'name',
              key: 'name',
            }),
          ],
        }),
      ],
      color: {
        domain: names,
        range: names.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        legend: colorLegend({ label: 'Category' }),
      },
      tooltip,
    });
  }, [rows]);

  return (
    <div style={{ height }} className="w-full">
      <Chart
        definition={definition}
        height={height}
        ariaLabel="Query result pie chart"
        className="h-full w-full"
      />
    </div>
  );
}

function LineResultChart({
  rows,
  series,
  height,
}: {
  rows: Array<{ label: string; value: number }>;
  series: Array<{ label: string; rows: Array<{ label: string; value: number }> }>;
  height: number;
}) {
  const definition = React.useMemo(() => {
    if (series.length > 0) {
      const longRows = series.flatMap((s) =>
        s.rows.map((r) => ({
          label: r.label,
          value: r.value,
          series: s.label,
        }))
      );
      const seriesLabels = series.map((s) => s.label);
      const buckets = rows.map((r) => r.label);

      return defineChart({
        marks: [
          lineY(longRows, {
            x: 'label',
            y: 'value',
            z: 'series',
            color: 'series',
            strokeWidth: 2,
            key: (d) => `${d.series}-${d.label}`,
          }),
        ],
        x: {
          scale: () => scalePoint<string>().domain(buckets).padding(0.15),
          axis: { tickLabels: { fontSize: 12 } },
        },
        y: {
          scale: scaleLinear,
          nice: true,
          grid: true,
        },
        color: {
          domain: seriesLabels,
          range: seriesLabels.map(
            (_, i) => CHART_COLORS[i % CHART_COLORS.length]
          ),
          legend: colorLegend({ label: 'Series' }),
        },
        tooltip,
      });
    }

    return defineChart({
      marks: [
        lineY(rows, {
          x: 'label',
          y: 'value',
          stroke: CHART_COLORS[0],
          strokeWidth: 2,
          key: 'label',
        }),
      ],
      x: {
        scale: () =>
          scalePoint<string>()
            .domain(rows.map((r) => r.label))
            .padding(0.15),
        axis: { tickLabels: { fontSize: 12 } },
      },
      y: {
        scale: scaleLinear,
        nice: true,
        grid: true,
      },
      tooltip,
    });
  }, [rows, series]);

  return (
    <div style={{ height }} className="w-full">
      <Chart
        definition={definition}
        height={height}
        ariaLabel="Query result line chart"
        className="h-full w-full"
      />
    </div>
  );
}

function ResultTable({ result }: { result: CustomQueryResult }) {
  const rows = result.rows ?? [];
  const series = result.series ?? [];

  // Multi-series: bucket rows with a column per group.
  if (series.length > 0) {
    const buckets = rows.map((r) => r.label);
    return (
      <div className="max-h-[320px] overflow-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{result.trendBy ?? 'Bucket'}</TableHead>
              {series.map((s) => (
                <TableHead key={s.label} className="text-right">
                  {s.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {buckets.map((bucket) => (
              <TableRow key={bucket}>
                <TableCell>{bucket}</TableCell>
                {series.map((s) => (
                  <TableCell key={s.label} className="text-right tabular-nums">
                    {formatNumber(
                      s.rows.find((r) => r.label === bucket)?.value ?? 0
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        No data for this query.
      </div>
    );
  }

  const labelHeader = result.groupBy ?? result.trendBy ?? 'Label';
  const valueHeader =
    result.operation === 'sum' ? (result.metric ?? 'Total') : 'Count';

  return (
    <div className="max-h-[320px] overflow-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{labelHeader}</TableHead>
            <TableHead className="text-right">{valueHeader}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.label}>
              <TableCell>{row.label}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatNumber(row.value)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
