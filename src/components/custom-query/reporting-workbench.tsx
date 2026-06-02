'use client';

import * as React from 'react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, Play, Save, Trash2, Pencil, Loader2 } from 'lucide-react';
import { QlEditor } from './ql-editor';
import { QueryResultChart } from './query-result-chart';
import { PREBUILT_CUSTOM_QUERIES } from '@/lib/custom-query/templates';
import {
  CUSTOM_QUERY_VISUALIZATIONS,
  type CustomQueryResult,
  type CustomQueryVisualization,
} from '@/lib/custom-query/types';

interface SavedQuery {
  id: string;
  name: string;
  query: string;
  visualization: string;
  showOnDashboard: boolean;
  createdByUserId: string;
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const DEFAULT_QUERY = 'count from incidents group by severity chart bar';

export function ReportingWorkbench({
  initialSaved,
  canSave,
}: {
  initialSaved: SavedQuery[];
  canSave: boolean;
}) {
  const [queryText, setQueryText] = React.useState(DEFAULT_QUERY);
  const [start, setStart] = React.useState(isoDaysAgo(90));
  const [end, setEnd] = React.useState(isoDaysAgo(0));
  const [results, setResults] = React.useState<CustomQueryResult[]>([]);
  const [running, setRunning] = React.useState(false);
  const [saved, setSaved] = React.useState<SavedQuery[]>(initialSaved);

  // Save / edit dialog state.
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<SavedQuery | null>(null);
  const [formName, setFormName] = React.useState('');
  const [formQuery, setFormQuery] = React.useState('');
  const [formVisual, setFormVisual] =
    React.useState<CustomQueryVisualization>('table');
  const [formDashboard, setFormDashboard] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const queryLines = React.useMemo(
    () =>
      queryText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0),
    [queryText]
  );

  async function runPreview() {
    if (queryLines.length === 0) {
      toast.error('Enter at least one query line.');
      return;
    }
    setRunning(true);
    try {
      const res = await fetch('/api/report-queries/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queries: queryLines, start, end }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Preview failed');
      }
      const data = (await res.json()) as { results: CustomQueryResult[] };
      setResults(data.results);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setRunning(false);
    }
  }

  function openSaveDialog(query: string, visual: CustomQueryVisualization) {
    setEditing(null);
    setFormName('');
    setFormQuery(query);
    setFormVisual(visual);
    setFormDashboard(false);
    setDialogOpen(true);
  }

  function openEditDialog(q: SavedQuery) {
    setEditing(q);
    setFormName(q.name);
    setFormQuery(q.query);
    setFormVisual(q.visualization as CustomQueryVisualization);
    setFormDashboard(q.showOnDashboard);
    setDialogOpen(true);
  }

  async function submitDialog() {
    if (!formName.trim()) {
      toast.error('Give the query a name.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: formName.trim(),
        query: formQuery.trim(),
        visualization: formVisual,
        showOnDashboard: formDashboard,
      };
      const res = await fetch(
        editing ? `/api/report-queries/${editing.id}` : '/api/report-queries',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Save failed');
      }
      const row = (await res.json()) as SavedQuery;
      setSaved((prev) =>
        editing
          ? prev.map((q) => (q.id === row.id ? row : q))
          : [row, ...prev]
      );
      toast.success(editing ? 'Query updated.' : 'Query saved.');
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleDashboard(q: SavedQuery, next: boolean) {
    // Optimistic update.
    setSaved((prev) =>
      prev.map((s) => (s.id === q.id ? { ...s, showOnDashboard: next } : s))
    );
    const res = await fetch(`/api/report-queries/${q.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ showOnDashboard: next }),
    });
    if (!res.ok) {
      setSaved((prev) =>
        prev.map((s) => (s.id === q.id ? { ...s, showOnDashboard: !next } : s))
      );
      toast.error('Could not update dashboard visibility.');
    }
  }

  async function deleteQuery(q: SavedQuery) {
    const res = await fetch(`/api/report-queries/${q.id}`, { method: 'DELETE' });
    if (res.ok) {
      setSaved((prev) => prev.filter((s) => s.id !== q.id));
      toast.success('Query deleted.');
    } else {
      toast.error('Could not delete query.');
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Editor card ── */}
      <Card>
        <CardHeader>
          <CardTitle>Query workbench</CardTitle>
          <CardDescription>
            Write one safe query per line. Preview runs instantly — it never
            uses AI tokens or creates report drafts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-48">
              <Label className="text-xs">Template</Label>
              <Select
                onValueChange={(id) => {
                  const t = PREBUILT_CUSTOM_QUERIES.find((q) => q.id === id);
                  if (t) setQueryText(t.query);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Insert a template…" />
                </SelectTrigger>
                <SelectContent>
                  {PREBUILT_CUSTOM_QUERIES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs" htmlFor="report-start">
                From
              </Label>
              <Input
                id="report-start"
                type="date"
                value={start}
                max={end}
                onChange={(e) => setStart(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="report-end">
                To
              </Label>
              <Input
                id="report-end"
                type="date"
                value={end}
                min={start}
                onChange={(e) => setEnd(e.target.value)}
                className="w-40"
              />
            </div>
          </div>

          <QlEditor value={queryText} onChange={setQueryText} />

          <div className="flex items-center gap-2">
            <Button onClick={runPreview} disabled={running} className="gap-2">
              {running ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Preview
            </Button>
            <p className="text-xs text-muted-foreground">
              Date range is applied to each query&apos;s source (max one year).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Results ── */}
      {results.map((result, i) => (
        <ResultCard
          key={`${result.query}-${i}`}
          result={result}
          canSave={canSave}
          onSave={() =>
            openSaveDialog(
              result.query,
              (result.visualization ?? 'table') as CustomQueryVisualization
            )
          }
        />
      ))}

      {/* ── Saved library ── */}
      <Card>
        <CardHeader>
          <CardTitle>Saved query library</CardTitle>
          <CardDescription>
            Queries saved to your organisation. Toggle a query onto the
            dashboard to show it as a widget.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {saved.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No saved queries yet.
            </p>
          ) : (
            <ul className="divide-y">
              {saved.map((q) => (
                <li
                  key={q.id}
                  className="flex flex-wrap items-center gap-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{q.name}</p>
                    <code className="block truncate text-xs text-muted-foreground">
                      {q.query}
                    </code>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Dashboard
                    </Label>
                    <Switch
                      checked={q.showOnDashboard}
                      onCheckedChange={(v) => toggleDashboard(q, v)}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQueryText(q.query)}
                  >
                    Load
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(q)}
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteQuery(q)}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── Save / edit dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit saved query' : 'Save query'}
            </DialogTitle>
            <DialogDescription>
              Saved queries are shared with your organisation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="q-name">Name</Label>
              <Input
                id="q-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Incidents by severity"
              />
            </div>
            <div>
              <Label htmlFor="q-query">Query</Label>
              <Input
                id="q-query"
                value={formQuery}
                onChange={(e) => setFormQuery(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>Chart</Label>
                <Select
                  value={formVisual}
                  onValueChange={(v) =>
                    setFormVisual(v as CustomQueryVisualization)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CUSTOM_QUERY_VISUALIZATIONS.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch
                  checked={formDashboard}
                  onCheckedChange={setFormDashboard}
                  id="q-dashboard"
                />
                <Label htmlFor="q-dashboard">Show on dashboard</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={submitDialog} disabled={submitting} className="gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Save changes' : 'Save query'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ResultCard({
  result,
  canSave,
  onSave,
}: {
  result: CustomQueryResult;
  canSave: boolean;
  onSave: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <code className="break-words text-sm">{result.query}</code>
        </div>
        {result.ok && canSave && (
          <Button variant="outline" size="sm" onClick={onSave} className="gap-1.5">
            <Save className="h-3.5 w-3.5" /> Save
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {result.warnings && result.warnings.length > 0 && (
          <div className="space-y-1">
            {result.warnings.map((w, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-md bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {result.ok ? (
          <Tabs defaultValue="table">
            <TabsList>
              <TabsTrigger value="table">Table</TabsTrigger>
              <TabsTrigger value="chart">
                Chart ({result.visualization})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="table">
              <QueryResultChart result={{ ...result, visualization: 'table' }} />
            </TabsContent>
            <TabsContent value="chart">
              <QueryResultChart result={result} />
            </TabsContent>
          </Tabs>
        ) : (
          <QueryResultChart result={result} />
        )}
      </CardContent>
    </Card>
  );
}
