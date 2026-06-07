'use client';

import { FieldRenderer } from './field-renderer';
import type { FormField } from '@/lib/forms/form-templates';

interface Props {
  fields: FormField[];
  values: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

// Renders every non-archived field from a template, keyed by field id, against
// a single values record. Edit-mode preserves any values that target archived
// fields — they just don't show in the UI.
export function DynamicFormFields({ fields, values, onChange, errors, disabled }: Props) {
  const visible = fields.filter((f) => !f.archived);
  if (visible.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No custom fields configured yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {visible.map((field) => (
        <FieldRenderer
          key={field.id}
          field={field}
          value={values[field.id]}
          error={errors?.[field.id]}
          disabled={disabled}
          onChange={(next) => onChange({ ...values, [field.id]: next })}
        />
      ))}
    </div>
  );
}
