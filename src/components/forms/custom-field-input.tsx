'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CustomFormField } from '@/lib/forms/custom-forms';

interface CustomFieldInputProps {
  field: CustomFormField;
  value: unknown;
  onChange: (next: unknown) => void;
  error?: string | null;
  disabled?: boolean;
  /** Prefix for element ids so preview + fill instances never collide. */
  idPrefix?: string;
}

// Renders one custom-form field (all 11 types, including species with a
// suggestion datalist). Mirrors FieldRenderer's conventions for the shared
// types, but works against the custom-forms domain model.
export function CustomFieldInput({
  field,
  value,
  onChange,
  error,
  disabled,
  idPrefix = 'cf',
}: CustomFieldInputProps) {
  const controlId = `${idPrefix}-${field.id}`;

  let input: React.ReactNode;

  switch (field.type) {
    case 'text':
      input = (
        <Input
          id={controlId}
          value={(value as string | undefined) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          maxLength={field.maxLength}
        />
      );
      break;

    case 'longText':
      input = (
        <Textarea
          id={controlId}
          value={(value as string | undefined) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          disabled={disabled}
          maxLength={field.maxLength}
        />
      );
      break;

    case 'number':
    case 'integer':
    case 'count': {
      const step = field.type === 'number' ? 'any' : '1';
      const min = field.type === 'count' ? (field.min ?? 0) : field.min;
      input = (
        <div className="flex items-center gap-2">
          <Input
            id={controlId}
            type="number"
            step={step}
            min={min}
            max={field.max}
            value={value === null || value === undefined ? '' : String(value)}
            onChange={(e) => {
              const text = e.target.value;
              if (text === '') {
                onChange(null);
                return;
              }
              const num = field.type === 'number' ? parseFloat(text) : parseInt(text, 10);
              onChange(Number.isFinite(num) ? num : null);
            }}
            disabled={disabled}
          />
          {field.type !== 'count' && field.unit ? (
            <span className="text-sm text-muted-foreground">{field.unit}</span>
          ) : null}
        </div>
      );
      break;
    }

    case 'date':
    case 'datetime':
      input = (
        <Input
          id={controlId}
          type={field.type === 'date' ? 'date' : 'datetime-local'}
          value={(() => {
            if (!value || typeof value !== 'string') return '';
            return field.type === 'date' ? value.slice(0, 10) : value.slice(0, 16);
          })()}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={disabled}
        />
      );
      break;

    case 'boolean':
      input = (
        <div className="flex items-center gap-2">
          <Switch
            id={controlId}
            checked={Boolean(value)}
            onCheckedChange={(checked) => onChange(checked)}
            disabled={disabled}
          />
          <span className="text-sm text-muted-foreground">{value ? 'Yes' : 'No'}</span>
        </div>
      );
      break;

    case 'select':
      input = (
        <Select
          value={(value as string | undefined) ?? ''}
          onValueChange={(v) => onChange(v)}
          disabled={disabled || field.options.length === 0}
        >
          <SelectTrigger id={controlId}>
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
      break;

    case 'multiselect': {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      input = (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {field.options.map((opt) => {
            const checked = selected.includes(opt);
            return (
              <label
                key={opt}
                className="flex items-center gap-2 rounded border bg-background px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={(e) =>
                    onChange(
                      e.target.checked ? [...selected, opt] : selected.filter((s) => s !== opt)
                    )
                  }
                  className="h-4 w-4"
                />
                <span>{opt}</span>
              </label>
            );
          })}
        </div>
      );
      break;
    }

    case 'species': {
      const listId = `${controlId}-suggestions`;
      input = (
        <>
          <Input
            id={controlId}
            list={field.suggestions.length > 0 ? listId : undefined}
            value={(value as string | undefined) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder="Species name"
          />
          {field.suggestions.length > 0 ? (
            <datalist id={listId}>
              {field.suggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          ) : null}
        </>
      );
      break;
    }
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={controlId} className="text-sm font-medium">
        {field.label || 'Untitled field'}
        {field.required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {input}
      {field.helpText ? <p className="text-xs text-muted-foreground">{field.helpText}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
