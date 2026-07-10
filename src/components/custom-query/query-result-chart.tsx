'use client';

// Shared renderer for custom-query results. Used by both the preview workbench
// and dashboard widgets so a saved query looks identical in both places.

import * as React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { CustomQueryResult } from '@/lib/custom-query/types';
import { getUserFriendlyErrorMessage } from '@/lib/user-friendly-error';

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#ec4899',
  '#8b5cf6',
];

function formatNumber(n: number): string {
  return Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
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
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={rows} margin={{ top: 16, right: 16, bottom: 16, left: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} interval={0} angle={rows.length > 6 ? -30 : 0} textAnchor={rows.length > 6 ? 'end' : 'middle'} height={rows.length > 6 ? 60 : 30} />
          <YAxis allowDecimals={false} fontSize={12} />
          <Tooltip formatter={(v: number) => formatNumber(v)} />
          <Bar dataKey="value" radius={4}>
            {rows.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // ── pie ──
  if (visualization === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Tooltip formatter={(v: number) => formatNumber(v)} />
          <Legend />
          <Pie
            data={rows}
            dataKey="value"
            nameKey="label"
            innerRadius={height * 0.18}
            outerRadius={height * 0.38}
            paddingAngle={2}
          >
            {rows.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    );
  }

  // ── line ──
  if (visualization === 'line') {
    const series = result.series ?? [];
    if (series.length > 0) {
      // Pivot series into one row per bucket with a column per group.
      const buckets = rows.map((r) => r.label);
      const data = buckets.map((bucket) => {
        const point: Record<string, string | number> = { label: bucket };
        for (const s of series) {
          point[s.label] = s.rows.find((r) => r.label === bucket)?.value ?? 0;
        }
        return point;
      });
      return (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 16, right: 16, bottom: 16, left: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis allowDecimals={false} fontSize={12} />
            <Tooltip formatter={(v: number) => formatNumber(v)} />
            <Legend />
            {series.map((s, i) => (
              <Line
                key={s.label}
                type="monotone"
                dataKey={s.label}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={rows} margin={{ top: 16, right: 16, bottom: 16, left: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis allowDecimals={false} fontSize={12} />
          <Tooltip formatter={(v: number) => formatNumber(v)} />
          <Line type="monotone" dataKey="value" stroke={COLORS[0]} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return <ResultTable result={result} />;
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
                    {formatNumber(s.rows.find((r) => r.label === bucket)?.value ?? 0)}
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
  const valueHeader = result.operation === 'sum' ? result.metric ?? 'Total' : 'Count';

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
              <TableCell className="text-right tabular-nums">{formatNumber(row.value)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
