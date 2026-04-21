import { describe, it, expect } from 'vitest';
import {
  DEFAULT_NSW_REPORTING_YEAR,
  SUPPORTED_NSW_REPORTING_YEARS,
  getNswReferenceData,
  NSW_SEX,
  NSW_SPECIES,
  NSW_SUBURB_POSTCODES,
} from './nsw-reference-data';

describe('NSW reference-data dispatcher', () => {
  it('returns FY25-26 data as the current default', () => {
    const data = getNswReferenceData();
    expect(data.year).toBe(DEFAULT_NSW_REPORTING_YEAR);
    expect(data.year).toBe('2025-26');
  });

  it('accepts any supported year explicitly', () => {
    for (const year of SUPPORTED_NSW_REPORTING_YEARS) {
      expect(getNswReferenceData(year).year).toBe(year);
    }
  });

  it('throws for an unsupported reporting year', () => {
    // @ts-expect-error — intentionally passing an unregistered year
    expect(() => getNswReferenceData('1999-00')).toThrow(/Unsupported NSW reporting year/);
  });

  it('convenience exports mirror the default year', () => {
    const defaultData = getNswReferenceData(DEFAULT_NSW_REPORTING_YEAR);
    expect(NSW_SEX).toBe(defaultData.picklists.NSW_SEX);
    expect(NSW_SPECIES).toBe(defaultData.species.NSW_SPECIES);
    expect(NSW_SUBURB_POSTCODES).toBe(defaultData.suburbs.NSW_SUBURB_POSTCODES);
  });
});
