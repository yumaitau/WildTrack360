import { describe, it, expect } from 'vitest';
import { parseCustomQuery, getVisualFitWarnings } from './parser';
import { CustomQueryError } from './types';

describe('parseCustomQuery — valid grammar', () => {
  it('parses a plain count', () => {
    const ast = parseCustomQuery('count from incidents');
    expect(ast.operation).toBe('count');
    expect(ast.source).toBe('incidents');
    expect(ast.visualization).toBe('number');
  });

  it('parses count with group by and explicit chart', () => {
    const ast = parseCustomQuery('count from incidents group by severity chart bar');
    expect(ast.operation).toBe('count');
    expect(ast.groupBy).toBe('severity');
    expect(ast.visualization).toBe('bar');
  });

  it('parses sum of a numeric field', () => {
    const ast = parseCustomQuery('sum trainingHours from carer_training group by trainingType chart pie');
    expect(ast.operation).toBe('sum');
    expect(ast.metric).toBe('trainingHours');
    expect(ast.source).toBe('carer_training');
    expect(ast.groupBy).toBe('trainingType');
    expect(ast.visualization).toBe('pie');
  });

  it('parses between, where, group by, trend by, limit and chart together', () => {
    const ast = parseCustomQuery(
      'count from animals between 2026-01-01 and 2026-06-01 where status = IN_CARE group by species trend by foundMonth limit 5 chart line'
    );
    expect(ast.between).toEqual({ start: '2026-01-01', end: '2026-06-01' });
    expect(ast.where).toEqual({ field: 'status', value: 'IN_CARE' });
    expect(ast.groupBy).toBe('species');
    expect(ast.trendBy).toBe('foundMonth');
    expect(ast.limit).toBe(5);
    expect(ast.visualization).toBe('line');
  });

  it('infers line for trend queries and bar for grouped queries', () => {
    expect(parseCustomQuery('count from records trend by recordedDay').visualization).toBe('line');
    expect(parseCustomQuery('count from records group by type').visualization).toBe('bar');
  });

  it('supports quoted where values', () => {
    const ast = parseCustomQuery('count from animals where species = "Eastern Grey Kangaroo"');
    expect(ast.where).toEqual({ field: 'species', value: 'Eastern Grey Kangaroo' });
  });

  it('accepts the "as" alias for chart', () => {
    expect(parseCustomQuery('count from incidents as table').visualization).toBe('table');
  });
});

describe('parseCustomQuery — rejections', () => {
  const expectReject = (q: string) =>
    expect(() => parseCustomQuery(q)).toThrow(CustomQueryError);

  it('rejects unknown sources', () => {
    expectReject('count from dragons');
    expectReject('count from users group by orgId');
  });

  it('rejects unknown fields for group/where/trend', () => {
    expectReject('count from incidents group by orgId');
    expectReject('count from incidents where createdById = user_123');
    expectReject('count from incidents trend by secretField');
  });

  it('rejects summing a non-numeric or unknown field', () => {
    expectReject('sum passwordHash from users');
    expectReject('sum severity from incidents'); // exists but not numeric
  });

  it('rejects SQL-like injection and statement chaining', () => {
    expectReject('count from incidents; delete from incidents');
    expectReject('count from incidents join users');
    expectReject('count from incidents where severity != LOW'); // != not allowed
    expectReject("count from incidents'); drop table incidents;--");
  });

  it('rejects multi-line queries', () => {
    expectReject('count from incidents\ncount from animals');
  });

  it('rejects empty queries', () => {
    expectReject('   ');
  });
});

describe('getVisualFitWarnings', () => {
  it('warns when a grouped query renders as a number', () => {
    const ast = parseCustomQuery('count from incidents group by severity chart number');
    expect(getVisualFitWarnings(ast).some((w) => /single number/i.test(w))).toBe(true);
  });

  it('warns when a line chart lacks a trend field', () => {
    const ast = parseCustomQuery('count from incidents group by severity chart line');
    expect(getVisualFitWarnings(ast).some((w) => /trend by/i.test(w))).toBe(true);
  });

  it('warns that a snapshot source is not true history', () => {
    const ast = parseCustomQuery('count from animals trend by foundMonth chart line');
    expect(getVisualFitWarnings(ast).some((w) => /snapshot/i.test(w))).toBe(true);
  });
});
