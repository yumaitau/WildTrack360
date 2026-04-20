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
    // The caller is responsible for validating presence — this helper still
    // returns the user notes so we don't silently drop them.
    return userNotes.length > 0 ? userNotes : null;
  }
  const prefix = `Full species name: ${fullName}`;
  return userNotes.length > 0 ? `${prefix}\n${userNotes}` : prefix;
}
