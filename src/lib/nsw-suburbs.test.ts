import { describe, it, expect } from 'vitest';
import {
  isKnownNswSuburbPostcode,
  canonicaliseNswLocation,
  validateNswLocation,
  NSW_SUBURB_POSTCODES,
} from './nsw-suburbs';

describe('NSW_SUBURB_POSTCODES', () => {
  it('contains the full NSW picklist (4k+ entries sourced from the Detailed Report)', () => {
    expect(NSW_SUBURB_POSTCODES.length).toBeGreaterThan(4000);
  });

  it('entries use NSW canonical uppercase suburbs', () => {
    expect(NSW_SUBURB_POSTCODES[0].suburb).toBe('AARONS PASS');
  });
});

describe('isKnownNswSuburbPostcode', () => {
  it('recognises a known pair', () => {
    expect(isKnownNswSuburbPostcode('CAMPERDOWN', '2050')).toBe(true);
  });

  it('matches case-insensitively and tolerates whitespace', () => {
    expect(isKnownNswSuburbPostcode('  camperdown  ', '  2050  ')).toBe(true);
    expect(isKnownNswSuburbPostcode('Hornsby', '2077')).toBe(true);
  });

  it('rejects a mismatched postcode', () => {
    expect(isKnownNswSuburbPostcode('Camperdown', '2000')).toBe(false);
  });

  it('rejects empty inputs', () => {
    expect(isKnownNswSuburbPostcode('', '2050')).toBe(false);
    expect(isKnownNswSuburbPostcode('Camperdown', '')).toBe(false);
    expect(isKnownNswSuburbPostcode(null, null)).toBe(false);
  });

  it('rejects a suburb not in NSW', () => {
    expect(isKnownNswSuburbPostcode('Nowheresville', '9999')).toBe(false);
  });
});

describe('canonicaliseNswLocation', () => {
  it('returns the NSW canonical "SUBURB - POSTCODE" form for a known pair', () => {
    expect(canonicaliseNswLocation('Camperdown', '2050')).toBe('CAMPERDOWN - 2050');
  });

  it('is case-insensitive on input', () => {
    expect(canonicaliseNswLocation('camperdown', '2050')).toBe('CAMPERDOWN - 2050');
  });

  it('returns null for an unknown pair', () => {
    expect(canonicaliseNswLocation('Nowheresville', '9999')).toBeNull();
  });

  it('returns null when either field is missing', () => {
    expect(canonicaliseNswLocation('Camperdown', '')).toBeNull();
    expect(canonicaliseNswLocation('', '2050')).toBeNull();
  });
});

describe('validateNswLocation', () => {
  it('returns valid=true for a recognised pair', () => {
    const r = validateNswLocation({ suburb: 'Camperdown', postcode: '2050', state: 'NSW' });
    expect(r.valid).toBe(true);
    expect(r.warning).toBe('');
  });

  it('warns when suburb is missing', () => {
    const r = validateNswLocation({ suburb: '', postcode: '2050' });
    expect(r.valid).toBe(false);
    expect(r.warning).toMatch(/suburb/i);
  });

  it('warns when postcode is missing', () => {
    const r = validateNswLocation({ suburb: 'Camperdown', postcode: '' });
    expect(r.valid).toBe(false);
    expect(r.warning).toMatch(/postcode/i);
  });

  it('warns when state is not NSW', () => {
    const r = validateNswLocation({ suburb: 'Camperdown', postcode: '2050', state: 'VIC' });
    expect(r.valid).toBe(false);
    expect(r.warning).toMatch(/NSW/);
  });

  it('accepts "New South Wales" as equivalent to NSW', () => {
    const r = validateNswLocation({
      suburb: 'Camperdown',
      postcode: '2050',
      state: 'New South Wales',
    });
    expect(r.valid).toBe(true);
  });

  it('warns when the pair is not in the NSW picklist', () => {
    const r = validateNswLocation({ suburb: 'Nowheresville', postcode: '9999', state: 'NSW' });
    expect(r.valid).toBe(false);
    expect(r.warning).toMatch(/picklist/i);
  });
});
