'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronsUpDown, LocateFixed, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import type { CustomFormField } from '@/lib/forms/custom-forms';
import { CustomFieldInput } from './custom-field-input';
import {
  STATUS_BADGE_CLASSES,
  STATUS_LABELS,
  readApiError,
  type ApiIssue,
  type CustomFormRecord,
} from './custom-form-types';

interface CapturedLocation {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
}

interface WeatherDraft {
  temperatureCelsius: string;
  humidityPct: string;
  windDirection: string;
  windSpeedKmh: string;
  rainfallMm: string;
  summary: string;
}

const EMPTY_WEATHER: WeatherDraft = {
  temperatureCelsius: '',
  humidityPct: '',
  windDirection: '',
  windSpeedKmh: '',
  rainfallMm: '',
  summary: '',
};

function nowForDatetimeInput(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function isEmptyValue(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

export function CustomFormFill({ formId }: { formId: string }) {
  const [form, setForm] = useState<CustomFormRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [values, setValues] = useState<Record<string, unknown>>({});
  const [observedAt, setObservedAt] = useState(nowForDatetimeInput());
  const [location, setLocation] = useState<CapturedLocation | null>(null);
  const [locating, setLocating] = useState(false);
  const [weather, setWeather] = useState<WeatherDraft>(EMPTY_WEATHER);
  const [weatherOpen, setWeatherOpen] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/custom-forms/${formId}`);
        if (res.status === 404) {
          if (!cancelled) setLoadError('This form is not available.');
          return;
        }
        if (!res.ok) throw new Error(await readApiError(res, 'Failed to load form'));
        const record = (await res.json()) as CustomFormRecord;
        if (!cancelled) setForm(record);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Failed to load form');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formId]);

  const visibleFields = useMemo(
    () => (form ? form.schema.fields.filter((f) => !f.archived) : []),
    [form]
  );

  function setValue(fieldId: string, next: unknown) {
    setValues((prev) => ({ ...prev, [fieldId]: next }));
    setFieldErrors((prev) => {
      if (!(fieldId in prev)) return prev;
      const { [fieldId]: _drop, ...rest } = prev;
      void _drop;
      return rest;
    });
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      toast.error('Location is not supported by this browser');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy ?? null,
        });
        setLocating(false);
      },
      (err) => {
        toast.error(`Could not get location: ${err.message}`);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  function buildWeatherPayload() {
    const parsed = {
      temperatureCelsius: weather.temperatureCelsius.trim()
        ? Number(weather.temperatureCelsius)
        : undefined,
      humidityPct: weather.humidityPct.trim() ? Number(weather.humidityPct) : undefined,
      windDirection: weather.windDirection.trim() || undefined,
      windSpeedKmh: weather.windSpeedKmh.trim() ? Number(weather.windSpeedKmh) : undefined,
      rainfallMm: weather.rainfallMm.trim() ? Number(weather.rainfallMm) : undefined,
      summary: weather.summary.trim() || undefined,
    };
    const hasAny = Object.values(parsed).some((v) => v !== undefined);
    return hasAny ? { ...parsed, source: 'manual' as const } : undefined;
  }

  function resetForm() {
    setValues({});
    setObservedAt(nowForDatetimeInput());
    setLocation(null);
    setWeather(EMPTY_WEATHER);
    setPhotoUrls([]);
    setNotes('');
    setFieldErrors({});
    setFormErrors([]);
  }

  function applyIssues(issues: ApiIssue[]) {
    if (!form) return;
    const keyToId = new Map(form.schema.fields.map((f) => [f.key, f.id]));
    const nextFieldErrors: Record<string, string> = {};
    const nextFormErrors: string[] = [];
    for (const issue of issues) {
      const match = /^values\.(.+)$/.exec(issue.path);
      const fieldId = match ? keyToId.get(match[1]) : undefined;
      if (fieldId) {
        nextFieldErrors[fieldId] = issue.message;
      } else {
        nextFormErrors.push(`${issue.path}: ${issue.message}`);
      }
    }
    setFieldErrors(nextFieldErrors);
    setFormErrors(nextFormErrors);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;

    // Client-side required validation before hitting the API.
    const missing: Record<string, string> = {};
    for (const field of visibleFields) {
      if (field.required && isEmptyValue(values[field.id])) {
        missing[field.id] = `${field.label} is required.`;
      }
    }
    if (Object.keys(missing).length > 0) {
      setFieldErrors(missing);
      toast.error('Please fill in the required fields');
      return;
    }
    if (form.schema.requireLocation && !location) {
      toast.error('Location is required — use the "Use my location" button');
      return;
    }

    const invalidPhoto = photoUrls.find((url) => url.trim() && !url.trim().startsWith('https://'));
    if (invalidPhoto) {
      toast.error('Photo URLs must start with https://');
      return;
    }

    setSubmitting(true);
    setFormErrors([]);
    try {
      const payload: Record<string, unknown> = {
        formId: form.id,
        values,
        notes: notes.trim() || undefined,
      };
      if (form.schema.captureDateTime && observedAt) {
        payload.observedAt = new Date(observedAt).toISOString();
      }
      if (location) {
        payload.location = location;
      }
      if (form.schema.capturePhotos) {
        const urls = photoUrls.map((u) => u.trim()).filter(Boolean);
        if (urls.length > 0) payload.photoUrls = urls;
      }
      if (form.schema.captureWeather) {
        const weatherPayload = buildWeatherPayload();
        if (weatherPayload) payload.weather = weatherPayload;
      }

      const res = await fetch('/api/custom-forms/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}) as Record<string, unknown>);

      if (!res.ok || body.status === 'REJECTED') {
        if (Array.isArray(body.issues)) applyIssues(body.issues as ApiIssue[]);
        const message =
          typeof body.message === 'string' && body.message
            ? body.message
            : typeof body.error === 'string' && body.error
              ? body.error
              : 'Submission failed';
        throw new Error(message);
      }

      toast.success('Submission recorded');
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="container mx-auto max-w-2xl space-y-4 p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  if (loadError || !form) {
    return (
      <main className="container mx-auto max-w-2xl space-y-4 p-4 sm:p-6 lg:p-8">
        <BackLink />
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {loadError ?? 'This form is not available.'}
          </CardContent>
        </Card>
      </main>
    );
  }

  if (form.status !== 'published') {
    return (
      <main className="container mx-auto max-w-2xl space-y-4 p-4 sm:p-6 lg:p-8">
        <BackLink />
        <Card>
          <CardContent className="space-y-2 py-12 text-center">
            <Badge variant="outline" className={STATUS_BADGE_CLASSES[form.status]}>
              {STATUS_LABELS[form.status]}
            </Badge>
            <p className="text-sm text-muted-foreground">
              “{form.title}” is not published, so it is not accepting submissions right now.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-2xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <BackLink />
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{form.title}</h1>
        {form.description ? (
          <p className="mt-1 text-sm text-muted-foreground">{form.description}</p>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {(form.schema.captureDateTime || form.schema.requireLocation) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Observation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.schema.captureDateTime && (
                <div className="space-y-1.5">
                  <Label htmlFor="observed-at">Observed at</Label>
                  <Input
                    id="observed-at"
                    type="datetime-local"
                    value={observedAt}
                    onChange={(e) => setObservedAt(e.target.value)}
                  />
                </div>
              )}
              {form.schema.requireLocation && (
                <div className="space-y-1.5">
                  <Label>
                    Location <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={captureLocation}
                      disabled={locating}
                    >
                      <LocateFixed className="mr-2 h-4 w-4" />
                      {locating ? 'Locating…' : location ? 'Update location' : 'Use my location'}
                    </Button>
                    {location ? (
                      <span className="text-sm text-muted-foreground">
                        {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                        {location.accuracyMeters != null
                          ? ` (±${Math.round(location.accuracyMeters)} m)`
                          : ''}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        No location captured yet.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {visibleFields.length === 0 ? (
              <p className="text-sm text-muted-foreground">This form has no fields.</p>
            ) : (
              visibleFields.map((field: CustomFormField) => (
                <CustomFieldInput
                  key={field.id}
                  field={field}
                  value={values[field.id]}
                  onChange={(next) => setValue(field.id, next)}
                  error={fieldErrors[field.id]}
                  idPrefix="fill"
                />
              ))
            )}
          </CardContent>
        </Card>

        {form.schema.capturePhotos && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Photos</CardTitle>
              <CardDescription>
                Paste https photo URLs for now — direct photo upload is coming later.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {photoUrls.map((url, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    aria-label={`Photo URL ${idx + 1}`}
                    value={url}
                    onChange={(e) => {
                      const next = [...photoUrls];
                      next[idx] = e.target.value;
                      setPhotoUrls(next);
                    }}
                    placeholder="https://…"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove photo URL ${idx + 1}`}
                    onClick={() => setPhotoUrls(photoUrls.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPhotoUrls((prev) => [...prev, ''])}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add photo URL
              </Button>
            </CardContent>
          </Card>
        )}

        {form.schema.captureWeather && (
          <Card>
            <Collapsible open={weatherOpen} onOpenChange={setWeatherOpen}>
              <CardHeader>
                <CollapsibleTrigger asChild>
                  <button type="button" className="flex w-full items-center justify-between">
                    <div className="text-left">
                      <CardTitle className="text-base">Weather (optional)</CardTitle>
                      <CardDescription>Record conditions manually.</CardDescription>
                    </div>
                    <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="weather-temp">Temperature (°C)</Label>
                    <Input
                      id="weather-temp"
                      type="number"
                      step="any"
                      value={weather.temperatureCelsius}
                      onChange={(e) =>
                        setWeather((w) => ({ ...w, temperatureCelsius: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="weather-humidity">Humidity (%)</Label>
                    <Input
                      id="weather-humidity"
                      type="number"
                      step="any"
                      value={weather.humidityPct}
                      onChange={(e) => setWeather((w) => ({ ...w, humidityPct: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="weather-wind-dir">Wind direction</Label>
                    <Input
                      id="weather-wind-dir"
                      value={weather.windDirection}
                      onChange={(e) => setWeather((w) => ({ ...w, windDirection: e.target.value }))}
                      placeholder="e.g. NE"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="weather-wind-speed">Wind speed (km/h)</Label>
                    <Input
                      id="weather-wind-speed"
                      type="number"
                      step="any"
                      value={weather.windSpeedKmh}
                      onChange={(e) => setWeather((w) => ({ ...w, windSpeedKmh: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="weather-rainfall">Rainfall (mm)</Label>
                    <Input
                      id="weather-rainfall"
                      type="number"
                      step="any"
                      value={weather.rainfallMm}
                      onChange={(e) => setWeather((w) => ({ ...w, rainfallMm: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="weather-summary">Summary</Label>
                    <Input
                      id="weather-summary"
                      value={weather.summary}
                      onChange={(e) => setWeather((w) => ({ ...w, summary: e.target.value }))}
                      placeholder="e.g. Overcast, light drizzle"
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )}

        <Card>
          <CardContent className="space-y-1.5 p-4">
            <Label htmlFor="submission-notes">Notes</Label>
            <Textarea
              id="submission-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything else worth recording."
            />
          </CardContent>
        </Card>

        {formErrors.length > 0 && (
          <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-destructive">
              The submission could not be saved:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-destructive">
              {formErrors.map((message, i) => (
                <li key={i}>{message}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit'}
          </Button>
        </div>
      </form>
    </main>
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
