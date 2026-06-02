'use client';

// Renders a QueryResult as a table, number card, bar, pie, or line chart.

import * as React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ChartType } from '@/lib/ql/sources';
import type { QueryResult } from '@/lib/ql/types';

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#ef4444',
  '#8b5cf6',
];

export function QueryResultTable({ result }: { result: QueryResult }) {
  if (result.rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No rows match this query.</p>;
  }
  return (
    <div className="max-h-[320px] overflow-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{result.columns[0]}</TableHead>
            <TableHead className="text-right">{result.columns[1]}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.rows.map((row) => (
            <TableRow key={row.group}>
              <TableCell className="font-medium">{row.group}</TableCell>
              <TableCell className="text-right tabular-nums">{row.value.toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function QueryResultView({ result, chartType }: { result: QueryResult; chartType: ChartType }) {
  const data = result.rows;

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No rows match this query.</p>;
  }

  if (chartType === 'table') {
    return <QueryResultTable result={result} />;
  }

  if (chartType === 'number') {
    const value = data.length === 1 ? data[0].value : data.reduce((sum, r) => sum + r.value, 0);
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="text-4xl sm:text-5xl font-bold tabular-nums">{value.toLocaleString()}</div>
        <div className="text-sm text-muted-foreground mt-1">{result.columns[1]}</div>
      </div>
    );
  }

  if (chartType === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Tooltip />
          <Pie data={data} dataKey="value" nameKey="group" innerRadius={50} outerRadius={100} label>
            {data.map((entry, i) => (
              <Cell key={entry.group} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="group" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="hsl(var(--chart-1))" strokeWidth={2} dot />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // bar (default)
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="group" tick={{ fontSize: 12 }} interval={0} angle={data.length > 6 ? -30 : 0} textAnchor={data.length > 6 ? 'end' : 'middle'} height={data.length > 6 ? 60 : 30} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={entry.group} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
