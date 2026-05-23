import { describe, expect, it } from 'vitest';
import { mapFirstValidLocation, mapLocation, normaliseCoordinates } from './location-coordinates';

describe('location coordinate helpers', () => {
  it('normalises numeric coordinates', () => {
    expect(normaliseCoordinates({ lat: -35.2809, lng: 149.13 })).toEqual({
      lat: -35.2809,
      lng: 149.13,
    });
  });

  it('normalises string coordinates from JSON payloads', () => {
    expect(normaliseCoordinates({ lat: '-35.2809', lng: '149.1300' })).toEqual({
      lat: -35.2809,
      lng: 149.13,
    });
  });

  it('rejects missing or non-finite coordinates', () => {
    expect(normaliseCoordinates(null)).toBeNull();
    expect(normaliseCoordinates({ lat: -35.2809 })).toBeNull();
    expect(normaliseCoordinates({ lat: 'north', lng: 149.13 })).toBeNull();
    expect(normaliseCoordinates({ lat: Infinity, lng: 149.13 })).toBeNull();
  });

  it('returns a map location with fallback address when text is absent', () => {
    expect(mapLocation({ lat: -35.2809, lng: 149.13 }, null, 'Release location')).toEqual({
      lat: -35.2809,
      lng: 149.13,
      address: 'Release location',
    });
  });

  it('falls through invalid animal coordinates to valid release checklist coordinates', () => {
    expect(
      mapFirstValidLocation(
        [
          { lat: null, lng: null },
          { lat: '-35.3', lng: '149.2' },
        ],
        'Reserve release site',
        'Release location'
      )
    ).toEqual({
      lat: -35.3,
      lng: 149.2,
      address: 'Reserve release site',
    });
  });
});
