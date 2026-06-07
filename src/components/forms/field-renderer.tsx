'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { FormField } from '@/lib/forms/form-templates';

interface FieldRendererProps {
  field: FormField;
  value: unknown;
  onChange: (next: unknown) => void;
  error?: string | null;
  disabled?: boolean;
}

export function FieldRenderer({ field, value, onChange, error, disabled }: FieldRendererProps) {
  const requiredMark = field.required ? <span className="text-destructive"> *</span> : null;

  let input: React.ReactNode;

  switch (field.type) {
    case 'text':
      input = (
        <Input
          id={field.id}
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
          id={field.id}
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
      const max = field.max;
      input = (
        <div className="flex items-center gap-2">
          <Input
            id={field.id}
            type="number"
            step={step}
            min={min}
            max={max}
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
          {'unit' in field && field.unit ? (
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
          id={field.id}
          type={field.type === 'date' ? 'date' : 'datetime-local'}
          value={(() => {
            if (!value) return '';
            if (value instanceof Date) {
              return field.type === 'date'
                ? value.toISOString().slice(0, 10)
                : value.toISOString().slice(0, 16);
            }
            if (typeof value === 'string') {
              return field.type === 'date' ? value.slice(0, 10) : value.slice(0, 16);
            }
            return '';
          })()}
          onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
          disabled={disabled}
        />
      );
      break;

    case 'boolean':
      input = (
        <label className="flex items-center gap-2">
          <input
            id={field.id}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className="h-4 w-4"
          />
          <span className="text-sm text-muted-foreground">{value ? 'Yes' : 'No'}</span>
        </label>
      );
      break;

    case 'select':
      input = (
        <Select
          value={(value as string | undefined) ?? ''}
          onValueChange={(v) => onChange(v)}
          disabled={disabled}
        >
          <SelectTrigger id={field.id}>
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
      break;

    case 'multiselect': {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      input = (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                      e.target.checked
                        ? [...selected, opt]
                        : selected.filter((s) => s !== opt)
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
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.id} className="text-sm font-medium">
        {field.label}
        {requiredMark}
      </Label>
      {input}
      {field.helpText ? <p className="text-xs text-muted-foreground">{field.helpText}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
