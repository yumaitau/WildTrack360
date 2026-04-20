import { Animal } from '@prisma/client';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import {
  NSW_SEX,
  NSW_LIFE_STAGE,
  NSW_POUCH_CONDITION,
  NSW_ANIMAL_CONDITION,
  NSW_ENCOUNTER_TYPE,
  NSW_FATE,
} from './nsw-picklists';
import { NSW_SPECIES } from './nsw-species-list';
import { SPECIES_NOT_LISTED } from './nsw-species';
import { canonicaliseNswLocation } from './nsw-suburbs';

// Prefix applied to a suburb/postcode cell when the pair is not in the NSW
// reference list — signals to the submitter that the value must be
// reconciled against the official NSW template drop-down before emailing.
export const UNVALIDATED_SUBURB_MARKER = '? ';

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
  // Map of CarerProfile.id (Clerk user ID) → display name, used to resolve
  // the Rehabilitator name column. Missing entries fall back to blank.
  rehabilitatorsByCarerId: Record<string, string>;
  // Optional: canonical NSW species list (from the current XLSX template).
  // If omitted, the Species list tab is populated with the distinct species
  // present in `animals` so the user has a starting reference.
  speciesList?: string[];
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

function suburbAndPostcode(suburb?: string | null, postcode?: string | null): string {
  const s = (suburb ?? '').trim();
  const p = (postcode ?? '').trim();
  if (!s && !p) return '';
  // When the pair is in the NSW picklist, emit NSW's canonical
  // "SUBURB - POSTCODE" (uppercase, hyphen) so the export matches the
  // Reference Data column I convention verbatim.
  const canonical = canonicaliseNswLocation(s, p);
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

  constructor(data: NSWDetailedReportData) {
    this.data = data;
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

  private buildDatasheetRow(animal: Animal): (string | number)[] {
    const rescueCoord = parseCoord(animal.rescueCoordinates);
    const releaseCoord = parseCoord(animal.releaseCoordinates);
    const rehabilitator = animal.carerId
      ? this.data.rehabilitatorsByCarerId[animal.carerId] ?? ''
      : '';

    return [
      animal.species ?? '',
      animal.orgAnimalId ?? animal.id,
      formatDate(animal.dateFound),
      animal.encounterType ?? '',
      rescueCoord.lat ?? '',
      rescueCoord.lng ?? '',
      animal.rescueAddress ?? '',
      suburbAndPostcode(animal.rescueSuburb, animal.rescuePostcode),
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
      suburbAndPostcode(animal.releaseSuburb, animal.releasePostcode),
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

    ws.addRow([
      `Detailed Report: ${format(startDate, 'do MMMM yyyy')} to ${format(endDate, 'do MMMM yyyy')}`,
    ]);
    ws.addRow([`Organisation: ${this.data.organization.name}`]);
    ws.addRow([`Licence number: ${this.data.organization.licenseNumber}`]);
    ws.addRow([
      `Suburb/postcode cells prefixed with "${UNVALIDATED_SUBURB_MARKER.trim()}" are not in the NSW reference list — reconcile against the official template picklist before submission.`,
    ]);
    ws.addRow([...DATASHEET_HEADERS]);

    for (const animal of inWindow) {
      ws.addRow(this.buildDatasheetRow(animal));
    }

    ws.columns = DATASHEET_HEADERS.map(() => ({ width: 22 }));
  }

  private addSpeciesListTab(wb: ExcelJS.Workbook) {
    const ws = wb.addWorksheet('Species list');
    ws.addRow(['Species list — NSW DCCEEW Detailed Report reference']);
    ws.addRow([]);
    ws.addRow(['Common name', 'Scientific name', 'Species code']);

    // Callers can pass a curated speciesList to scope the tab (e.g. to only
    // species actually rescued); otherwise emit the full NSW list.
    const fromTemplate = this.data.speciesList;
    if (fromTemplate && fromTemplate.length > 0) {
      for (const name of fromTemplate) {
        ws.addRow([name]);
      }
    } else {
      for (const s of NSW_SPECIES) {
        ws.addRow([s.commonName, s.scientificName, s.speciesCode]);
      }
    }
    ws.addRow([SPECIES_NOT_LISTED]);
    ws.columns = [{ width: 40 }, { width: 40 }, { width: 16 }];
  }

  private addEncounterTypeTab(wb: ExcelJS.Workbook) {
    const ws = wb.addWorksheet('Encounter type');
    ws.addRow(['Encounter type', 'Definition', 'Example']);
    for (const item of NSW_ENCOUNTER_TYPE) {
      ws.addRow([item.value, item.definition ?? '', item.example ?? '']);
    }
    ws.columns = [{ width: 36 }, { width: 60 }, { width: 60 }];
  }

  private addAnimalConditionTab(wb: ExcelJS.Workbook) {
    const ws = wb.addWorksheet('Animal condition');
    ws.addRow(['Animal condition', 'Definition', 'Example']);
    for (const item of NSW_ANIMAL_CONDITION) {
      ws.addRow([item.value, item.definition ?? '', item.example ?? '']);
    }
    ws.columns = [{ width: 32 }, { width: 60 }, { width: 60 }];
  }

  private addFateTab(wb: ExcelJS.Workbook) {
    const ws = wb.addWorksheet('Fate');
    ws.addRow(['Fate', 'Definition', 'Example']);
    for (const item of NSW_FATE) {
      ws.addRow([item.value, item.definition ?? '', item.example ?? '']);
    }
    ws.columns = [{ width: 48 }, { width: 60 }, { width: 60 }];
  }

  private addReferenceDataTab(wb: ExcelJS.Workbook) {
    const ws = wb.addWorksheet('Reference data');
    ws.addRow(['Sex', 'Life stage', 'Pouch condition', 'Weight unit']);
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
    const nodeBuffer = await wb.xlsx.writeBuffer();
    return nodeBuffer as ArrayBuffer;
  }
}
