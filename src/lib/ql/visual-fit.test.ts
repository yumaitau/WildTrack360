import { describe, it, expect } from 'vitest';
import { visualFitWarning } from './visual-fit';
import type { QueryResult } from './types';

function rows(...values: { group: string; value: number }[]): Pick<QueryResult, 'rows'> {
  return { rows: values };
}

describe('visualFitWarning', () => {
  it('never warns for a table', () => {
    expect(visualFitWarning('table', rows({ group: 'a', value: 1 }, { group: 'b', value: 2 }))).toBeNull();
  });

  it('warns when a number card has multiple rows', () => {
    expect(visualFitWarning('number', rows({ group: 'a', value: 1 }, { group: 'b', value: 2 }))).toMatch(/single value/i);
    expect(visualFitWarning('number', rows({ group: 'All', value: 5 }))).toBeNull();
  });

  it('warns for pie charts with too many slices', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ group: `g${i}`, value: i + 1 }));
    expect(visualFitWarning('pie', { rows: many })).toMatch(/slices/i);
  });

  it('warns for a single-slice pie', () => {
    expect(visualFitWarning('pie', rows({ group: 'All', value: 5 }))).toMatch(/parts of a whole/i);
  });

  it('warns when a line chart is not grouped by month', () => {
    expect(visualFitWarning('line', rows({ group: 'Possum', value: 2 }, { group: 'Magpie', value: 3 }))).toMatch(
      /over time|month/i
    );
  });

  it('accepts a line chart grouped by month', () => {
    expect(
      visualFitWarning('line', rows({ group: '2025-01', value: 2 }, { group: '2025-02', value: 3 }))
    ).toBeNull();
  });

  it('accepts a reasonable bar chart', () => {
    expect(visualFitWarning('bar', rows({ group: 'a', value: 1 }, { group: 'b', value: 2 }))).toBeNull();
  });
});
