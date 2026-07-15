import { describe, expect, it } from 'vitest';

import {
  fieldKeyFromLabel,
  normalizeCustomFormPayload,
  normalizeSubmissionPayload,
  parseCustomFormDefinition,
  slugify,
  type CustomFormDefinition,
} from './custom-forms';

const baseDefinition: CustomFormDefinition = {
  version: 1,
  requireLocation: false,
  captureDateTime: true,
  capturePhotos: false,
  captureWeather: false,
  fields: [
    {
      id: 'f-species',
      key: 'species',
      label: 'Species',
      type: 'species',
      required: true,
      archived: false,
      suggestions: ['Koala', 'Eastern Grey Kangaroo'],
    },
    {
      id: 'f-count',
      key: 'count',
      label: 'Count',
      type: 'count',
      required: false,
      archived: false,
      min: 0,
      max: 100,
    },
    {
      id: 'f-condition',
      key: 'condition',
      label: 'Condition',
      type: 'select',
      required: false,
      archived: false,
      options: ['Healthy', 'Injured'],
    },
    {
      id: 'f-old',
      key: 'old_field',
      label: 'Old field',
      type: 'text',
      required: true,
      archived: true,
    },
  ],
};

describe('slug + key helpers', () => {
  it('slugifies titles', () => {
    expect(slugify('Koala Sighting Survey!')).toBe('koala-sighting-survey');
    expect(slugify('   ')).toBe('form');
  });

  it('derives field keys from labels', () => {
    expect(fieldKeyFromLabel('Number of Joeys seen')).toBe('number_of_joeys_seen');
    expect(fieldKeyFromLabel('!!!')).toBe('field');
  });
});

describe('normalizeCustomFormPayload', () => {
  it('creates an empty definition when fields are omitted', () => {
    const result = normalizeCustomFormPayload({
      title: 'Koala Survey',
      description: 'Field survey',
    });

    expect(result.issues).toEqual([]);
    expect(result.data?.definition).toMatchObject({
      requireLocation: true,
      captureDateTime: true,
      capturePhotos: true,
      captureWeather: true,
      fields: [],
    });
  });

  it('normalizes a valid create payload', () => {
    const result = normalizeCustomFormPayload({
      title: 'Koala Survey',
      description: 'Field survey',
      status: 'draft',
      schema: {
        requireLocation: true,
        fields: [{ type: 'text', label: 'Observer name' }],
      },
    });

    expect(result.issues).toEqual([]);
    expect(result.data?.slug).toBe('koala-survey');
    expect(result.data?.status).toBe('draft');
    expect(result.data?.definition.requireLocation).toBe(true);
    expect(result.data?.definition.fields).toHaveLength(1);
    expect(result.data?.definition.fields[0]).toMatchObject({
      type: 'text',
      label: 'Observer name',
      key: 'observer_name',
      required: false,
    });
  });

  it('rejects payloads without a title', () => {
    const result = normalizeCustomFormPayload({ fields: [] });
    expect(result.data).toBeNull();
    expect(result.issues).toContainEqual({ path: 'title', message: 'Title is required.' });
  });

  it('rejects choice fields without options and duplicate keys', () => {
    const result = normalizeCustomFormPayload({
      title: 'Bad form',
      fields: [
        { type: 'select', label: 'Choice', options: [] },
        { type: 'text', label: 'Name' },
        { type: 'text', label: 'Name' },
      ],
    });
    expect(result.data).toBeNull();
    expect(result.issues.some((issue) => issue.path === 'fields.0.options')).toBe(true);
    expect(result.issues.some((issue) => issue.message === 'Field keys must be unique.')).toBe(
      true
    );
  });

  it('accepts field type aliases', () => {
    const result = normalizeCustomFormPayload({
      title: 'Aliases',
      fields: [
        { type: 'yes_no', label: 'Alive' },
        { type: 'multiple_choice', label: 'Habitat', options: ['Bush', 'Urban'] },
      ],
    });
    expect(result.issues).toEqual([]);
    expect(result.data?.definition.fields.map((field) => field.type)).toEqual([
      'boolean',
      'multiselect',
    ]);
  });

  it('patches an existing form without dropping unspecified parts', () => {
    const existing = {
      title: 'Koala Survey',
      slug: 'koala-survey',
      description: 'Field survey',
      status: 'published' as const,
      definition: baseDefinition,
    };
    const result = normalizeCustomFormPayload({ title: 'Koala Survey v2' }, existing);
    expect(result.issues).toEqual([]);
    expect(result.data?.title).toBe('Koala Survey v2');
    expect(result.data?.status).toBe('published');
    expect(result.data?.definition.fields).toHaveLength(4);
  });

  it('allows an explicit null description to clear existing text', () => {
    const existing = {
      title: 'Koala Survey',
      slug: 'koala-survey',
      description: 'Field survey',
      status: 'published' as const,
      definition: baseDefinition,
    };
    const result = normalizeCustomFormPayload({ description: null }, existing);
    expect(result.issues).toEqual([]);
    expect(result.data?.description).toBeNull();
  });

  it('rejects invalid field constraints', () => {
    const result = normalizeCustomFormPayload({
      title: 'Bad constraints',
      fields: [
        { type: 'text', label: 'Name', maxLength: 0 },
        { type: 'number', label: 'Weight', min: 10, max: 5 },
        { type: 'count', label: 'Animals', min: 4, max: 2 },
      ],
    });
    expect(result.data).toBeNull();
    expect(result.issues).toContainEqual({
      path: 'fields.0.maxLength',
      message: 'Max length must be at least 1.',
    });
    expect(
      result.issues.filter((issue) => issue.message === 'Minimum cannot be greater than maximum.')
    ).toHaveLength(2);
  });
});

describe('parseCustomFormDefinition', () => {
  it('recovers a definition from stored JSON', () => {
    const parsed = parseCustomFormDefinition(JSON.parse(JSON.stringify(baseDefinition)));
    expect(parsed.fields).toHaveLength(4);
    expect(parsed.captureDateTime).toBe(true);
  });

  it('falls back to defaults for junk input', () => {
    const parsed = parseCustomFormDefinition('junk');
    expect(parsed.version).toBe(1);
    expect(parsed.fields).toEqual([]);
  });
});

describe('normalizeSubmissionPayload', () => {
  it('accepts a valid submission and coerces types', () => {
    const result = normalizeSubmissionPayload(
      {
        clientSubmissionId: 'client-1',
        observedAt: '2026-07-01T10:00:00.000Z',
        values: {
          species: 'Koala',
          count: '3',
          condition: 'Healthy',
        },
        notes: 'Near the creek',
        device: { platform: 'ios', appVersion: '1.0.0' },
      },
      baseDefinition
    );

    expect(result.issues).toEqual([]);
    expect(result.data?.clientSubmissionId).toBe('client-1');
    expect(result.data?.values['f-species']).toBe('Koala');
    expect(result.data?.values['f-count']).toBe(3);
    // Archived fields never accept new values.
    expect(result.data?.values['f-old']).toBeUndefined();
    expect(result.data?.device?.platform).toBe('ios');
  });

  it('rejects missing required values and invalid options', () => {
    const result = normalizeSubmissionPayload({ values: { condition: 'Unknown' } }, baseDefinition);
    expect(result.data).toBeNull();
    expect(result.issues).toContainEqual({
      path: 'values.species',
      message: 'Species is required.',
    });
    expect(result.issues).toContainEqual({
      path: 'values.condition',
      message: 'Condition has an invalid option.',
    });
  });

  it('enforces location when the form requires it', () => {
    const definition = { ...baseDefinition, requireLocation: true };
    const missing = normalizeSubmissionPayload({ values: { species: 'Koala' } }, definition);
    expect(missing.data).toBeNull();
    expect(missing.issues.some((issue) => issue.path === 'location.latitude')).toBe(true);

    const outOfRange = normalizeSubmissionPayload(
      { values: { species: 'Koala' }, location: { latitude: 120, longitude: 10 } },
      definition
    );
    expect(outOfRange.issues.some((issue) => issue.message === 'Latitude is out of range.')).toBe(
      true
    );

    const ok = normalizeSubmissionPayload(
      {
        values: { species: 'Koala' },
        location: { latitude: -33.8, longitude: 151.2, accuracyMeters: 12 },
      },
      definition
    );
    expect(ok.issues).toEqual([]);
    expect(ok.data?.latitude).toBe(-33.8);
    expect(ok.data?.locationAccuracyMeters).toBe(12);
  });

  it('requires clientSubmissionId when asked (mobile batch sync)', () => {
    const result = normalizeSubmissionPayload({ values: { species: 'Koala' } }, baseDefinition, {
      requireClientSubmissionId: true,
    });
    expect(result.data).toBeNull();
    expect(result.issues.some((issue) => issue.path === 'clientSubmissionId')).toBe(true);
  });

  it('rejects overlong clientSubmissionId values instead of truncating them', () => {
    const result = normalizeSubmissionPayload(
      {
        clientSubmissionId: 'x'.repeat(161),
        values: { species: 'Koala' },
      },
      baseDefinition
    );
    expect(result.data).toBeNull();
    expect(result.issues).toContainEqual({
      path: 'clientSubmissionId',
      message: 'clientSubmissionId must be at most 160 characters.',
    });
  });

  it('rejects invalid supplied observation timestamps', () => {
    const result = normalizeSubmissionPayload(
      { observedAt: 'not-a-date', values: { species: 'Koala' } },
      baseDefinition
    );
    expect(result.data).toBeNull();
    expect(result.issues).toContainEqual({
      path: 'observedAt',
      message: 'Observed date must be valid.',
    });
  });

  it('drops photos unless the form captures them, and validates URLs when it does', () => {
    const noPhotos = normalizeSubmissionPayload(
      { values: { species: 'Koala' }, photoUrls: ['https://example.com/a.jpg'] },
      baseDefinition
    );
    expect(noPhotos.data?.photoUrls).toEqual([]);

    const withPhotos = normalizeSubmissionPayload(
      {
        values: { species: 'Koala' },
        photoUrls: ['https://example.com/a.jpg', 'javascript:alert(1)'],
      },
      { ...baseDefinition, capturePhotos: true }
    );
    expect(withPhotos.data).toBeNull();
    expect(withPhotos.issues.some((issue) => issue.path === 'photoUrls.1')).toBe(true);
  });

  it('captures manual weather only when enabled', () => {
    const result = normalizeSubmissionPayload(
      {
        values: { species: 'Koala' },
        weather: { temperatureCelsius: 21.5, source: 'manual', summary: 'Clear' },
      },
      { ...baseDefinition, captureWeather: true }
    );
    expect(result.issues).toEqual([]);
    expect(result.data?.weather?.temperatureCelsius).toBe(21.5);
    expect(result.data?.weather?.source).toBe('manual');
  });
});
