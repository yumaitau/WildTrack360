'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Download, Eye, MapPin, Trash2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { getPhotoUrl } from '@/lib/photo-url';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { CustomFormField } from '@/lib/forms/custom-forms';
import {
  formatFieldValue,
  readApiError,
  type CustomFormRecord,
  type CustomFormSubmissionRecord,
} from './custom-form-types';

interface Props {
  formId: string;
  canViewSubmissions: boolean;
}

function mapsLink(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

export function CustomFormSubmissions({ formId, canViewSubmissions }: Props) {
  const [form, setForm] = useState<CustomFormRecord | null>(null);
  const [submissions, setSubmissions] = useState<CustomFormSubmissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CustomFormSubmissionRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomFormSubmissionRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [formRes, submissionsRes] = await Promise.all([
          fetch(`/api/custom-forms/${formId}`),
          fetch(`/api/custom-forms/submissions?formId=${encodeURIComponent(formId)}`),
        ]);
        if (formRes.status === 404) {
          if (!cancelled) setLoadError('This form is not available.');
          return;
        }
        if (!formRes.ok) throw new Error(await readApiError(formRes, 'Failed to load form'));
        if (!submissionsRes.ok) {
          throw new Error(await readApiError(submissionsRes, 'Failed to load submissions'));
        }
        const formBody = (await formRes.json()) as CustomFormRecord;
        const submissionsBody = (await submissionsRes.json()) as {
          submissions: CustomFormSubmissionRecord[];
        };
        if (cancelled) return;
        setForm(formBody);
        setSubmissions(submissionsBody.submissions ?? []);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Failed to load submissions';
        setLoadError(message);
        toast.error(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formId]);

  function fieldsForSubmission(submission: CustomFormSubmissionRecord): CustomFormField[] {
    return (submission.formSchema ?? form?.schema)?.fields ?? [];
  }

  function valueSummary(submission: CustomFormSubmissionRecord): string {
    if (!form) return '—';
    const parts: string[] = [];
    for (const field of fieldsForSubmission(submission)) {
      if (field.archived) continue;
      const value = submission.values[field.id];
      if (value === null || value === undefined || value === '') continue;
      parts.push(`${field.label}: ${formatFieldValue(field, value)}`);
      if (parts.length >= 3) break;
    }
    return parts.length > 0 ? parts.join(' · ') : '—';
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/custom-forms/submissions/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, 'Failed to delete submission'));
      }
      setSubmissions((current) => current.filter((item) => item.id !== deleteTarget.id));
      setSelected((current) => (current?.id === deleteTarget.id ? null : current));
      setDeleteTarget(null);
      toast.success('Submission deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete submission');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <main className="container mx-auto space-y-4 p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  if (loadError || !form) {
    return (
      <main className="container mx-auto space-y-4 p-4 sm:p-6 lg:p-8">
        <BackLink />
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {loadError ?? 'This form is not available.'}
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <BackLink />
          <h1 className="mt-1 truncate text-2xl font-bold tracking-tight">
            {form.title}: submissions
          </h1>
          <p className="text-sm text-muted-foreground">
            {canViewSubmissions
              ? `${submissions.length} submission${submissions.length === 1 ? '' : 's'}`
              : 'Showing your submissions only.'}
          </p>
        </div>
        {canViewSubmissions && (
          <div className="flex shrink-0 gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={`/api/custom-forms/${form.id}/submissions/export?format=csv`}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/custom-forms/${form.id}/submissions/export?format=json`}>
                <Download className="mr-2 h-4 w-4" />
                Export JSON
              </a>
            </Button>
          </div>
        )}
      </div>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No submissions yet.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Observed</TableHead>
                  <TableHead className="hidden md:table-cell">Submitted by</TableHead>
                  <TableHead className="hidden sm:table-cell">Version</TableHead>
                  <TableHead className="hidden lg:table-cell">Location</TableHead>
                  <TableHead>Values</TableHead>
                  <TableHead className="hidden lg:table-cell">Notes</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(submission.observedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="hidden max-w-40 md:table-cell">
                      <span className="block truncate text-xs">
                        {submission.submittedByUserEmail ?? submission.submittedByUserId}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline">v{submission.formVersion}</Badge>
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap lg:table-cell">
                      {submission.location ? (
                        <a
                          href={mapsLink(
                            submission.location.latitude,
                            submission.location.longitude
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          {submission.location.latitude.toFixed(4)},{' '}
                          {submission.location.longitude.toFixed(4)}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-64">
                      <span className="line-clamp-2 text-sm">{valueSummary(submission)}</span>
                    </TableCell>
                    <TableCell className="hidden max-w-48 lg:table-cell">
                      <span className="line-clamp-2 text-sm text-muted-foreground">
                        {submission.notes ?? '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setSelected(submission)}
                          title="View submission"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(submission)}
                          title="Delete submission"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submission details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <dl className="grid gap-3 sm:grid-cols-2">
                <DetailItem label="Observed at">
                  {new Date(selected.observedAt).toLocaleString()}
                </DetailItem>
                <DetailItem label="Submitted by">
                  <span className="break-all text-xs">
                    {selected.submittedByUserEmail ?? selected.submittedByUserId}
                  </span>
                </DetailItem>
                <DetailItem label="Form version">v{selected.formVersion}</DetailItem>
                <DetailItem label="Location">
                  {selected.location ? (
                    <a
                      href={mapsLink(selected.location.latitude, selected.location.longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {selected.location.latitude.toFixed(5)},{' '}
                      {selected.location.longitude.toFixed(5)}
                      {selected.location.accuracyMeters != null
                        ? ` (±${Math.round(selected.location.accuracyMeters)} m)`
                        : ''}
                    </a>
                  ) : (
                    '—'
                  )}
                </DetailItem>
              </dl>

              <div className="space-y-2 rounded-md border p-3">
                <p className="font-medium">Values</p>
                {fieldsForSubmission(selected).filter((f) => !f.archived).length === 0 ? (
                  <p className="text-muted-foreground">This form has no fields.</p>
                ) : (
                  <dl className="space-y-2">
                    {fieldsForSubmission(selected)
                      .filter((f) => !f.archived)
                      .map((field) => (
                        <div key={field.id} className="grid gap-1 sm:grid-cols-[200px_1fr]">
                          <dt className="text-muted-foreground">{field.label}</dt>
                          <dd className="break-words">
                            {formatFieldValue(field, selected.values[field.id])}
                          </dd>
                        </div>
                      ))}
                  </dl>
                )}
              </div>

              {selected.weather && (
                <div className="space-y-1 rounded-md border p-3">
                  <p className="font-medium">Weather</p>
                  <p className="text-muted-foreground">
                    {[
                      selected.weather.temperatureCelsius != null
                        ? `${selected.weather.temperatureCelsius}°C`
                        : null,
                      selected.weather.humidityPct != null
                        ? `${selected.weather.humidityPct}% humidity`
                        : null,
                      selected.weather.windDirection || null,
                      selected.weather.windSpeedKmh != null
                        ? `${selected.weather.windSpeedKmh} km/h wind`
                        : null,
                      selected.weather.rainfallMm != null
                        ? `${selected.weather.rainfallMm} mm rain`
                        : null,
                      selected.weather.summary || null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </p>
                </div>
              )}

              {selected.photoUrls.length > 0 && (
                <div className="space-y-3 rounded-md border p-3">
                  <p className="font-medium">Photos ({selected.photoUrls.length})</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {selected.photoUrls.map((storedUrl, index) => {
                      const photoUrl = getPhotoUrl(storedUrl);
                      if (!photoUrl) return null;
                      return (
                        <a
                          key={`${storedUrl}-${index}`}
                          href={photoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group overflow-hidden rounded-md border bg-muted"
                          title={`Open photo ${index + 1} full size`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- Next Image cannot forward the browser's Clerk session cookie to this authenticated proxy. */}
                          <img
                            src={photoUrl}
                            alt={`Submission photo ${index + 1}`}
                            className="aspect-square h-auto w-full object-cover transition-transform group-hover:scale-[1.02]"
                            loading="lazy"
                          />
                          <span className="block px-2 py-1.5 text-center text-xs text-muted-foreground">
                            Photo {index + 1} · Open full size
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {selected.notes && (
                <div className="space-y-1 rounded-md border p-3">
                  <p className="font-medium">Notes</p>
                  <p className="whitespace-pre-wrap text-muted-foreground">{selected.notes}</p>
                </div>
              )}

              <div className="flex justify-end border-t pt-4">
                <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(selected)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete submission
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && !deleting && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this submission?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the submission and its uploaded photos. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete submission'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/forms"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to forms
    </Link>
  );
}
