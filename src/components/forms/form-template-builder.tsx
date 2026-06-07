'use client';

import { useMemo, useState } from 'react';
import { Archive, ArchiveRestore, GripVertical, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  DndContext, PointerSensor, closestCenter, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  FIELD_TYPE_LABELS, FORM_FIELD_TYPES,
  fieldKeyFromLabel, newFieldId,
  type FormField, type FormFieldType,
} from '@/lib/forms/form-templates';
import { DynamicFormFields } from './dynamic-form-fields';

interface Props {
  initial?: { name: string; fields: FormField[] };
  onSave: (payload: { name: string; fields: FormField[] }) => Promise<void>;
  entityLabel: string;
}

// `_persisted` marks fields that round-tripped from the server, so the builder
// can lock `key`/`type` editing and hide the destructive delete button. Removed
// persisted fields are auto-archived by the server, not deleted.
type DraftField = FormField & { _persisted?: boolean };

function emptyField(type: FormFieldType): DraftField {
  const base = {
    id: newFieldId(),
    key: '',
    label: '',
    required: false,
    archived: false,
    _persisted: false,
  };
  switch (type) {
    case 'select':
    case 'multiselect':
      return { ...base, type, options: ['Option 1'] } as DraftField;
    case 'count':
      return { ...base, type, min: 0 } as DraftField;
    default:
      return { ...base, type } as DraftField;
  }
}

export function FormTemplateBuilder({ initial, onSave, entityLabel }: Props) {
  const [name, setName] = useState(initial?.name ?? `${entityLabel} profile`);
  const [fields, setFields] = useState<DraftField[]>(
    initial?.fields.map((f) => ({ ...f, _persisted: true })) ?? []
  );
  const [saving, setSaving] = useState(false);
  const [previewValues, setPreviewValues] = useState<Record<string, unknown>>({});

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function updateField(id: string, patch: Partial<DraftField>) {
    setFields((prev) => prev.map((f) => (f.id === id ? ({ ...f, ...patch } as DraftField) : f)));
  }

  function addField(type: FormFieldType) {
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

  const fieldsForSubmit = useMemo<FormField[]>(() => {
    return fields.map((f) => {
      const { _persisted: _drop, ...rest } = f;
      void _drop;
      const cleaned: FormField = { ...rest } as FormField;
      if (!cleaned.key && cleaned.label) cleaned.key = fieldKeyFromLabel(cleaned.label);
      if (!cleaned.id) cleaned.id = newFieldId();
      return cleaned;
    });
  }, [fields]);

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Template name is required');
      return;
    }
    const visible = fieldsForSubmit.filter((f) => !f.archived);
    for (const f of visible) {
      if (!f.label.trim()) {
        toast.error('Every field needs a label');
        return;
      }
      if (!f.key) {
        toast.error(`Field "${f.label}" needs a key`);
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
      await onSave({ name: name.trim(), fields: fieldsForSubmit });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Template details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="t-name">Name</Label>
              <Input
                id="t-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`${entityLabel} profile`}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Custom fields</span>
              <Select value="" onValueChange={(v) => addField(v as FormFieldType)}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Add field" />
                </SelectTrigger>
                <SelectContent>
                  {FORM_FIELD_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      <Plus className="mr-2 inline h-3 w-3" />
                      {FIELD_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No custom fields yet. Add fields from the dropdown above.
              </p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
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

        <div className="flex justify-end gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save template'}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Live preview</CardTitle>
            <p className="text-sm text-muted-foreground">
              How the custom-field section will look on the {entityLabel.toLowerCase()} form.
            </p>
          </CardHeader>
          <CardContent>
            <DynamicFormFields
              fields={fieldsForSubmit}
              values={previewValues}
              onChange={setPreviewValues}
            />
          </CardContent>
        </Card>
      </div>
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
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });
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
        <Badge variant="outline">{FIELD_TYPE_LABELS[field.type]}</Badge>
        {field.archived && <Badge variant="outline" className="text-muted-foreground">Archived</Badge>}
        <span className="flex-1 truncate text-sm">{field.label || 'Untitled'}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={toggleArchived}
          title={field.archived ? 'Unarchive' : 'Archive'}
        >
          {field.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
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
          <Label htmlFor={`label-${field.id}`} className="text-xs">Label</Label>
          <Input
            id={`label-${field.id}`}
            value={field.label}
            onChange={(e) => {
              const label = e.target.value;
              if (!isPersisted && !field.key) {
                update({ label, key: fieldKeyFromLabel(label) });
              } else {
                update({ label });
              }
            }}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`key-${field.id}`} className="text-xs">Key (locked after save)</Label>
          <Input
            id={`key-${field.id}`}
            value={field.key}
            onChange={(e) =>
              update({ key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })
            }
            disabled={isPersisted}
          />
        </div>
        <div className="sm:col-span-2 space-y-1">
          <Label htmlFor={`help-${field.id}`} className="text-xs">Help text (optional)</Label>
          <Input
            id={`help-${field.id}`}
            value={field.helpText ?? ''}
            onChange={(e) => update({ helpText: e.target.value || null })}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => update({ required: e.target.checked })}
            className="h-4 w-4"
          />
          Required
        </label>

        {(field.type === 'select' || field.type === 'multiselect') && (
          <OptionsEditor
            options={field.options}
            onChange={(opts) => update({ options: opts } as Partial<DraftField>)}
          />
        )}

        {(field.type === 'number' || field.type === 'integer') && (
          <NumberLimits
            min={field.min}
            max={field.max}
            unit={field.unit}
            onChange={(p) => update(p as Partial<DraftField>)}
          />
        )}

        {field.type === 'count' && (
          <NumberLimits
            min={field.min ?? 0}
            max={field.max}
            onChange={(p) => update(p as Partial<DraftField>)}
          />
        )}
      </div>
    </div>
  );
}

function OptionsEditor({
  options, onChange,
}: { options: string[]; onChange: (next: string[]) => void }) {
  return (
    <div className="sm:col-span-2 space-y-2">
      <Label className="text-xs">Options</Label>
      {options.map((opt, idx) => (
        <div key={idx} className="flex gap-2">
          <Input
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
  min, max, unit, onChange,
}: {
  min?: number; max?: number; unit?: string;
  onChange: (patch: { min?: number; max?: number; unit?: string }) => void;
}) {
  const showUnit = unit !== undefined;
  return (
    <>
      <div className="space-y-1">
        <Label className="text-xs">Min</Label>
        <Input
          type="number"
          value={min ?? ''}
          onChange={(e) =>
            onChange({ min: e.target.value === '' ? undefined : parseFloat(e.target.value) })
          }
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Max</Label>
        <Input
          type="number"
          value={max ?? ''}
          onChange={(e) =>
            onChange({ max: e.target.value === '' ? undefined : parseFloat(e.target.value) })
          }
        />
      </div>
      {showUnit && (
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Unit (optional)</Label>
          <Input
            value={unit ?? ''}
            onChange={(e) => onChange({ unit: e.target.value || undefined })}
            placeholder="e.g. kg, m, hours"
          />
        </div>
      )}
    </>
  );
}
