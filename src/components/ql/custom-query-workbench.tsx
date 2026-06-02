'use client';

// Custom QL workbench: write a query, preview it as a table/number/bar/pie/line,
// see visual-fit guidance, and save it to the org-scoped library (optionally as a
// dashboard widget). Preview and save never call AI generation — they only parse,
// validate against the allowlist, and read.

import * as React from 'react';
import Link from 'next/link';
import { Play, Save, Trash2, Pencil, LayoutDashboard, AlertTriangle, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CHART_TYPES, type ChartType } from '@/lib/ql/sources';
import type { QueryResult } from '@/lib/ql/types';
import { visualFitWarning } from '@/lib/ql/visual-fit';
import { QueryEditor, type SourceMeta } from './query-editor';
import { QueryResultView, QueryResultTable } from './query-result-view';

interface SavedQuery {
  id: string;
  name: string;
  description: string | null;
  queryText: string;
  chartType: ChartType;
  showOnDashboard: boolean;
  updatedAt: string;
}

const EXAMPLES: { label: string; query: string; chartType: ChartType }[] = [
  { label: 'Animals by species', query: 'from animals group by species select count', chartType: 'bar' },
  { label: 'Admissions per month', query: 'from animals group by foundMonth select count', chartType: 'line' },
  { label: 'Caseload by status', query: 'from animals where status = IN_CARE group by species select count', chartType: 'bar' },
  { label: 'Incidents by severity', query: 'from incidents group by severity select count', chartType: 'pie' },
  { label: 'Care records by type', query: 'from records group by type select count', chartType: 'bar' },
  { label: 'Releases by type', query: 'from releases group by releaseType select count', chartType: 'pie' },
];

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = Array.isArray(body?.details) && body.details.length ? `: ${body.details.join('; ')}` : '';
    throw new Error(`${body?.error || 'Request failed'}${detail}`);
  }
  return body as T;
}

export function CustomQueryWorkbench() {
  const { toast } = useToast();
  const [sources, setSources] = React.useState<SourceMeta[]>([]);
  const [query, setQuery] = React.useState(EXAMPLES[0].query);
  const [chartType, setChartType] = React.useState<ChartType>('bar');
  const [result, setResult] = React.useState<QueryResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [running, setRunning] = React.useState(false);

  const [saved, setSaved] = React.useState<SavedQuery[]>([]);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [showOnDashboard, setShowOnDashboard] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    api<{ sources: SourceMeta[] }>('/api/ql/sources')
      .then((d) => setSources(d.sources))
      .catch(() => setSources([]));
    refreshSaved();
  }, []);

  const refreshSaved = React.useCallback(() => {
    api<SavedQuery[]>('/api/ql/saved')
      .then(setSaved)
      .catch(() => setSaved([]));
  }, []);

  const runPreview = React.useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const r = await api<QueryResult>('/api/ql/preview', { method: 'POST', body: JSON.stringify({ query }) });
      setResult(r);
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : 'Failed to run query');
    } finally {
      setRunning(false);
    }
  }, [query]);

  const loadExample = (ex: (typeof EXAMPLES)[number]) => {
    setQuery(ex.query);
    setChartType(ex.chartType);
    setResult(null);
    setError(null);
  };

  const startEdit = (q: SavedQuery) => {
    setEditingId(q.id);
    setName(q.name);
    setDescription(q.description ?? '');
    setQuery(q.queryText);
    setChartType(q.chartType);
    setShowOnDashboard(q.showOnDashboard);
    setResult(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setShowOnDashboard(false);
  };

  const save = async () => {
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Name required', description: 'Give the report a name before saving.' });
      return;
    }
    setSaving(true);
    try {
      const payload = { name: name.trim(), description: description.trim() || null, queryText: query, chartType, showOnDashboard };
      if (editingId) {
        await api(`/api/ql/saved/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        toast({ title: 'Report updated' });
      } else {
        await api('/api/ql/saved', { method: 'POST', body: JSON.stringify(payload) });
        toast({ title: 'Report saved' });
      }
      cancelEdit();
      refreshSaved();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not save', description: e instanceof Error ? e.message : 'Try again.' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api(`/api/ql/saved/${id}`, { method: 'DELETE' });
      if (editingId === id) cancelEdit();
      refreshSaved();
      toast({ title: 'Report deleted' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not delete', description: e instanceof Error ? e.message : 'Try again.' });
    }
  };

  const toggleDashboard = async (q: SavedQuery) => {
    try {
      await api(`/api/ql/saved/${q.id}`, { method: 'PATCH', body: JSON.stringify({ showOnDashboard: !q.showOnDashboard }) });
      refreshSaved();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not update', description: e instanceof Error ? e.message : 'Try again.' });
    }
  };

  const fitWarning = result ? visualFitWarning(chartType, result) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Custom Reports</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Editor column ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{editingId ? 'Edit query' : 'Query'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-1">
              {EXAMPLES.map((ex) => (
                <Button key={ex.label} variant="outline" size="sm" className="text-xs" onClick={() => loadExample(ex)}>
                  {ex.label}
                </Button>
              ))}
            </div>

            <QueryEditor value={query} onChange={setQuery} sources={sources} />

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor="chartType" className="text-sm text-muted-foreground">
                  Visualise as
                </label>
                <select
                  id="chartType"
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value as ChartType)}
                  className="rounded-md border bg-background px-2 py-1.5 text-sm"
                >
                  {CHART_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <Button onClick={runPreview} disabled={running} size="sm">
                {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                Preview
              </Button>
            </div>

            {/* ── Save form ── */}
            <div className="border-t pt-4 space-y-3">
              <Input placeholder="Report name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
              <Input
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showOnDashboard}
                  onChange={(e) => setShowOnDashboard(e.target.checked)}
                  className="h-4 w-4"
                />
                <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                Show on dashboard
              </label>
              <div className="flex gap-2">
                <Button onClick={save} disabled={saving} size="sm">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  {editingId ? 'Update report' : 'Save report'}
                </Button>
                {editingId && (
                  <Button onClick={cancelEdit} variant="ghost" size="sm">
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Results column ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span className="break-words">{error}</span>
              </div>
            )}

            {fitWarning && (
              <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{fitWarning}</span>
              </div>
            )}

            {!result && !error && (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Press <span className="font-medium">Preview</span> to run your query.
              </p>
            )}

            {result && (
              <>
                <QueryResultView result={result} chartType={chartType} />
                {/* A table is always shown, even when a chart is selected. */}
                {chartType !== 'table' && (
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground mb-1">Data</p>
                    <QueryResultTable result={result} />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Window {result.range.since} → {result.range.until}
                  {result.truncated && ' · results truncated to the row cap'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Saved library ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saved reports</CardTitle>
        </CardHeader>
        <CardContent>
          {saved.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved reports yet.</p>
          ) : (
            <div className="space-y-2">
              {saved.map((q) => (
                <div key={q.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{q.name}</div>
                    <div className="text-xs font-mono text-muted-foreground truncate">{q.queryText}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant={q.showOnDashboard ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleDashboard(q)}
                      title={q.showOnDashboard ? 'On dashboard' : 'Add to dashboard'}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit" onClick={() => startEdit(q)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      aria-label="Delete"
                      onClick={() => remove(q.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
