import { describe, it, expect } from 'vitest';
import { parseQuery } from './parser';
import { validateQuery } from './validate';
import type { QueryAST } from './types';

function ast(text: string): QueryAST {
  const { ast, error } = parseQuery(text);
  if (!ast) throw new Error(`parse failed: ${error}`);
  return ast;
}

describe('validateQuery', () => {
  it('accepts a well-formed query against the allowlist', () => {
    expect(validateQuery(ast('from animals where status = IN_CARE group by species select count')).ok).toBe(true);
  });

  it('rejects an unknown source', () => {
    const r = validateQuery(ast('from secrets'));
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/unknown source/i);
  });

  it('rejects an unknown field in group by', () => {
    const r = validateQuery(ast('from animals group by carerId'));
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/unknown field/i);
  });

  // The tenant scoping column must never be addressable as a field.
  it('rejects filtering by the tenant column', () => {
    const r = validateQuery(ast('from animals where clerkOrganizationId = other-org'));
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/unknown field/i);
  });

  it('rejects raw sensitive fields that are not allowlisted', () => {
    expect(validateQuery(ast('from animals group by notes')).ok).toBe(false);
    expect(validateQuery(ast('from animals group by microchipNumber')).ok).toBe(false);
    expect(validateQuery(ast('from animals group by rescueAddress')).ok).toBe(false);
  });

  it('rejects grouping by a non-groupable field', () => {
    const r = validateQuery(ast('from animals group by initialWeightGrams'));
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/cannot be used in "group by"/i);
  });

  it('rejects summing a non-numeric field', () => {
    const r = validateQuery(ast('from animals select sum species'));
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/not numeric/i);
  });

  it('rejects invalid enum values', () => {
    const r = validateQuery(ast('from animals where status = HIBERNATING'));
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/invalid value/i);
  });

  it('rejects malformed dates', () => {
    const r = validateQuery(ast('from animals since 01-01-2025'));
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/invalid "since"/i);
  });

  it('rejects since after until', () => {
    const r = validateQuery(ast('from animals since 2025-12-31 until 2025-01-01'));
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /must not be after/.test(e))).toBe(true);
  });

  it('accepts derived boolean fields', () => {
    expect(validateQuery(ast('from animals where hasNotes = true group by hasPhoto select count')).ok).toBe(true);
  });
});
