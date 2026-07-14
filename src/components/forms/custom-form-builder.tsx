'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Camera,
  CalendarClock,
  CloudSun,
  GripVertical,
  MapPinned,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  customFieldTypes,
  customFieldTypeLabels,
  fieldKeyFromLabel,
  type CustomFieldType,
  type CustomFormDefinition,
  type CustomFormField,
  type CustomFormStatusValue,
} from '@/lib/forms/custom-forms';
import { CustomFieldInput } from './custom-field-input';
import {
  STATUS_BADGE_CLASSES,
  STATUS_LABELS,
  readApiError,
  type ApiIssue,
  type CustomFormRecord,
  type CustomFormVersionRecord,
} from './custom-form-types';

// `_persisted` marks fields that round-tripped from the server, so the builder
// locks `key` editing (exports and sync rely on it) and hides the destructive
// delete button in favour of archiving.
type DraftField = CustomFormField & { _persisted?: boolean };

function newFieldId(): string {
  return crypto.randomUUID();
}

function emptyField(type: CustomFieldType): DraftField {
  const base = {
    id: newFieldId(),
    key: '',
    label: '',
    required: false,
    archived: false,
    helpText: null,
    _persisted: false,
  };

  switch (type) {
    case 'select':
    case 'multiselect':
      return { ...base, type, options: ['Option 1'] } as DraftField;
    case 'species':
      return { ...base, type, suggestions: [] } as DraftField;
    case 'count':
      return { ...base, type, min: 0 } as DraftField;
    default:
      return { ...base, type } as DraftField;
  }
}

const STATUS_DESCRIPTIONS: Record<CustomFormStatusValue, string> = {
  draft: 'Only managers can see this form. It does not accept submissions.',
  published: 'Everyone in the organisation can fill in this form.',
  archived: 'Hidden from everyone and closed to new submissions.',
};

export function CustomFormBuilder({ formId }: { formId: string }) {
  const router = useRouter();
  const [form, setForm] = useState<CustomFormRecord | null>(null);
  const [versions, setVersions] = useState<CustomFormVersionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<CustomFormStatusValue>('draft');
  const [requireLocation, setRequireLocation] = useState(true);
  const [captureDateTime, setCaptureDateTime] = useState(true);
  const [capturePhotos, setCapturePhotos] = useState(true);
  const [captureWeather, setCaptureWeather] = useState(true);
  const [fields, setFields] = useState<DraftField[]>([]);
  const [changeSummary, setChangeSummary] = useState('');
  const [saving, setSaving] = useState(false);
  const [issues, setIssues] = useState<ApiIssue[]>([]);
  const [previewValues, setPreviewValues] = useState<Record<string, unknown>>({});

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const hydrate = useCallback((record: CustomFormRecord) => {
    setForm(record);
    setTitle(record.title);
    setDescription(record.description ?? '');
    setStatus(record.status);
    setRequireLocation(record.schema.requireLocation);
    setCaptureDateTime(record.schema.captureDateTime);
    setCapturePhotos(record.schema.capturePhotos);
    setCaptureWeather(record.schema.captureWeather);
    setFields(record.schema.fields.map((f) => ({ ...f, _persisted: true })));
  }, []);

  const loadVersions = useCallback(async () => {
    const res = await fetch(`/api/custom-forms/${formId}/versions`);
    if (!res.ok) return;
    const body = (await res.json()) as { versions: CustomFormVersionRecord[] };
    setVersions(body.versions ?? []);
  }, [formId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/custom-forms/${formId}`);
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error(await readApiError(res, 'Failed to load form'));
        const record = (await res.json()) as CustomFormRecord;
        if (cancelled) return;
        hydrate(record);
        loadVersions();
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Failed to load form');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formId, hydrate, loadVersions]);

  function updateField(id: string, patch: Partial<DraftField>) {
    setFields((prev) => prev.map((f) => (f.id === id ? ({ ...f, ...patch } as DraftField) : f)));
  }

  function addField(type: CustomFieldType) {
    setFields((prev) => [...prev, emptyField(type)]);
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }

  function toggleArchived(id: string) {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? ({ ...f, archived: !f.archived } as DraftField) : f))
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setFields((prev) => {
      const oldIndex = prev.findIndex((f) => f.id === active.id);
      const newIndex = prev.findIndex((f) => f.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  const fieldsForSubmit = useMemo<CustomFormField[]>(() => {
    return fields.map((f) => {
      const { _persisted: _drop, ...rest } = f;
      void _drop;
      const cleaned = { ...rest } as CustomFormField;
      if (!cleaned.key && cleaned.label) cleaned.key = fieldKeyFromLabel(cleaned.label);
      if (!cleaned.id) cleaned.id = newFieldId();
      return cleaned;
    });
  }, [fields]);

  const definition = useMemo<CustomFormDefinition>(
    () => ({
      version: 1,
      requireLocation,
      captureDateTime,
      capturePhotos,
      captureWeather,
      fields: fieldsForSubmit,
    }),
    [captureDateTime, capturePhotos, captureWeather, fieldsForSubmit, requireLocation]
  );

  async function patchForm(payload: Record<string, unknown>, successMessage: string) {
    const res = await fetch(`/api/custom-forms/${formId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res
        .clone()
        .json()
        .catch(() => ({}) as Record<string, unknown>);
      if (Array.isArray(body.issues)) setIssues(body.issues as ApiIssue[]);
      throw new Error(await readApiError(res, 'Save failed'));
    }
    setIssues([]);
    const record = (await res.json()) as CustomFormRecord;
    toast.success(successMessage);
    return record;
  }

  async function handleSave() {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    const visible = fieldsForSubmit.filter((f) => !f.archived);
    for (const f of visible) {
      if (!f.label.trim()) {
        toast.error('Every field needs a label');
        return;
      }
    }
    const keys = visible.map((f) => f.key);
    const dupe = keys.find((k, i) => keys.indexOf(k) !== i);
    if (dupe) {
      toast.error(`Duplicate field key '${dupe}'`);
      return;
    }

    setSaving(true);
    try {
      const record = await patchForm(
        {
          title: title.trim(),
          description: description.trim() || null,
          status,
          schema: definition,
          changeSummary: changeSummary.trim() || null,
        },
        'Form saved'
      );
      hydrate(record);
      setChangeSummary('');
      loadVersions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickPublishToggle() {
    if (!form) return;
    const next: CustomFormStatusValue = form.status === 'published' ? 'draft' : 'published';
    setSaving(true);
    try {
      const record = await patchForm(
        {
          status: next,
          changeSummary: next === 'published' ? 'Published form' : 'Unpublished form',
        },
        next === 'published' ? 'Form published' : 'Form unpublished'
      );
      // Keep any local edits: only sync the server-owned bits.
      setForm(record);
      setStatus(record.status);
      loadVersions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Status change failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleRollback(version: CustomFormVersionRecord) {
    if (!window.confirm(`Roll back this form to version ${version.version}?`)) return;
    try {
      const res = await fetch(`/api/custom-forms/${formId}/versions/${version.id}/rollback`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Rollback failed'));
      const record = (await res.json()) as CustomFormRecord;
      hydrate(record);
      setChangeSummary('');
      setIssues([]);
      toast.success(`Rolled back to version ${version.version}`);
      loadVersions();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Rollback failed');
    }
  }

  if (loading) {
    return (
      <main className="container mx-auto space-y-4 p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </main>
    );
  }

  if (notFound || !form) {
    return (
      <main className="container mx-auto space-y-4 p-4 sm:p-6 lg:p-8">
        <BackLink />
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            This form could not be found.
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <BackLink />
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-bold tracking-tight">{form.title}</h1>
            <Badge variant="outline" className={STATUS_BADGE_CLASSES[form.status]}>
              {STATUS_LABELS[form.status]}
            </Badge>
            <Badge variant="outline">v{form.currentVersion}</Badge>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleQuickPublishToggle}
          disabled={saving}
          className="shrink-0"
        >
          {form.status === 'published' ? 'Unpublish' : 'Publish'}
        </Button>
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.55fr)]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Form details</CardTitle>
              <CardDescription>Name, description, and availability.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="form-title">Title</Label>
                <Input
                  id="form-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Koala sighting survey"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="form-description">Description</Label>
                <Textarea
                  id="form-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="What this form captures."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="form-status">Availability</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as CustomFormStatusValue)}>
                  <SelectTrigger id="form-status" className="w-full sm:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['draft', 'published', 'archived'] as const).map((option) => (
                      <SelectItem key={option} value={option}>
                        {STATUS_LABELS[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{STATUS_DESCRIPTIONS[status]}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Core capture</CardTitle>
              <CardDescription>
                Standard capture blocks included with every submission.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <CaptureToggle
                id="capture-datetime"
                checked={captureDateTime}
                onChange={setCaptureDateTime}
                title="Capture date & time"
                description="Store when the observation happened."
              />
              <CaptureToggle
                id="capture-location"
                checked={requireLocation}
                onChange={setRequireLocation}
                title="Require location"
                description="Require coordinates from device GPS."
              />
              <CaptureToggle
                id="capture-photos"
                checked={capturePhotos}
                onChange={setCapturePhotos}
                title="Capture photos"
                description="Allow photo URLs with each submission."
              />
              <CaptureToggle
                id="capture-weather"
                checked={captureWeather}
                onChange={setCaptureWeather}
                title="Capture weather"
                description="Record conditions at the time of observation."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Fields</CardTitle>
                  <CardDescription>The values people will record. Drag to reorder.</CardDescription>
                </div>
                <Select value="" onValueChange={(v) => addField(v as CustomFieldType)}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Add field" />
                  </SelectTrigger>
                  <SelectContent>
                    {customFieldTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        <Plus className="mr-2 inline h-3 w-3" />
                        {customFieldTypeLabels[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {fields.length === 0 ? (
                <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                  No fields yet. Add fields from the dropdown above.
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={fields.map((f) => f.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {fields.map((f) => (
                        <FieldEditor
                          key={f.id}
                          field={f}
                          update={(patch) => updateField(f.id, patch)}
                          remove={() => removeField(f.id)}
                          toggleArchived={() => toggleArchived(f.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Version history</CardTitle>
              <CardDescription>
                Saving creates a new version. Rolling back copies an old snapshot into a new
                version, so history is never rewritten.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {versions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No versions saved yet.</p>
              ) : (
                versions.map((version) => (
                  <div
                    key={version.id}
                    className="flex items-center justify-between gap-3 rounded-md border p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">v{version.version}</Badge>
                        <Badge variant="outline" className={STATUS_BADGE_CLASSES[version.status]}>
                          {STATUS_LABELS[version.status]}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {version.changeSummary ?? 'Saved form version'}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(version.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRollback(version)}
                      disabled={version.version === form.currentVersion}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Roll back
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {issues.length > 0 && (
            <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-destructive">The form could not be saved:</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-destructive">
                {issues.map((issue, i) => (
                  <li key={`${issue.path}-${i}`}>
                    <span className="font-mono text-xs">{issue.path}</span>: {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Card>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0 space-y-1.5 sm:flex-1">
                <Label htmlFor="change-summary">Change summary (optional)</Label>
                <Input
                  id="change-summary"
                  value={changeSummary}
                  onChange={(e) => setChangeSummary(e.target.value)}
                  placeholder="Updated release fields"
                />
              </div>
              <Button onClick={handleSave} disabled={saving} className="shrink-0">
                {saving ? 'Saving…' : 'Save new version'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-6 xl:sticky xl:top-24 xl:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Live preview</CardTitle>
              <CardDescription>How the form will look to submitters.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-lg font-semibold">{title || 'Untitled form'}</p>
                {description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                ) : null}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {captureDateTime && (
                  <PreviewChip icon={<CalendarClock className="h-4 w-4" />} title="Date & time" />
                )}
                {requireLocation && (
                  <PreviewChip icon={<MapPinned className="h-4 w-4" />} title="Location" />
                )}
                {capturePhotos && (
                  <PreviewChip icon={<Camera className="h-4 w-4" />} title="Photos" />
                )}
                {captureWeather && (
                  <PreviewChip icon={<CloudSun className="h-4 w-4" />} title="Weather" />
                )}
              </div>
              <div className="space-y-4 rounded-md border p-3">
                {fieldsForSubmit.filter((f) => !f.archived).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No fields.</p>
                ) : (
                  fieldsForSubmit
                    .filter((f) => !f.archived)
                    .map((f) => (
                      <CustomFieldInput
                        key={f.id}
                        field={f}
                        value={previewValues[f.id]}
                        onChange={(next) => setPreviewValues((prev) => ({ ...prev, [f.id]: next }))}
                        disabled
                        idPrefix="preview"
                      />
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
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

function CaptureToggle({
  id,
  checked,
  onChange,
  title,
  description,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border p-3">
      <div className="min-w-0">
        <Label htmlFor={id} className="font-medium">
          {title}
        </Label>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

interface FieldEditorProps {
  field: DraftField;
  update: (patch: Partial<DraftField>) => void;
  remove: () => void;
  toggleArchived: () => void;
}

function FieldEditor({ field, update, remove, toggleArchived }: FieldEditorProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: field.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const isPersisted = field._persisted === true;

  return (
    <div ref={setNodeRef} style={style} className="rounded-md border bg-background">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <Badge variant="outline">{customFieldTypeLabels[field.type]}</Badge>
        {field.archived && (
          <Badge variant="outline" className="text-muted-foreground">
            Archived
          </Badge>
        )}
        <span className="flex-1 truncate text-sm">{field.label || 'Untitled'}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={toggleArchived}
          title={field.archived ? 'Unarchive' : 'Archive'}
        >
          {field.archived ? (
            <ArchiveRestore className="h-4 w-4" />
          ) : (
            <Archive className="h-4 w-4" />
          )}
        </Button>
        {!isPersisted && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={remove}
            title="Remove field"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="grid gap-3 p-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`label-${field.id}`} className="text-xs">
            Label
          </Label>
          <Input
            id={`label-${field.id}`}
            value={field.label}
            onChange={(e) => {
              const label = e.target.value;
              if (!isPersisted) {
                update({ label, key: fieldKeyFromLabel(label) });
              } else {
                update({ label });
              }
            }}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`key-${field.id}`} className="text-xs">
            Key (locked after save)
          </Label>
          <Input
            id={`key-${field.id}`}
            value={field.key}
            onChange={(e) =>
              update({ key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })
            }
            disabled={isPersisted}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor={`help-${field.id}`} className="text-xs">
            Help text (optional)
          </Label>
          <Input
            id={`help-${field.id}`}
            value={field.helpText ?? ''}
            onChange={(e) => update({ helpText: e.target.value || null })}
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id={`required-${field.id}`}
            checked={field.required}
            onCheckedChange={(checked) => update({ required: checked })}
          />
          <Label htmlFor={`required-${field.id}`} className="text-sm font-normal">
            Required
          </Label>
        </div>

        {(field.type === 'text' || field.type === 'longText') && (
          <div className="space-y-1">
            <Label htmlFor={`maxlength-${field.id}`} className="text-xs">
              Max length
            </Label>
            <Input
              id={`maxlength-${field.id}`}
              type="number"
              min={1}
              value={field.maxLength ?? ''}
              onChange={(e) =>
                update({
                  maxLength: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                } as Partial<DraftField>)
              }
            />
          </div>
        )}

        {(field.type === 'select' || field.type === 'multiselect') && (
          <OptionsEditor
            options={field.options}
            onChange={(opts) => update({ options: opts } as Partial<DraftField>)}
          />
        )}

        {(field.type === 'number' || field.type === 'integer' || field.type === 'count') && (
          <NumberLimits field={field} update={update} />
        )}

        {field.type === 'species' && (
          <SuggestionsEditor
            fieldId={field.id}
            suggestions={field.suggestions}
            onChange={(suggestions) => update({ suggestions } as Partial<DraftField>)}
          />
        )}
      </div>
    </div>
  );
}

function OptionsEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="space-y-2 sm:col-span-2">
      <Label className="text-xs">Options</Label>
      {options.map((opt, idx) => (
        <div key={idx} className="flex gap-2">
          <Input
            aria-label={`Option ${idx + 1}`}
            value={opt}
            onChange={(e) => {
              const next = [...options];
              next[idx] = e.target.value;
              onChange(next);
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remove option ${idx + 1}`}
            onClick={() => onChange(options.filter((_, i) => i !== idx))}
            disabled={options.length <= 1}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...options, `Option ${options.length + 1}`])}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add option
      </Button>
    </div>
  );
}

function NumberLimits({
  field,
  update,
}: {
  field: Extract<CustomFormField, { type: 'number' | 'integer' | 'count' }>;
  update: (patch: Partial<DraftField>) => void;
}) {
  return (
    <>
      <div className="space-y-1">
        <Label htmlFor={`min-${field.id}`} className="text-xs">
          Min
        </Label>
        <Input
          id={`min-${field.id}`}
          type="number"
          value={field.min ?? ''}
          onChange={(e) =>
            update({
              min: e.target.value === '' ? undefined : parseFloat(e.target.value),
            } as Partial<DraftField>)
          }
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`max-${field.id}`} className="text-xs">
          Max
        </Label>
        <Input
          id={`max-${field.id}`}
          type="number"
          value={field.max ?? ''}
          onChange={(e) =>
            update({
              max: e.target.value === '' ? undefined : parseFloat(e.target.value),
            } as Partial<DraftField>)
          }
        />
      </div>
      {(field.type === 'number' || field.type === 'integer') && (
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor={`unit-${field.id}`} className="text-xs">
            Unit (optional)
          </Label>
          <Input
            id={`unit-${field.id}`}
            value={field.unit ?? ''}
            onChange={(e) => update({ unit: e.target.value || undefined } as Partial<DraftField>)}
            placeholder="e.g. kg, m, %"
          />
        </div>
      )}
    </>
  );
}

function SuggestionsEditor({
  fieldId,
  suggestions,
  onChange,
}: {
  fieldId: string;
  suggestions: string[];
  onChange: (suggestions: string[]) => void;
}) {
  return (
    <div className="space-y-1 sm:col-span-2">
      <Label htmlFor={`suggestions-${fieldId}`} className="text-xs">
        Species suggestions (one per line)
      </Label>
      <Textarea
        id={`suggestions-${fieldId}`}
        rows={3}
        value={suggestions.join('\n')}
        onChange={(e) =>
          onChange(
            e.target.value
              .split('\n')
              .map((item) => item.trim())
              .filter(Boolean)
          )
        }
      />
    </div>
  );
}

function PreviewChip({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md border p-2 text-sm">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="min-w-0 truncate">{title}</span>
    </div>
  );
}
