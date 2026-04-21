import { describe, it, expect } from 'vitest';
import type { Animal, CallLog } from '@prisma/client';
import {
  NSWDetailedReportGenerator,
  NSWDetailedReportData,
  DATASHEET_HEADERS,
  isReportableForNsw,
  nswExclusionReason,
  isAdviceOnlyCallLog,
  NSW_FATE_ADVICE_PROVIDED,
} from './nsw-detailed-report-generator';
import { NSW_FATE, NSW_ANIMAL_CONDITION, NSW_ENCOUNTER_TYPE } from './nsw-reference-data';
import { SPECIES_NOT_LISTED } from './nsw-species';

function makeCallLog(overrides: Partial<CallLog> = {}): CallLog {
  const base: CallLog = {
    id: 'call-1',
    dateTime: new Date(2025, 7, 20),
    status: 'RESOLVED' as any,
    callerName: 'Member of Public',
    callerPhone: '0400000000',
    callerEmail: null,
    species: 'Tawny Frogmouth',
    location: '14 Example St',
    coordinates: { lat: -33.9, lng: 151.2 } as any,
    suburb: 'Camperdown',
    postcode: '2050',
    notes: 'Bird stunned after window collision; callback arranged.',
    reason: null,
    referrer: null,
    action: 'Advice provided',
    outcome: null,
    takenByUserId: 'user-1',
    takenByUserName: 'Jane Carer',
    assignedToUserId: null,
    assignedToUserName: null,
    animalId: null,
    clerkOrganizationId: 'org-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return { ...base, ...overrides };
}

function makeAnimal(overrides: Partial<Animal> = {}): Animal {
  const base: Animal = {
    id: 'cuid-1',
    name: 'Skippy',
    species: 'Eastern Grey Kangaroo',
    sex: 'Female',
    ageClass: null,
    age: null,
    dateOfBirth: null,
    status: 'IN_CARE',
    // Local-date constructors keep dd/MM/yyyy formatting stable across
    // CI timezones (UTC-midnight strings flip days in western zones).
    dateFound: new Date(2025, 7, 15),
    dateReleased: null,
    outcomeDate: null,
    outcome: null,
    photo: null,
    notes: 'Rescued from roadside',
    rescueLocation: 'Near Parramatta Rd',
    rescueCoordinates: { lat: -33.86, lng: 151.21 } as any,
    rescueAddress: '123 Parramatta Rd',
    rescueSuburb: 'Camperdown',
    rescuePostcode: '2050',
    releaseLocation: null,
    releaseCoordinates: null,
    releaseNotes: null,
    releaseAddress: null,
    releaseSuburb: null,
    releasePostcode: null,
    encounterType: 'Collision – motor vehicle',
    initialWeightGrams: 450,
    weightUnit: 'g',
    animalCondition: 'Dehydrated',
    pouchCondition: 'Pouch young',
    fate: 'In care',
    tagBandColourNumber: 'Blue-A12',
    microchipNumber: null,
    lifeStage: 'Young',
    dateAdmitted: null,
    orgAnimalId: 'WT-2025-0001',
    outcomeReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    clerkUserId: 'user-1',
    clerkOrganizationId: 'org-1',
    carerId: 'carer-1',
    sourceOrgAnimalId: null,
    interOrgTransferReceived: false,
  } as Animal;
  return { ...base, ...overrides };
}

function baseData(animals: Animal[]): NSWDetailedReportData {
  return {
    reportingPeriod: {
      startDate: new Date(2025, 6, 1),
      endDate: new Date(2026, 5, 30, 23, 59, 59),
    },
    organization: {
      name: 'Wildlife Rescue NSW',
      licenseNumber: 'MWL000100088',
      contactName: 'Jane Carer',
    },
    animals,
    rehabilitatorsByCarerId: { 'carer-1': 'Jane Carer' },
  };
}

describe('NSWDetailedReportGenerator', () => {
  it('emits the exact NSW column headers on the Datasheet tab', async () => {
    const gen = new NSWDetailedReportGenerator(baseData([]));
    const wb = gen.generateReport();
    const ws = wb.getWorksheet('Datasheet')!;
    const headerRow = ws.getRow(5).values as (string | undefined)[];
    // values is 1-indexed in ExcelJS
    const actual = headerRow.slice(1, DATASHEET_HEADERS.length + 1);
    expect(actual).toEqual([...DATASHEET_HEADERS]);
  });

  it('maps an animal record into the Datasheet in NSW column order', async () => {
    const animal = makeAnimal();
    const gen = new NSWDetailedReportGenerator(baseData([animal]));
    const wb = gen.generateReport();
    const ws = wb.getWorksheet('Datasheet')!;
    const row = ws.getRow(6).values as (string | number | undefined)[];

    expect(row[1]).toBe('Eastern Grey Kangaroo');
    expect(row[2]).toBe('WT-2025-0001');
    expect(row[3]).toBe('15/08/2025');
    expect(row[4]).toBe('Collision – motor vehicle');
    expect(row[5]).toBe(-33.86);
    expect(row[6]).toBe(151.21);
    expect(row[7]).toBe('123 Parramatta Rd');
    expect(row[8]).toBe('CAMPERDOWN - 2050');
    expect(row[9]).toBe('Dehydrated');
    expect(row[10]).toBe('Female');
    expect(row[11]).toBe('Young');
    expect(row[12]).toBe('450 g');
    expect(row[13]).toBe('Pouch young');
    expect(row[14]).toBe('Jane Carer');
    expect(row[15]).toBe('In care');
    expect(row[21]).toBe('Blue-A12');
    expect(row[22]).toBe('');
  });

  it('emits microchip number into the separate Microchip column', async () => {
    const animal = makeAnimal({
      tagBandColourNumber: null,
      microchipNumber: '982000123456789',
    });
    const gen = new NSWDetailedReportGenerator(baseData([animal]));
    const wb = gen.generateReport();
    const row = wb.getWorksheet('Datasheet')!.getRow(6).values as (string | number)[];
    expect(row[21]).toBe('');
    expect(row[22]).toBe('982000123456789');
    expect(row[23]).toBe('Rescued from roadside');
  });

  it('formats release date and coordinates when fate is Released', async () => {
    const animal = makeAnimal({
      fate: 'Released',
      outcomeDate: new Date(2025, 9, 2),
      releaseAddress: 'Bush Reserve',
      releaseSuburb: 'Hornsby',
      releasePostcode: '2077',
      releaseCoordinates: { lat: -33.7, lng: 151.1 } as any,
    });
    const gen = new NSWDetailedReportGenerator(baseData([animal]));
    const wb = gen.generateReport();
    const ws = wb.getWorksheet('Datasheet')!;
    const row = ws.getRow(6).values as (string | number | undefined)[];

    expect(row[15]).toBe('Released');
    expect(row[16]).toBe('02/10/2025');
    expect(row[17]).toBe(-33.7);
    expect(row[18]).toBe(151.1);
    expect(row[19]).toBe('Bush Reserve');
    expect(row[20]).toBe('HORNSBY - 2077');
  });

  it('converts kg weights correctly', async () => {
    const animal = makeAnimal({ initialWeightGrams: 2500, weightUnit: 'kg' });
    const gen = new NSWDetailedReportGenerator(baseData([animal]));
    const wb = gen.generateReport();
    const row = wb.getWorksheet('Datasheet')!.getRow(6).values as (string | number)[];
    expect(row[12]).toBe('2.5 kg');
  });

  it('filters animals whose dateFound is outside the reporting period', async () => {
    const inWindow = makeAnimal({ id: 'a-in', orgAnimalId: 'IN', dateFound: new Date(2025, 8, 1) });
    const before = makeAnimal({ id: 'a-before', orgAnimalId: 'BEFORE', dateFound: new Date(2024, 5, 1) });
    const after = makeAnimal({ id: 'a-after', orgAnimalId: 'AFTER', dateFound: new Date(2027, 0, 1) });
    const gen = new NSWDetailedReportGenerator(baseData([inWindow, before, after]));
    const wb = gen.generateReport();
    const ws = wb.getWorksheet('Datasheet')!;
    // Headers on row 5, data starts at row 6. Only one row should be present.
    expect(ws.getRow(6).getCell(2).value).toBe('IN');
    expect(ws.getRow(7).getCell(2).value).toBeFalsy();
  });

  it('leaves rehabilitator blank when carerId is not in the map', async () => {
    const animal = makeAnimal({ carerId: 'unknown-carer' });
    const gen = new NSWDetailedReportGenerator(baseData([animal]));
    const wb = gen.generateReport();
    const row = wb.getWorksheet('Datasheet')!.getRow(6).values as (string | number)[];
    expect(row[14]).toBe('');
  });

  it('Species list tab contains the "Species not listed" sentinel', async () => {
    const gen = new NSWDetailedReportGenerator(baseData([makeAnimal()]));
    const wb = gen.generateReport();
    const ws = wb.getWorksheet('Species list')!;
    const lastRow = ws.lastRow!;
    expect(lastRow.getCell(1).value).toBe('Species not listed');
  });

  it('Encounter type tab lists every NSW_ENCOUNTER_TYPE value with definition', async () => {
    const gen = new NSWDetailedReportGenerator(baseData([]));
    const wb = gen.generateReport();
    const ws = wb.getWorksheet('Encounter type')!;
    const values: string[] = [];
    ws.eachRow((row, rowNumber) => {
      if (rowNumber <= 1) return;
      const v = row.getCell(1).value;
      if (typeof v === 'string') values.push(v);
    });
    expect(values).toEqual(NSW_ENCOUNTER_TYPE.map((i) => i.value));
    // Confirm definition/example columns are populated
    expect(ws.getRow(2).getCell(2).value).toBeTruthy();
  });

  it('Fate tab lists every NSW_FATE value', async () => {
    const gen = new NSWDetailedReportGenerator(baseData([]));
    const wb = gen.generateReport();
    const ws = wb.getWorksheet('Fate')!;
    const values: string[] = [];
    ws.eachRow((row, rowNumber) => {
      if (rowNumber <= 1) return;
      const v = row.getCell(1).value;
      if (typeof v === 'string') values.push(v);
    });
    expect(values).toEqual(NSW_FATE.map((i) => i.value));
  });

  it('Animal condition tab lists every NSW_ANIMAL_CONDITION value', async () => {
    const gen = new NSWDetailedReportGenerator(baseData([]));
    const wb = gen.generateReport();
    const ws = wb.getWorksheet('Animal condition')!;
    const values: string[] = [];
    ws.eachRow((row, rowNumber) => {
      if (rowNumber <= 1) return;
      const v = row.getCell(1).value;
      if (typeof v === 'string') values.push(v);
    });
    expect(values).toEqual(NSW_ANIMAL_CONDITION.map((i) => i.value));
  });

  it('Species list tab defaults to the full NSW species list', async () => {
    const gen = new NSWDetailedReportGenerator(baseData([]));
    const wb = gen.generateReport();
    const ws = wb.getWorksheet('Species list')!;
    // Headers on row 3, data starts at row 4; expect > 1000 entries from NSW
    expect(ws.rowCount).toBeGreaterThan(1000);
    // Row 4: first species should include scientific name in col B
    expect(ws.getRow(4).getCell(2).value).toBeTruthy();
  });

  it('prefixes unknown suburb/postcode with the unvalidated marker', async () => {
    const animal = makeAnimal({ rescueSuburb: 'Nowheresville', rescuePostcode: '9999' });
    const gen = new NSWDetailedReportGenerator(baseData([animal]));
    const wb = gen.generateReport();
    const row = wb.getWorksheet('Datasheet')!.getRow(6).values as (string | number)[];
    expect(row[8]).toBe('? Nowheresville 9999');
  });

  it('does not prefix a recognised suburb/postcode', async () => {
    const animal = makeAnimal(); // defaults to Camperdown 2050 which is in the list
    const gen = new NSWDetailedReportGenerator(baseData([animal]));
    const wb = gen.generateReport();
    const row = wb.getWorksheet('Datasheet')!.getRow(6).values as (string | number)[];
    expect(row[8]).toBe('CAMPERDOWN - 2050');
  });

  describe('NSW reportability filter', () => {
    it('reports native species on the NSW list', () => {
      const animal = makeAnimal({ species: 'Eastern Grey Kangaroo' });
      expect(isReportableForNsw(animal)).toBe(true);
      expect(nswExclusionReason(animal)).toBeNull();
    });

    it('excludes species not on the NSW list (e.g. domestic pet breeds)', () => {
      const animal = makeAnimal({ species: 'Domestic Rabbit' });
      expect(isReportableForNsw(animal)).toBe(false);
      expect(nswExclusionReason(animal)).toBe('species-not-in-nsw-list');
    });

    it('reports SPECIES_NOT_LISTED sentinel (full name supplied in notes)', () => {
      const animal = makeAnimal({ species: SPECIES_NOT_LISTED });
      expect(isReportableForNsw(animal)).toBe(true);
    });

    it('excludes Domestic Pet encounters regardless of species', () => {
      const animal = makeAnimal({
        species: 'Eastern Grey Kangaroo',
        encounterType: 'Domestic Pet - Surrendered',
      });
      expect(isReportableForNsw(animal)).toBe(false);
      expect(nswExclusionReason(animal)).toBe('domestic-pet-encounter');
    });

    it('excludes penguins per NSW annual report policy', () => {
      const animal = makeAnimal({ species: 'Little Penguin' });
      expect(isReportableForNsw(animal)).toBe(false);
      expect(nswExclusionReason(animal)).toBe('species-excluded-by-annual-report');
    });

    it('excludes sea snakes per NSW annual report policy', () => {
      const animal = makeAnimal({ species: 'Unidentified Seasnake' });
      expect(isReportableForNsw(animal)).toBe(false);
      expect(nswExclusionReason(animal)).toBe('species-excluded-by-annual-report');
    });

    it('skips excluded animals when emitting the Datasheet', async () => {
      const kangaroo = makeAnimal({ id: 'k', orgAnimalId: 'KROO', species: 'Eastern Grey Kangaroo' });
      const rabbit = makeAnimal({ id: 'r', orgAnimalId: 'RABBIT', species: 'Domestic Rabbit' });
      const penguin = makeAnimal({ id: 'p', orgAnimalId: 'PENG', species: 'Little Penguin' });
      const gen = new NSWDetailedReportGenerator(baseData([kangaroo, rabbit, penguin]));
      const wb = gen.generateReport();
      const ws = wb.getWorksheet('Datasheet')!;
      // Only kangaroo lands on the Datasheet (row 6), next row is empty.
      expect(ws.getRow(6).getCell(2).value).toBe('KROO');
      expect(ws.getRow(7).getCell(2).value).toBeFalsy();
    });
  });

  describe('Inter-org transfer ID propagation', () => {
    it('emits the originating org\'s Animal ID when inter-org transfer is flagged', async () => {
      const animal = makeAnimal({
        orgAnimalId: 'RECEIVER-0042',
        sourceOrgAnimalId: 'WIRES-2025-0001',
        interOrgTransferReceived: true,
      });
      const gen = new NSWDetailedReportGenerator(baseData([animal]));
      const wb = gen.generateReport();
      const row = wb.getWorksheet('Datasheet')!.getRow(6).values as (string | number)[];
      expect(row[2]).toBe('WIRES-2025-0001');
    });

    it('falls back to this org\'s orgAnimalId when inter-org flag is on but source ID missing', async () => {
      const animal = makeAnimal({
        orgAnimalId: 'RECEIVER-0042',
        sourceOrgAnimalId: null,
        interOrgTransferReceived: true,
      });
      const gen = new NSWDetailedReportGenerator(baseData([animal]));
      const wb = gen.generateReport();
      const row = wb.getWorksheet('Datasheet')!.getRow(6).values as (string | number)[];
      expect(row[2]).toBe('RECEIVER-0042');
    });

    it('ignores the source ID when the animal was not received inter-org', async () => {
      const animal = makeAnimal({
        orgAnimalId: 'LOCAL-0001',
        sourceOrgAnimalId: 'STALE-DATA',
        interOrgTransferReceived: false,
      });
      const gen = new NSWDetailedReportGenerator(baseData([animal]));
      const wb = gen.generateReport();
      const row = wb.getWorksheet('Datasheet')!.getRow(6).values as (string | number)[];
      expect(row[2]).toBe('LOCAL-0001');
    });
  });

  describe('Advice-only call log emission', () => {
    it('isAdviceOnlyCallLog matches action="Advice provided" with no linked animal', () => {
      expect(isAdviceOnlyCallLog(makeCallLog())).toBe(true);
    });

    it('isAdviceOnlyCallLog is case-insensitive and trims whitespace', () => {
      expect(isAdviceOnlyCallLog(makeCallLog({ action: '  advice provided  ' }))).toBe(true);
      expect(isAdviceOnlyCallLog(makeCallLog({ action: 'ADVICE PROVIDED' }))).toBe(true);
    });

    it('isAdviceOnlyCallLog rejects calls linked to an Animal (already reported)', () => {
      expect(isAdviceOnlyCallLog(makeCallLog({ animalId: 'animal-1' }))).toBe(false);
    });

    it('isAdviceOnlyCallLog rejects non-advice actions', () => {
      expect(isAdviceOnlyCallLog(makeCallLog({ action: 'Dispatched rescuer' }))).toBe(false);
      expect(isAdviceOnlyCallLog(makeCallLog({ action: null }))).toBe(false);
    });

    it('appends an advice-call row after animal rows with fate="Advice provided"', async () => {
      const animal = makeAnimal({ orgAnimalId: 'ANI-1' });
      const call = makeCallLog();
      const data: NSWDetailedReportData = {
        ...baseData([animal]),
        adviceCallLogs: [call],
      };
      const gen = new NSWDetailedReportGenerator(data);
      const wb = gen.generateReport();
      const ws = wb.getWorksheet('Datasheet')!;
      // Row 6 = animal, Row 7 = advice call
      expect(ws.getRow(6).getCell(2).value).toBe('ANI-1');
      const row = ws.getRow(7).values as (string | number | undefined)[];
      expect(row[1]).toBe('Tawny Frogmouth');
      expect(row[2]).toBe(call.id);
      expect(row[3]).toBe('20/08/2025');
      expect(row[4]).toBe(''); // no encounter type on advice calls
      expect(row[5]).toBe(-33.9);
      expect(row[6]).toBe(151.2);
      expect(row[7]).toBe('14 Example St');
      expect(row[8]).toBe('CAMPERDOWN - 2050');
      expect(row[14]).toBe('Jane Carer');
      expect(row[15]).toBe(NSW_FATE_ADVICE_PROVIDED);
      expect(row[16]).toBe('20/08/2025');
      expect(row[23]).toBe('Bird stunned after window collision; callback arranged.');
    });

    it('skips advice calls already linked to an Animal (to avoid double-counting)', async () => {
      const linked = makeCallLog({ id: 'call-linked', animalId: 'animal-1' });
      const data: NSWDetailedReportData = {
        ...baseData([]),
        adviceCallLogs: [linked],
      };
      const gen = new NSWDetailedReportGenerator(data);
      const wb = gen.generateReport();
      const ws = wb.getWorksheet('Datasheet')!;
      expect(ws.getRow(6).getCell(2).value).toBeFalsy();
    });

    it('filters advice calls outside the reporting window', async () => {
      const before = makeCallLog({ id: 'call-before', dateTime: new Date(2024, 5, 1) });
      const inside = makeCallLog({ id: 'call-in', dateTime: new Date(2025, 9, 1) });
      const after = makeCallLog({ id: 'call-after', dateTime: new Date(2027, 0, 1) });
      const data: NSWDetailedReportData = {
        ...baseData([]),
        adviceCallLogs: [before, inside, after],
      };
      const gen = new NSWDetailedReportGenerator(data);
      const wb = gen.generateReport();
      const ws = wb.getWorksheet('Datasheet')!;
      expect(ws.getRow(6).getCell(2).value).toBe('call-in');
      expect(ws.getRow(7).getCell(2).value).toBeFalsy();
    });
  });

  it('includes all 7 required tabs', async () => {
    const gen = new NSWDetailedReportGenerator(baseData([]));
    const wb = gen.generateReport();
    const names = wb.worksheets.map((w) => w.name);
    expect(names).toEqual([
      'Datasheet',
      'Species list',
      'Encounter type',
      'Animal condition',
      'Fate',
      'Reference data',
      'Privacy notice',
    ]);
  });
});
