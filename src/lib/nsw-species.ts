// NSW DCCEEW requires the species picker to use their BioNet-derived Species
// list. When a species is not on that list, carers must select this sentinel
// and supply the full species name in the Notes column of the Datasheet.
export const SPECIES_NOT_LISTED = 'Species not listed' as const;

// Compose the Notes column for an animal at intake time.
//
// When the carer picks "Species not listed", NSW mandates the full scientific
// name must appear in Notes. Any free-text notes the carer adds are appended
// after a separator so both the mandated name and the carer's narrative
// survive the submission.
export function composeNotesForSpecies(input: {
  species: string;
  fullSpeciesName?: string | null;
  userNotes?: string | null;
}): string | null {
  const userNotes = (input.userNotes ?? '').trim();
  if (input.species !== SPECIES_NOT_LISTED) {
    return userNotes.length > 0 ? userNotes : null;
  }
  const fullName = (input.fullSpeciesName ?? '').trim();
  if (fullName.length === 0) {
    // Fail closed: a SPECIES_NOT_LISTED record with no full scientific name
    // is non-compliant with NSW reporting (the full name is what makes the
    // sentinel legible). Returning null signals the invalid state so the
    // caller can reject the record or reselect — callers must validate
    // presence before composing notes.
    return null;
  }
  const prefix = `Full species name: ${fullName}`;
  return userNotes.length > 0 ? `${prefix}\n${userNotes}` : prefix;
}
