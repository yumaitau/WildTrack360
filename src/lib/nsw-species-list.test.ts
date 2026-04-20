import { describe, it, expect } from 'vitest';
import {
  NSW_SPECIES,
  isKnownNswSpecies,
  findNswSpeciesByCommonName,
} from './nsw-species-list';

describe('NSW_SPECIES', () => {
  it('contains the full species list from the Detailed Report (~1,668 entries)', () => {
    expect(NSW_SPECIES.length).toBeGreaterThan(1500);
    expect(NSW_SPECIES.length).toBeLessThan(2000);
  });

  it('entries have all required fields', () => {
    const sample = NSW_SPECIES[0];
    expect(sample.commonName).toBeTruthy();
    expect(sample.scientificName).toBeTruthy();
    expect(sample.speciesCode).toBeTruthy();
    expect(sample.class).toBeTruthy();
  });
});

describe('isKnownNswSpecies', () => {
  it('recognises canonical NSW species by common name', () => {
    expect(isKnownNswSpecies('Rainbow Lorikeet')).toBe(true);
    expect(isKnownNswSpecies('Eastern Grey Kangaroo')).toBe(true);
    expect(isKnownNswSpecies('Grey-headed Flying-fox')).toBe(true);
  });

  it('is case-insensitive and whitespace-tolerant', () => {
    expect(isKnownNswSpecies('  rainbow lorikeet  ')).toBe(true);
    expect(isKnownNswSpecies('AUSTRALIAN MAGPIE')).toBe(true);
  });

  it('rejects unknown or malformed names', () => {
    expect(isKnownNswSpecies('Fictional Animal')).toBe(false);
    expect(isKnownNswSpecies('')).toBe(false);
    expect(isKnownNswSpecies(null)).toBe(false);
  });
});

describe('findNswSpeciesByCommonName', () => {
  it('returns the full record including scientific name and code', () => {
    const r = findNswSpeciesByCommonName('Rainbow Lorikeet');
    expect(r).not.toBeNull();
    expect(r!.scientificName).toBe('Trichoglossus haematodus');
    expect(r!.speciesCode).toBe('9947');
    expect(r!.class).toBe('Birds');
  });

  it('returns null for an unknown species', () => {
    expect(findNswSpeciesByCommonName('Fictional Animal')).toBeNull();
    expect(findNswSpeciesByCommonName(null)).toBeNull();
  });
});
