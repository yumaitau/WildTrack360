// Client-side shapes for the custom-forms REST API (serialized by
// src/lib/forms/custom-form-service.ts, which is server-only and can't be
// imported from client components).

import type {
  CustomFormDefinition,
  CustomFormField,
  CustomFormStatusValue,
  WeatherCapture,
} from '@/lib/forms/custom-forms';

export interface CustomFormRecord {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: CustomFormStatusValue;
  currentVersion: number;
  schema: CustomFormDefinition;
  createdAt: string;
  updatedAt: string;
}

export interface CustomFormVersionRecord {
  id: string;
  formId: string;
  version: number;
  changeSummary: string | null;
  title: string;
  status: CustomFormStatusValue;
  schema: CustomFormDefinition;
  createdAt: string;
}

export interface CustomFormSubmissionRecord {
  id: string;
  formId: string;
  formVersion: number;
  submittedByUserId: string;
  /** Enriched server-side by addUserEmailsToResponse. */
  submittedByUserEmail?: string;
  clientSubmissionId: string | null;
  observedAt: string;
  location: {
    latitude: number;
    longitude: number;
    accuracyMeters: number | null;
  } | null;
  photoUrls: string[];
  weather: WeatherCapture | null;
  values: Record<string, unknown>;
  notes: string | null;
  createdAt: string;
}

export interface ApiIssue {
  path: string;
  message: string;
}

export const STATUS_LABELS: Record<CustomFormStatusValue, string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
};

export const STATUS_BADGE_CLASSES: Record<CustomFormStatusValue, string> = {
  draft: 'bg-amber-500/10 text-amber-700 border-amber-200',
  published: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  archived: 'bg-zinc-500/10 text-zinc-600 border-zinc-200',
};

/** Human-readable rendering of a submitted value, driven by the field type. */
export function formatFieldValue(field: CustomFormField, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';

  switch (field.type) {
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'multiselect':
      return Array.isArray(value) ? value.join(', ') : String(value);
    case 'date': {
      const d = new Date(String(value));
      return Number.isNaN(d.valueOf()) ? String(value) : d.toLocaleDateString();
    }
    case 'datetime': {
      const d = new Date(String(value));
      return Number.isNaN(d.valueOf()) ? String(value) : d.toLocaleString();
    }
    case 'number':
    case 'integer': {
      const unit = field.unit ? ` ${field.unit}` : '';
      return `${value}${unit}`;
    }
    default:
      return String(value);
  }
}

/** Read a JSON error body defensively and produce a display message. */
export async function readApiError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body.error === 'string' && body.error) return body.error;
    if (typeof body.message === 'string' && body.message) return body.message;
    if (Array.isArray(body.issues) && body.issues[0]?.message) {
      return String(body.issues[0].message);
    }
  } catch {
    // Ignore malformed bodies.
  }
  return fallback;
}
