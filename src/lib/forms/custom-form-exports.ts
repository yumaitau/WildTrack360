// CSV / JSON exports for custom form submissions, ported from WildForm360.
// Operates on the serialized shapes so the same code path serves the export
// API route and any future scheduled export job.

import type { CustomFormDefinition, CustomFormField } from './custom-forms';
import type { SerializedCustomForm, SerializedSubmission } from './custom-form-service';

type FieldColumn = {
  key: string;
  field: CustomFormField;
};

export function exportSubmissionsJson({
  form,
  submissions,
}: {
  form: SerializedCustomForm;
  submissions: SerializedSubmission[];
}) {
  return {
    exportedAt: new Date().toISOString(),
    form: {
      id: form.id,
      title: form.title,
      slug: form.slug,
      status: form.status,
      currentVersion: form.currentVersion,
      schema: form.schema,
      versionSchemas: versionSchemasForSubmissions(form, submissions),
    },
    submissions,
  };
}

export function exportSubmissionsCsv({
  form,
  submissions,
}: {
  form: SerializedCustomForm;
  submissions: SerializedSubmission[];
}): string {
  const fields = columnsForSubmissions(form, submissions);
  const fixedHeaders = [
    'Submission ID',
    'Client Submission ID',
    'Submitted By',
    'Observed At',
    'Form Version',
    'Latitude',
    'Longitude',
    'Location Accuracy (m)',
    'Notes',
    'Temperature (C)',
    'Humidity (%)',
    'Wind Direction',
    'Wind Speed (km/h)',
    'Wind Gust (km/h)',
    'Rainfall',
  ];
  const fieldHeaders = fields.map(({ field }) => field.label);
  const trailingHeaders = ['Photo URLs', 'Created At'];
  const header = [...fixedHeaders, ...fieldHeaders, ...trailingHeaders].map(csvEscape).join(',');

  const rows = submissions.map((submission) => {
    const weather = (submission.weather ?? {}) as Record<string, unknown>;
    const cells: string[] = [
      submission.id,
      submission.clientSubmissionId ?? '',
      submission.submittedByUserId,
      submission.observedAt,
      String(submission.formVersion),
      formatNumber(submission.location?.latitude),
      formatNumber(submission.location?.longitude),
      formatNumber(submission.location?.accuracyMeters),
      submission.notes ?? '',
      formatNumber(weather.temperatureCelsius),
      formatNumber(weather.humidityPct),
      typeof weather.windDirection === 'string' ? weather.windDirection : '',
      formatNumber(weather.windSpeedKmh),
      formatNumber(weather.windGustKmh),
      formatNumber(weather.rainfallMm),
    ];

    const submissionFields = new Set(
      schemaForSubmission(form, submission)
        .fields.filter((field) => !field.archived)
        .map(fieldColumnKey)
    );

    for (const { key, field } of fields) {
      cells.push(submissionFields.has(key) ? formatCell(submission.values[field.id]) : '');
    }

    cells.push(submission.photoUrls.join('; '));
    cells.push(submission.createdAt);

    return cells.map(csvEscape).join(',');
  });

  return [header, ...rows].join('\n');
}

export function csvEscape(value: unknown): string {
  const text = spreadsheetSafeText(value);

  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

// Prefix cells that spreadsheet apps would treat as formulas, so a malicious
// submitted value can't execute when the export is opened in Excel.
export function spreadsheetSafeText(value: unknown): string {
  const text = value == null ? '' : String(value);
  const trimmed = text.trim();

  if (/^[+-]?(?:(?:\d+\.?\d*)|(?:\.\d+))(?:[eE][+-]?\d+)?$/.test(trimmed)) {
    return text;
  }

  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

function versionSchemasForSubmissions(
  form: SerializedCustomForm,
  submissions: SerializedSubmission[]
) {
  const versions = new Map<number, CustomFormDefinition>();
  versions.set(form.currentVersion, form.schema);
  for (const submission of submissions) {
    versions.set(submission.formVersion, schemaForSubmission(form, submission));
  }

  return Array.from(versions.entries())
    .sort(([a], [b]) => a - b)
    .map(([version, schema]) => ({ version, schema }));
}

function columnsForSubmissions(
  form: SerializedCustomForm,
  submissions: SerializedSubmission[]
): FieldColumn[] {
  const columns: FieldColumn[] = [];
  const seen = new Set<string>();
  const definitions = [
    form.schema,
    ...submissions.map((submission) => schemaForSubmission(form, submission)),
  ];

  for (const definition of definitions) {
    for (const field of definition.fields) {
      if (field.archived) continue;
      const key = fieldColumnKey(field);
      if (seen.has(key)) continue;
      seen.add(key);
      columns.push({ key, field });
    }
  }

  return columns;
}

function schemaForSubmission(
  form: SerializedCustomForm,
  submission: SerializedSubmission
): CustomFormDefinition {
  return submission.formSchema ?? form.schema;
}

function fieldColumnKey(field: CustomFormField): string {
  return `${field.id}:${field.type}:${field.label}`;
}

function formatCell(value: unknown): string {
  if (value == null) {
    return '';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join('; ');
  }

  return String(value);
}

function formatNumber(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}
