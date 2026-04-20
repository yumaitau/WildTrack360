import { describe, it, expect } from 'vitest';
import type { Animal } from '@prisma/client';
import {
  NSWDetailedReportGenerator,
  NSWDetailedReportData,
  DATASHEET_HEADERS,
} from './nsw-detailed-report-generator';
import { NSW_FATE, NSW_ANIMAL_CONDITION, NSW_ENCOUNTER_TYPE } from './nsw-picklists';

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
  };
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
