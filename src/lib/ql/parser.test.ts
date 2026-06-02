import { describe, it, expect } from 'vitest';
import { parseQuery } from './parser';

describe('parseQuery', () => {
  it('parses a minimal from query with default count metric', () => {
    const { ast, error } = parseQuery('from animals');
    expect(error).toBeNull();
    expect(ast).toEqual({ source: 'animals', filters: [], metric: { kind: 'count' } });
  });

  it('is case-insensitive on keywords but preserves field/value casing', () => {
    const { ast } = parseQuery('FROM animals WHERE status = IN_CARE GROUP BY species SELECT count');
    expect(ast).toMatchObject({
      source: 'animals',
      groupBy: 'species',
      filters: [{ field: 'status', op: '=', values: ['IN_CARE'] }],
      metric: { kind: 'count' },
    });
  });

  it('parses multiple AND filters', () => {
    const { ast } = parseQuery('from animals where status = IN_CARE and sex = female');
    expect(ast?.filters).toEqual([
      { field: 'status', op: '=', values: ['IN_CARE'] },
      { field: 'sex', op: '=', values: ['female'] },
    ]);
  });

  it('parses an in (...) value list', () => {
    const { ast } = parseQuery('from animals where status in (IN_CARE, RELEASED)');
    expect(ast?.filters).toEqual([{ field: 'status', op: 'in', values: ['IN_CARE', 'RELEASED'] }]);
  });

  it('parses != operator', () => {
    const { ast } = parseQuery('from animals where status != DECEASED');
    expect(ast?.filters).toEqual([{ field: 'status', op: '!=', values: ['DECEASED'] }]);
  });

  it('parses since / until and sum metric', () => {
    const { ast } = parseQuery('from animals since 2025-01-01 until 2025-12-31 select sum initialWeightGrams');
    expect(ast).toMatchObject({
      since: '2025-01-01',
      until: '2025-12-31',
      metric: { kind: 'sum', field: 'initialWeightGrams' },
    });
  });

  it('reports a friendly error for an empty query', () => {
    const { ast, error } = parseQuery('');
    expect(ast).toBeNull();
    expect(error).toMatch(/empty/i);
  });

  it('reports an error when the from source is missing', () => {
    const { ast, error } = parseQuery('where status = IN_CARE');
    expect(ast).toBeNull();
    expect(error).toMatch(/from/i);
  });

  it('reports an error for an unterminated in list', () => {
    const { error } = parseQuery('from animals where status in (IN_CARE');
    expect(error).toMatch(/value list|"\)"/i);
  });

  it('reports an error for an unknown clause keyword', () => {
    const { error } = parseQuery('from animals limit 10');
    expect(error).toMatch(/unexpected/i);
  });
});
