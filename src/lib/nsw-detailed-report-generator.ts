import { Animal, CallLog } from '@prisma/client';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { SPECIES_NOT_LISTED } from './nsw-species';
import {
  DEFAULT_NSW_REPORTING_YEAR,
  NswReportingYear,
  getNswReferenceData,
} from './nsw-reference-data';

// Prefix applied to a suburb/postcode cell when the pair is not in the NSW
// reference list — signals to the submitter that the value must be
// reconciled against the official NSW template drop-down before emailing.
export const UNVALIDATED_SUBURB_MARKER = '? ';

// Families NSW explicitly excludes from the Detailed Report's rescue
// statistics despite appearing in the BioNet species list. Penguins and sea
// snakes are listed in the annual report's "excluded from statistics"
// appendix, so we strip them at emission time even if a carer has logged them.
const NSW_ANNUAL_REPORT_EXCLUDED_FAMILIES: ReadonlySet<string> = new Set([
  'Spheniscidae', // Penguins
  'Hydrophiidae', // Sea snakes
]);

// NSW groups every "Domestic Pet - ..." encounter under a common prefix in
// the Encounter type picklist; rather than pin each suffix we match the
// prefix so new variants added by NSW are excluded automatically.
const DOMESTIC_PET_ENCOUNTER_PREFIX = 'domestic pet';

// Reportability check depends on the year-specific species list, which is
// expensive to re-derive on every call. Cache the derived Sets per year so
// callers can ask about arbitrary historical years without a perf hit.
interface ReportabilitySets {
  reportableNames: ReadonlySet<string>;
  annualReportExcludedNames: ReadonlySet<string>;
}

const reportabilitySetsCache = new Map<NswReportingYear, ReportabilitySets>();

function getReportabilitySets(year: NswReportingYear): ReportabilitySets {
  const cached = reportabilitySetsCache.get(year);
  if (cached) return cached;
  const { species } = getNswReferenceData(year);
  const reportableNames = new Set<string>(
    species.NSW_SPECIES.map((s) => s.commonName.toLowerCase()),
  );
  const annualReportExcludedNames = new Set<string>(
    species.NSW_SPECIES
      .filter((s) => NSW_ANNUAL_REPORT_EXCLUDED_FAMILIES.has(s.familyScientific))
      .map((s) => s.commonName.toLowerCase()),
  );
  const sets: ReportabilitySets = { reportableNames, annualReportExcludedNames };
  reportabilitySetsCache.set(year, sets);
  return sets;
}

export type NswExclusionReason =
  | 'domestic-pet-encounter'
  | 'species-not-in-nsw-list'
  | 'species-excluded-by-annual-report';

/**
 * Returns the NSW-reporting exclusion reason for an Animal, or null if the
 * record is reportable. Reasons cascade in the order NSW DCCEEW applies them:
 * domestic pets first (encounter type signal), then species-list membership,
 * then the annual report's published exclusion list.
 *
 * `year` selects which published picklist the species check runs against —
 * historical reports should pass the year they were filed under.
 */
export function nswExclusionReason(
  animal: {
    species: string | null;
    encounterType: string | null;
  },
  year: NswReportingYear = DEFAULT_NSW_REPORTING_YEAR,
): NswExclusionReason | null {
  const encounter = (animal.encounterType ?? '').trim().toLowerCase();
  if (encounter.startsWith(DOMESTIC_PET_ENCOUNTER_PREFIX)) {
    return 'domestic-pet-encounter';
  }

  const species = (animal.species ?? '').trim();
  // SPECIES_NOT_LISTED is the sentinel carers pick when a valid native
  // species isn't on the BioNet list — the full scientific name is supplied
  // via Notes, so these remain reportable.
  if (species !== SPECIES_NOT_LISTED) {
    const sets = getReportabilitySets(year);
    const key = species.toLowerCase();
    if (!sets.reportableNames.has(key)) {
      return 'species-not-in-nsw-list';
    }
    if (sets.annualReportExcludedNames.has(key)) {
      return 'species-excluded-by-annual-report';
    }
  }

  return null;
}

export const isReportableForNsw = (
  animal: { species: string | null; encounterType: string | null },
  year: NswReportingYear = DEFAULT_NSW_REPORTING_YEAR,
): boolean => nswExclusionReason(animal, year) === null;

export const NSW_EXCLUSION_REASON_LABELS: Record<NswExclusionReason, string> = {
  'domestic-pet-encounter': 'Domestic pet',
  'species-not-in-nsw-list': 'Species not on NSW list',
  'species-excluded-by-annual-report': 'Excluded species (penguins, sea snakes)',
};

export interface NSWDetailedReportData {
  reportingPeriod: {
    startDate: Date;
    endDate: Date;
  };
  organization: {
    name: string;
    licenseNumber: string;
    contactName: string;
  };
  animals: Animal[];
  // Call logs flagged with action = "Advice provided" that did not result in
  // an Animal record (animalId is null). NSW requires every advice-only
  // encounter to appear on the Datasheet with fate = "Advice provided", so
  // the generator unions these rows onto the animal-derived rows. Calls with
  // a linked Animal are already represented via the animal row, so they're
  // skipped to avoid double-counting.
  adviceCallLogs?: CallLog[];
  // Map of CarerProfile.id (Clerk user ID) → display name, used to resolve
  // the Rehabilitator name column. Missing entries fall back to blank.
  rehabilitatorsByCarerId: Record<string, string>;
  // Optional: a curated list of common names to emit on the Species list
  // tab (e.g. to scope it to species actually rescued in the period). When
  // present, the tab is rendered as a single "Common name" column. When
  // omitted, the full authoritative NSW species list is emitted with
  // scientific name and species code columns.
  speciesList?: string[];
  // NSW reporting year whose picklists and species list this report should
  // be generated against. Defaults to DEFAULT_NSW_REPORTING_YEAR (the
  // current FY). Historical reports must pin the year they were filed under
  // so column names and picklist values match what DCCEEW published then.
  reportingYear?: NswReportingYear;
}

// NSW Fate value emitted for advice-only phone calls. Matches the canonical
// NSW_FATE picklist entry exactly so DCCEEW ingest doesn't reject the row.
export const NSW_FATE_ADVICE_PROVIDED = 'Advice provided';

/**
 * True when a CallLog should be emitted as an "Advice provided" Datasheet row:
 *   - action (free text, references CallLogAction lookup) matches the NSW
 *     Fate picklist entry case-insensitively
 *   - the call did not produce an Animal record (otherwise the animal row
 *     already represents the encounter)
 */
export function isAdviceOnlyCallLog(callLog: {
  action: string | null;
  animalId: string | null;
}): boolean {
  if (callLog.animalId) return false;
  const action = (callLog.action ?? '').trim().toLowerCase();
  return action === NSW_FATE_ADVICE_PROVIDED.toLowerCase();
}

interface Coord {
  lat?: number;
  lng?: number;
}

function parseCoord(raw: unknown): Coord {
  if (!raw || typeof raw !== 'object') return {};
  const c = raw as { lat?: unknown; lng?: unknown };
  const lat = typeof c.lat === 'number' ? c.lat : undefined;
  const lng = typeof c.lng === 'number' ? c.lng : undefined;
  return { lat, lng };
}

function suburbAndPostcode(
  canonicalise: (s: string | null | undefined, p: string | null | undefined) => string | null,
  suburb?: string | null,
  postcode?: string | null,
): string {
  const s = (suburb ?? '').trim();
  const p = (postcode ?? '').trim();
  if (!s && !p) return '';
  // When the pair is in the NSW picklist, emit NSW's canonical
  // "SUBURB - POSTCODE" (uppercase, hyphen) so the export matches the
  // Reference Data column I convention verbatim.
  const canonical = canonicalise(s, p);
  if (canonical) return canonical;
  // Otherwise, prefix the original value so the submitter knows this cell
  // needs picklist reconciliation before submission.
  const combined = s && p ? `${s} ${p}` : s || p;
  return `${UNVALIDATED_SUBURB_MARKER}${combined}`;
}

function formatWeight(grams: number | null | undefined, unit: string | null | undefined): string {
  if (grams == null) return '';
  const u = (unit ?? 'g').toLowerCase();
  if (u === 'kg') return `${(grams / 1000).toString()} kg`;
  return `${grams} g`;
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return '';
  return format(d, 'dd/MM/yyyy');
}

export const DATASHEET_HEADERS = [
  'Common name',
  'ID number',
  'Date of encounter',
  'Encounter type',
  'Encounter location: latitude',
  'Encounter location: longitude',
  'Encounter location: address',
  'Encounter location: suburb/town & postcode',
  'Animal condition',
  'Sex',
  'Life stage',
  'Initial weight',
  'Pouch condition',
  'Rehabilitator name',
  'Fate',
  'Date of fate',
  'Release location: latitude',
  'Release location: longitude',
  'Release location: address',
  'Release location: suburb/town & postcode',
  'Tag/Band colour and number',
  'Microchip number',
  'Notes',
] as const;

export class NSWDetailedReportGenerator {
  private data: NSWDetailedReportData;
  private reportingYear: NswReportingYear;
  private referenceData: ReturnType<typeof getNswReferenceData>;

  constructor(data: NSWDetailedReportData) {
    this.data = data;
    this.reportingYear = data.reportingYear ?? DEFAULT_NSW_REPORTING_YEAR;
    this.referenceData = getNswReferenceData(this.reportingYear);
  }

  generateReport(): ExcelJS.Workbook {
    const wb = new ExcelJS.Workbook();

    this.addDatasheet(wb);
    this.addSpeciesListTab(wb);
    this.addEncounterTypeTab(wb);
    this.addAnimalConditionTab(wb);
    this.addFateTab(wb);
    this.addReferenceDataTab(wb);
    this.addPrivacyNotice(wb);

    return wb;
  }

  private buildAdviceCallLogRow(callLog: CallLog): (string | number)[] {
    const coord = parseCoord(callLog.coordinates);
    const canonicalise = this.referenceData.suburbs.canonicaliseNswLocation;
    // Advice-only rows don't have most Datasheet fields — NSW only needs
    // enough to identify an encounter happened. We fill Common name, ID,
    // date, location, and Fate; other columns stay blank per NSW guidance.
    return [
      callLog.species ?? '',
      callLog.id,
      formatDate(callLog.dateTime),
      '', // Encounter type: not applicable to advice-only calls
      coord.lat ?? '',
      coord.lng ?? '',
      callLog.location ?? '',
      suburbAndPostcode(canonicalise, callLog.suburb, callLog.postcode),
      '', // Animal condition
      '', // Sex
      '', // Life stage
      '', // Initial weight
      '', // Pouch condition
      callLog.takenByUserName ?? '',
      NSW_FATE_ADVICE_PROVIDED,
      formatDate(callLog.dateTime),
      '', // Release lat
      '', // Release lng
      '', // Release address
      '', // Release suburb/postcode
      '', // Tag/Band
      '', // Microchip
      callLog.notes ?? '',
    ];
  }

  private buildDatasheetRow(animal: Animal): (string | number)[] {
    const rescueCoord = parseCoord(animal.rescueCoordinates);
    const releaseCoord = parseCoord(animal.releaseCoordinates);
    const rehabilitator = animal.carerId
      ? this.data.rehabilitatorsByCarerId[animal.carerId] ?? ''
      : '';
    const canonicalise = this.referenceData.suburbs.canonicaliseNswLocation;

    // NSW de-dup rule: when an animal was received from another NSW group,
    // emit the originating group's orgAnimalId so the two reports share one
    // ID. Fall back to this org's orgAnimalId then the internal cuid if the
    // source ID is missing (user forgot to capture it at intake).
    const idForDatasheet = animal.interOrgTransferReceived && animal.sourceOrgAnimalId
      ? animal.sourceOrgAnimalId
      : animal.orgAnimalId ?? animal.id;

    return [
      animal.species ?? '',
      idForDatasheet,
      formatDate(animal.dateFound),
      animal.encounterType ?? '',
      rescueCoord.lat ?? '',
      rescueCoord.lng ?? '',
      animal.rescueAddress ?? '',
      suburbAndPostcode(canonicalise, animal.rescueSuburb, animal.rescuePostcode),
      animal.animalCondition ?? '',
      animal.sex ?? '',
      animal.lifeStage ?? '',
      formatWeight(animal.initialWeightGrams, animal.weightUnit),
      animal.pouchCondition ?? '',
      rehabilitator,
      animal.fate ?? '',
      formatDate(animal.outcomeDate),
      releaseCoord.lat ?? '',
      releaseCoord.lng ?? '',
      animal.releaseAddress ?? '',
      suburbAndPostcode(canonicalise, animal.releaseSuburb, animal.releasePostcode),
      animal.tagBandColourNumber ?? '',
      animal.microchipNumber ?? '',
      animal.notes ?? '',
    ];
  }

  private addDatasheet(wb: ExcelJS.Workbook) {
    const ws = wb.addWorksheet('Datasheet');
    const { startDate, endDate } = this.data.reportingPeriod;

    const inWindow = this.data.animals.filter((a) => {
      const d = new Date(a.dateFound);
      return d >= startDate && d <= endDate;
    });
    const reportable = inWindow.filter((a) => isReportableForNsw(a, this.reportingYear));

    // Advice-only call logs travel on the Datasheet alongside animal rows.
    // No reportability (species-list) check is applied: NSW accepts advice
    // calls regardless of species, and the caller's species guess may be
    // vague ("bird", "possum"). Calls already linked to an animalId are
    // skipped via isAdviceOnlyCallLog to avoid double-counting.
    const adviceCalls = (this.data.adviceCallLogs ?? []).filter((c) => {
      if (!isAdviceOnlyCallLog(c)) return false;
      const d = new Date(c.dateTime);
      return d >= startDate && d <= endDate;
    });

    ws.addRow([
      `Detailed Report: ${format(startDate, 'do MMMM yyyy')} to ${format(endDate, 'do MMMM yyyy')}`,
    ]);
    ws.addRow([`Organisation: ${this.data.organization.name}`]);
    ws.addRow([`Licence number: ${this.data.organization.licenseNumber}`]);
    ws.addRow([
      `Suburb/postcode cells prefixed with "${UNVALIDATED_SUBURB_MARKER.trim()}" are not in the NSW reference list — reconcile against the official template picklist before submission.`,
    ]);
    ws.addRow([...DATASHEET_HEADERS]);

    for (const animal of reportable) {
      ws.addRow(this.buildDatasheetRow(animal));
    }
    for (const call of adviceCalls) {
      ws.addRow(this.buildAdviceCallLogRow(call));
    }

    ws.columns = DATASHEET_HEADERS.map(() => ({ width: 22 }));
  }

  private addSpeciesListTab(wb: ExcelJS.Workbook) {
    const ws = wb.addWorksheet('Species list');
    ws.addRow(['Species list — NSW DCCEEW Detailed Report reference']);
    ws.addRow([]);

    // Two emission modes:
    //   - Curated list (string[]): single "Common name" column, one cell
    //     per row — there's no scientific name or code to advertise.
    //   - Default (no curated list): full NSW picklist with common +
    //     scientific names and species code.
    const fromTemplate = this.data.speciesList;
    if (fromTemplate && fromTemplate.length > 0) {
      ws.addRow(['Common name']);
      for (const name of fromTemplate) {
        ws.addRow([name]);
      }
      ws.addRow([SPECIES_NOT_LISTED]);
      ws.columns = [{ width: 40 }];
    } else {
      ws.addRow(['Common name', 'Scientific name', 'Species code']);
      for (const s of this.referenceData.species.NSW_SPECIES) {
        ws.addRow([s.commonName, s.scientificName, s.speciesCode]);
      }
      ws.addRow([SPECIES_NOT_LISTED, '', '']);
      ws.columns = [{ width: 40 }, { width: 40 }, { width: 16 }];
    }
  }

  private addEncounterTypeTab(wb: ExcelJS.Workbook) {
    const ws = wb.addWorksheet('Encounter type');
    ws.addRow(['Encounter type', 'Definition', 'Example']);
    for (const item of this.referenceData.picklists.NSW_ENCOUNTER_TYPE) {
      ws.addRow([item.value, item.definition ?? '', item.example ?? '']);
    }
    ws.columns = [{ width: 36 }, { width: 60 }, { width: 60 }];
  }

  private addAnimalConditionTab(wb: ExcelJS.Workbook) {
    const ws = wb.addWorksheet('Animal condition');
    ws.addRow(['Animal condition', 'Definition', 'Example']);
    for (const item of this.referenceData.picklists.NSW_ANIMAL_CONDITION) {
      ws.addRow([item.value, item.definition ?? '', item.example ?? '']);
    }
    ws.columns = [{ width: 32 }, { width: 60 }, { width: 60 }];
  }

  private addFateTab(wb: ExcelJS.Workbook) {
    const ws = wb.addWorksheet('Fate');
    ws.addRow(['Fate', 'Definition', 'Example']);
    for (const item of this.referenceData.picklists.NSW_FATE) {
      ws.addRow([item.value, item.definition ?? '', item.example ?? '']);
    }
    ws.columns = [{ width: 48 }, { width: 60 }, { width: 60 }];
  }

  private addReferenceDataTab(wb: ExcelJS.Workbook) {
    const ws = wb.addWorksheet('Reference data');
    ws.addRow(['Sex', 'Life stage', 'Pouch condition', 'Weight unit']);
    const { NSW_SEX, NSW_LIFE_STAGE, NSW_POUCH_CONDITION } = this.referenceData.picklists;
    const rows = Math.max(
      NSW_SEX.length,
      NSW_LIFE_STAGE.length,
      NSW_POUCH_CONDITION.length,
      2,
    );
    const weightUnits = ['g', 'kg'];
    for (let i = 0; i < rows; i++) {
      ws.addRow([
        NSW_SEX[i] ?? '',
        NSW_LIFE_STAGE[i] ?? '',
        NSW_POUCH_CONDITION[i] ?? '',
        weightUnits[i] ?? '',
      ]);
    }
    ws.columns = [{ width: 18 }, { width: 18 }, { width: 20 }, { width: 14 }];
  }

  private addPrivacyNotice(wb: ExcelJS.Workbook) {
    const ws = wb.addWorksheet('Privacy notice');
    ws.addRow(['Privacy Notice']);
    ws.addRow([]);
    ws.addRow([
      'The NSW National Parks and Wildlife Service collects the information in this report under ' +
        'section 132H of the National Parks and Wildlife Act 1974. The information is collected for ' +
        'the purpose of monitoring wildlife rehabilitation activities in NSW, evaluating compliance ' +
        'with licence conditions, and informing conservation and management decisions. The supply of ' +
        'this information is mandatory under wildlife rehabilitation licence conditions. NPWS may ' +
        'share this information with other government agencies for conservation and compliance ' +
        'purposes. Personal information will be handled in accordance with the Privacy and Personal ' +
        'Information Protection Act 1998.',
    ]);
    ws.columns = [{ width: 120 }];
  }

  async getReportBuffer(): Promise<ArrayBuffer> {
    const wb = this.generateReport();
    const out = await wb.xlsx.writeBuffer();
    return toArrayBuffer(out);
  }
}

// ExcelJS returns a Node `Buffer` at runtime, but callers consume the result
// as an ArrayBuffer (to wrap in a Blob). Buffer extends Uint8Array, so we
// slice out the underlying ArrayBuffer — a real ArrayBuffer, not a typed
// alias — so the advertised return type is honest.
function toArrayBuffer(input: ExcelJS.Buffer | Buffer | ArrayBuffer): ArrayBuffer {
  if (input instanceof ArrayBuffer) return input;
  const view = input as unknown as Uint8Array;
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer;
}
