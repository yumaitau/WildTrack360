import { describe, it, expect } from 'vitest';
import { SPECIES_NOT_LISTED, composeNotesForSpecies } from './nsw-species';

describe('SPECIES_NOT_LISTED', () => {
  it('matches the NSW-mandated sentinel string exactly', () => {
    expect(SPECIES_NOT_LISTED).toBe('Species not listed');
  });
});

describe('composeNotesForSpecies', () => {
  it('returns null when the species is listed and no notes are provided', () => {
    expect(
      composeNotesForSpecies({
        species: 'Eastern Grey Kangaroo',
        fullSpeciesName: '',
        userNotes: null,
      }),
    ).toBeNull();
  });

  it('passes user notes through unchanged when the species is listed', () => {
    expect(
      composeNotesForSpecies({
        species: 'Eastern Grey Kangaroo',
        fullSpeciesName: 'ignored',
        userNotes: 'Found by the highway',
      }),
    ).toBe('Found by the highway');
  });

  it('encodes the full species name as the first line when sentinel is chosen', () => {
    expect(
      composeNotesForSpecies({
        species: SPECIES_NOT_LISTED,
        fullSpeciesName: "Petaurus notatus (Krefft's glider)",
        userNotes: null,
      }),
    ).toBe("Full species name: Petaurus notatus (Krefft's glider)");
  });

  it('appends user notes after the full species name when both are present', () => {
    const result = composeNotesForSpecies({
      species: SPECIES_NOT_LISTED,
      fullSpeciesName: 'Petaurus notatus',
      userNotes: 'Found by the highway',
    });
    expect(result).toBe('Full species name: Petaurus notatus\nFound by the highway');
  });

  it('trims whitespace from both fields before composing', () => {
    expect(
      composeNotesForSpecies({
        species: SPECIES_NOT_LISTED,
        fullSpeciesName: '  Petaurus notatus  ',
        userNotes: '  Found by the highway  ',
      }),
    ).toBe('Full species name: Petaurus notatus\nFound by the highway');
  });

  it('returns user notes only when sentinel is chosen but full name is blank', () => {
    // Presence is validated separately — helper should not drop user notes.
    expect(
      composeNotesForSpecies({
        species: SPECIES_NOT_LISTED,
        fullSpeciesName: '   ',
        userNotes: 'Context from carer',
      }),
    ).toBe('Context from carer');
  });

  it('returns null when sentinel is chosen and neither field has content', () => {
    expect(
      composeNotesForSpecies({
        species: SPECIES_NOT_LISTED,
        fullSpeciesName: '',
        userNotes: '',
      }),
    ).toBeNull();
  });
});
