import { findNswSpeciesByCommonName } from './nsw-reference-data';

// NSW DCCEEW requires the species picker to use their BioNet-derived Species
// list. When a species is not on that list, carers must select this sentinel
// and supply the full species name in the Notes column of the Datasheet.
export const SPECIES_NOT_LISTED = 'Species not listed' as const;

/**
 * Returns true when the in-progress intake fits a pattern that NSW commonly
 * sees as aggregate/group rescues — bird clutches, reptile hatchlings, or
 * dependent pouch young. NSW requires one Datasheet row per individual, so
 * carers are nudged to create N records rather than a single aggregate row.
 *
 * Triggers (any):
 *   - Bird or Reptile species with lifeStage = "Young" or "Egg"
 *     (nestlings, ducklings, hatchlings — frequently arrive as clutches)
 *   - Pouch condition = Pinkie Attached | Pouch Young | Back Young
 *     (marsupial mothers occasionally admit with twin joeys / back young)
 */
export function isAggregateRiskIntake(input: {
  species: string | null | undefined;
  lifeStage?: string | null;
  pouchCondition?: string | null;
}): boolean {
  const life = (input.lifeStage ?? '').trim().toLowerCase();
  const pouch = (input.pouchCondition ?? '').trim().toLowerCase();

  if (pouch === 'pinkie attached' || pouch === 'pouch young' || pouch === 'back young') {
    return true;
  }

  if (life === 'young' || life === 'egg') {
    const record = findNswSpeciesByCommonName(input.species);
    if (record && (record.class === 'Birds' || record.class === 'Reptiles')) {
      return true;
    }
  }

  return false;
}

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
