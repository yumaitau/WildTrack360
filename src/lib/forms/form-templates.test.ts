import { describe, expect, it } from 'vitest';
import {
  buildValuesSchema,
  reconcileFields,
  parseFieldsJson,
  type FormField,
} from './form-templates';

function textField(overrides: Partial<FormField> = {}): FormField {
  return {
    id: 'f1',
    key: 'name',
    label: 'Name',
    required: false,
    archived: false,
    helpText: null,
    type: 'text',
    ...(overrides as object),
  } as FormField;
}

function selectField(options: string[], overrides: Partial<FormField> = {}): FormField {
  return {
    id: 'f2',
    key: 'pref',
    label: 'Preference',
    required: false,
    archived: false,
    helpText: null,
    type: 'select',
    options,
    ...(overrides as object),
  } as FormField;
}

describe('buildValuesSchema', () => {
  it('coerces required text and rejects missing required values', () => {
    const schema = buildValuesSchema([textField({ required: true })]);
    expect(schema.safeParse({ f1: 'Hello' }).success).toBe(true);
    expect(schema.safeParse({}).success).toBe(false);
  });

  it('respects number min/max', () => {
    const schema = buildValuesSchema([
      {
        id: 'n1', key: 'age', label: 'Age', required: true, archived: false, helpText: null,
        type: 'integer', min: 0, max: 120,
      } as FormField,
    ]);
    expect(schema.safeParse({ n1: 18 }).success).toBe(true);
    expect(schema.safeParse({ n1: -1 }).success).toBe(false);
    expect(schema.safeParse({ n1: 200 }).success).toBe(false);
  });

  it('drops archived fields from validation', () => {
    const schema = buildValuesSchema([textField({ archived: true, required: true })]);
    expect(schema.safeParse({}).success).toBe(true);
  });

  it('validates select against allowed options', () => {
    const schema = buildValuesSchema([selectField(['a', 'b'], { required: true })]);
    expect(schema.safeParse({ f2: 'a' }).success).toBe(true);
    expect(schema.safeParse({ f2: 'c' }).success).toBe(false);
  });
});

describe('reconcileFields', () => {
  it('blocks key changes on persisted fields', () => {
    const previous = [textField()];
    const next = [textField({ key: 'renamed' })];
    const result = reconcileFields({ previous, next });
    expect(result.errors.some((e) => e.includes('locked'))).toBe(true);
  });

  it('blocks type changes on persisted fields', () => {
    const previous = [textField()];
    const next = [textField({ type: 'longText' })];
    const result = reconcileFields({ previous, next });
    expect(result.errors.some((e) => e.includes('type is locked'))).toBe(true);
  });

  it('auto-archives removed previously-persisted fields', () => {
    const previous = [textField()];
    const next: FormField[] = [];
    const result = reconcileFields({ previous, next });
    expect(result.errors).toEqual([]);
    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].archived).toBe(true);
  });

  it('blocks dropping a select option that is in use', () => {
    const previous = [selectField(['a', 'b', 'c'])];
    const next = [selectField(['a', 'b'])];
    const used = new Map([['f2', new Set(['c'])]]);
    const result = reconcileFields({ previous, next, usedOptionsByFieldId: used });
    expect(result.errors.some((e) => e.includes("'c'"))).toBe(true);
  });

  it('allows dropping a select option that is not in use', () => {
    const previous = [selectField(['a', 'b', 'c'])];
    const next = [selectField(['a', 'b'])];
    const used = new Map([['f2', new Set<string>()]]);
    const result = reconcileFields({ previous, next, usedOptionsByFieldId: used });
    expect(result.errors).toEqual([]);
  });
});

describe('parseFieldsJson', () => {
  it('returns empty array for non-array input', () => {
    expect(parseFieldsJson(null)).toEqual([]);
    expect(parseFieldsJson('not an array')).toEqual([]);
    expect(parseFieldsJson({ foo: 1 })).toEqual([]);
  });

  it('round-trips a valid field array', () => {
    const fields = [textField()];
    const result = parseFieldsJson(fields);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('name');
  });

  it('rejects array with duplicate keys', () => {
    const fields = [textField(), textField({ id: 'f2' })];
    expect(parseFieldsJson(fields)).toEqual([]);
  });
});
