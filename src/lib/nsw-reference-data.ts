// Year-aware dispatcher for the NSW DCCEEW reference data.
//
// NSW publishes a new Detailed Report template each financial year. Column
// names, picklist values, and the species list can drift between versions,
// so every reporting module that consumes these vocabularies must do so
// through this dispatcher — never import the year-specific files directly.
//
// Add a new year:
//   1. Run `scripts/extract-nsw-reference-data.ts --year 2026-27` to emit
//      the new files (e.g. `nsw-picklists-fy2627.ts`).
//   2. Register the year here in REFERENCE_DATA_BY_YEAR.
//   3. Update DEFAULT_NSW_REPORTING_YEAR when the new year becomes current.
//
// Old year files stay on disk so historical reports can be regenerated.

import * as fy2526Picklists from './nsw-picklists-fy2526';
import * as fy2526Species from './nsw-species-list-fy2526';
import * as fy2526Suburbs from './nsw-suburbs-fy2526';

export type NswReportingYear = '2025-26';

export const DEFAULT_NSW_REPORTING_YEAR: NswReportingYear = '2025-26';

export const SUPPORTED_NSW_REPORTING_YEARS: readonly NswReportingYear[] = [
  '2025-26',
] as const;

export interface NswReferenceData {
  readonly year: NswReportingYear;
  readonly picklists: typeof fy2526Picklists;
  readonly species: typeof fy2526Species;
  readonly suburbs: typeof fy2526Suburbs;
}

const REFERENCE_DATA_BY_YEAR: Record<NswReportingYear, NswReferenceData> = {
  '2025-26': {
    year: '2025-26',
    picklists: fy2526Picklists,
    species: fy2526Species,
    suburbs: fy2526Suburbs,
  },
};

export function getNswReferenceData(
  year: NswReportingYear = DEFAULT_NSW_REPORTING_YEAR,
): NswReferenceData {
  const data = REFERENCE_DATA_BY_YEAR[year];
  if (!data) {
    throw new Error(
      `Unsupported NSW reporting year "${year}". Supported years: ${SUPPORTED_NSW_REPORTING_YEARS.join(', ')}.`,
    );
  }
  return data;
}

// Convenience re-exports for code that operates strictly on the current NSW
// reporting year (intake forms, live validation). Historical reports must
// still call getNswReferenceData(year) with an explicit year so they pin to
// the right vocabulary. When DEFAULT_NSW_REPORTING_YEAR is bumped, every
// consumer of these exports follows automatically.
const current = getNswReferenceData();

export const {
  NSW_SEX,
  NSW_LIFE_STAGE,
  NSW_POUCH_CONDITION,
  NSW_ANIMAL_CONDITION,
  NSW_ENCOUNTER_TYPE,
  NSW_FATE,
  isKnownNswSex,
  isKnownNswLifeStage,
  isKnownNswPouchCondition,
  isKnownNswAnimalCondition,
  isKnownNswEncounterType,
  isKnownNswFate,
} = current.picklists;

export type { NswPicklistItem } from './nsw-picklists-fy2526';

export const {
  NSW_SPECIES,
  isKnownNswSpecies,
  findNswSpeciesByCommonName,
} = current.species;

export type { NswSpeciesRecord } from './nsw-species-list-fy2526';

export const {
  NSW_SUBURB_POSTCODES,
  isKnownNswSuburbPostcode,
  canonicaliseNswLocation,
  validateNswLocation,
} = current.suburbs;

export type {
  NswSuburbRecord,
  NswLocationValidation,
} from './nsw-suburbs-fy2526';
