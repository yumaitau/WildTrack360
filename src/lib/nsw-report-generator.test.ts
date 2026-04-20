import { describe, it, expect } from 'vitest';
import { NSWReportGenerator, NSWReportData } from './nsw-report-generator';
import type { EnrichedCarer } from './types';

function makeCarer(overrides: Partial<EnrichedCarer> = {}): EnrichedCarer {
  return {
    id: 'user-1',
    name: 'Jane Carer',
    email: 'jane@example.com',
    imageUrl: '',
    phone: '0400000000',
    licenseNumber: null,
    licenseExpiry: null,
    jurisdiction: 'NSW',
    specialties: [],
    notes: null,
    active: true,
    streetAddress: '1 Test St',
    suburb: 'Camperdown',
    state: 'NSW',
    postcode: '2050',
    executivePosition: null,
    speciesCoordinatorFor: null,
    rehabilitatesKoala: false,
    rehabilitatesFlyingFox: false,
    rehabilitatesBirdOfPrey: false,
    rehabilitatesVenomousSnake: false,
    rehabilitatesMarineReptile: false,
    memberSince: null,
    trainingLevel: null,
    memberId: 'M-001',
    hasProfile: true,
    trainings: [],
    ...overrides,
  };
}

function baseData(carers: EnrichedCarer[]): NSWReportData {
  return {
    reportingPeriod: {
      startDate: new Date('2025-07-01T00:00:00Z'),
      endDate: new Date('2026-06-30T23:59:59Z'),
    },
    organization: {
      name: 'Wildlife Rescue NSW',
      licenseNumber: 'MWL000100088',
      contactName: 'Admin',
      contactEmail: 'admin@example.com',
      contactPhone: '',
    },
    animals: [],
    carers,
    transfers: [],
    permanentCare: [],
    preservedSpecimens: [],
  };
}

describe('NSWReportGenerator Register of Members', () => {
  it('emits all five NSW endorsement column headers', () => {
    const gen = new NSWReportGenerator(baseData([]));
    const wb = gen.generateReport();
    const ws = wb.getWorksheet('Register of Members')!;
    // Rows: [title, period, headerMain, headerSubSpecies]
    const subHeader = ws.getRow(4).values as (string | undefined)[];
    const lastFive = subHeader.slice(12, 17);
    expect(lastFive).toEqual(['Koala', 'Flying-Fox', 'Bird of Prey', 'Venomous Snake', 'Marine Reptiles']);
  });

  it('emits Yes for each endorsement when the carer has it', () => {
    const carer = makeCarer({
      rehabilitatesKoala: true,
      rehabilitatesFlyingFox: false,
      rehabilitatesBirdOfPrey: true,
      rehabilitatesVenomousSnake: true,
      rehabilitatesMarineReptile: false,
    });
    const gen = new NSWReportGenerator(baseData([carer]));
    const wb = gen.generateReport();
    const ws = wb.getWorksheet('Register of Members')!;
    const dataRow = ws.getRow(5).values as (string | undefined)[];
    // Cols 12-16: Koala, Flying-Fox, Bird of Prey, Venomous Snake, Marine Reptiles
    expect(dataRow[12]).toBe('Yes');
    expect(dataRow[13]).toBe('No');
    expect(dataRow[14]).toBe('Yes');
    expect(dataRow[15]).toBe('Yes');
    expect(dataRow[16]).toBe('No');
  });

  it('falls back to specialties array when boolean flag is false', () => {
    const carer = makeCarer({
      rehabilitatesKoala: false,
      specialties: ['Koala', 'Venomous Snake'],
    });
    const gen = new NSWReportGenerator(baseData([carer]));
    const wb = gen.generateReport();
    const ws = wb.getWorksheet('Register of Members')!;
    const dataRow = ws.getRow(5).values as (string | undefined)[];
    expect(dataRow[12]).toBe('Yes'); // Koala via specialties
    expect(dataRow[15]).toBe('Yes'); // Venomous Snake via specialties
  });
});
