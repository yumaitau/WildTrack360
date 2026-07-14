import { describe, expect, it } from 'vitest';

import { csvEscape, exportSubmissionsCsv, exportSubmissionsJson, spreadsheetSafeText } from './custom-form-exports';
import type { SerializedCustomForm, SerializedSubmission } from './custom-form-service';

const form: SerializedCustomForm = {
  id: 'form-1',
  title: 'Koala Survey',
  slug: 'koala-survey',
  description: null,
  status: 'published',
  currentVersion: 2,
  schema: {
    version: 1,
    requireLocation: true,
    captureDateTime: true,
    capturePhotos: true,
    captureWeather: true,
    fields: [
      {
        id: 'f-species',
        key: 'species',
        label: 'Species',
        type: 'species',
        required: true,
        archived: false,
        suggestions: [],
      },
      {
        id: 'f-count',
        key: 'count',
        label: 'Count',
        type: 'count',
        required: false,
        archived: false,
        min: 0,
      },
      {
        id: 'f-old',
        key: 'old',
        label: 'Old',
        type: 'text',
        required: false,
        archived: true,
      },
    ],
  },
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-02T00:00:00.000Z',
};

const submission: SerializedSubmission = {
  id: 'sub-1',
  formId: 'form-1',
  formVersionId: 'ver-2',
  formVersion: 2,
  submittedByUserId: 'user_123',
  clientSubmissionId: 'client-1',
  observedAt: '2026-07-03T04:30:00.000Z',
  location: { latitude: -33.8, longitude: 151.2, accuracyMeters: 8 },
  photoUrls: ['https://example.com/a.jpg'],
  weather: { temperatureCelsius: 18, humidityPct: 60, windDirection: 'NE' },
  values: { 'f-species': 'Koala, juvenile', 'f-count': 2, 'f-old': 'stale' },
  notes: '=SUM(A1)',
  device: null,
  createdAt: '2026-07-03T04:31:00.000Z',
  updatedAt: '2026-07-03T04:31:00.000Z',
};

describe('exportSubmissionsCsv', () => {
  it('includes active field labels as headers and skips archived fields', () => {
    const csv = exportSubmissionsCsv({ form, submissions: [submission] });
    const [header, row] = csv.split('\n');
    expect(header).toContain('Species');
    expect(header).toContain('Count');
    expect(header).not.toContain('Old');
    expect(row).toContain('"Koala, juvenile"');
    expect(row).toContain('user_123');
    expect(row).toContain('https://example.com/a.jpg');
  });

  it('neutralises spreadsheet formula injection', () => {
    const csv = exportSubmissionsCsv({ form, submissions: [submission] });
    expect(csv).toContain("'=SUM(A1)");
    expect(csv).not.toContain(',=SUM(A1)');
  });
});

describe('exportSubmissionsJson', () => {
  it('bundles form metadata with submissions', () => {
    const json = exportSubmissionsJson({ form, submissions: [submission] });
    expect(json.form.id).toBe('form-1');
    expect(json.form.currentVersion).toBe(2);
    expect(json.submissions).toHaveLength(1);
    expect(json.submissions[0].values['f-species']).toBe('Koala, juvenile');
  });
});

describe('csv helpers', () => {
  it('escapes quotes, commas and newlines', () => {
    expect(csvEscape('plain')).toBe('plain');
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape('line\nbreak')).toBe('"line\nbreak"');
  });

  it('prefixes formula-looking values', () => {
    expect(spreadsheetSafeText('+61 400 000 000')).toBe("'+61 400 000 000");
    expect(spreadsheetSafeText('@handle')).toBe("'@handle");
    expect(spreadsheetSafeText('safe')).toBe('safe');
  });
});
