import { Animal } from '@prisma/client';
import type { EnrichedCarer } from './types';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';

export interface NSWReportData {
  reportingPeriod: {
    startDate: Date;
    endDate: Date;
  };
  organization: {
    name: string;
    licenseNumber: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
  };
  animals: Animal[];
  carers: EnrichedCarer[];
  transfers: TransferRecord[];
  permanentCare: PermanentCareRecord[];
  preservedSpecimens: PreservedSpecimenRecord[];
}

export interface TransferRecord {
  animalId: string;
  species: string;
  markBandMicrochip?: string;
  dateOfTransfer: Date;
  reasonForTransfer: string;
  recipientName: string;
  recipientLicense: string;
  recipientAnimalId: string;
  recipientAddress: string;
  recipientSuburb: string;
  recipientPostcode: string;
}

export interface PermanentCareRecord {
  animalId: string;
  species: string;
  markBandMicrochip?: string;
  facilityName: string;
  licenseNumber: string;
  address: string;
  suburb: string;
  postcode: string;
  npwsApprovalDate: Date;
  approvalNumber: string;
  category: 'Education' | 'Companion' | 'Research';
  status: 'Alive' | 'Dead';
}

export interface PreservedSpecimenRecord {
  species: string;
  referenceNumber: string;
  description: string;
  facilityName: string;
  address: string;
  suburb: string;
  postcode: string;
}

interface MemberRecord {
  memberId: string;
  firstName: string;
  lastName: string;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  email: string;
  phone: string;
  executivePosition?: string;
  speciesCoordinator?: string;
  rehabilitatingKoala: boolean;
  rehabilitatingFlyingFox: boolean;
  rehabilitatingBirdOfPrey: boolean;
}

export class NSWReportGenerator {
  private data: NSWReportData;

  constructor(data: NSWReportData) {
    this.data = data;
  }

  private addRowsToSheet(ws: ExcelJS.Worksheet, rows: (string | number | undefined)[][]) {
    for (const row of rows) {
      ws.addRow(row.length === 0 ? [''] : row);
    }
  }

  private setColumnWidths(ws: ExcelJS.Worksheet, widths: number[]) {
    ws.columns = widths.map(width => ({ width }));
  }

  generateReport(): ExcelJS.Workbook {
    const wb = new ExcelJS.Workbook();

    this.addNilReturnSheet(wb);
    this.addTransferredAnimalRegister(wb);
    this.addPermanentCareRegister(wb);
    this.addPreservedSpecimenRegister(wb);
    this.addRegisterOfMembers(wb);
    this.addPrivacyNotice(wb);

    return wb;
  }

  private addNilReturnSheet(wb: ExcelJS.Workbook) {
    const isNilReturn = this.data.animals.length === 0 &&
                       this.data.transfers.length === 0 &&
                       this.data.permanentCare.length === 0;

    const sheetData = [
      [`Combined Nil Report: ${format(this.data.reportingPeriod.startDate, 'do MMMM yyyy')} to ${format(this.data.reportingPeriod.endDate, 'do MMMM yyyy')}`],
      [],
      ['This sheet is to be completed if you have no data to report for the period'],
      [],
      [],
      [],
      [`Name: ${this.data.organization.contactName}`],
      [`Licence number: ${this.data.organization.licenseNumber}`],
      [`Date: ${format(new Date(), 'dd/MM/yyyy')}`],
      [],
      [`Nil Return: ${isNilReturn ? 'YES' : 'NO'}`]
    ];

    const ws = wb.addWorksheet('Nil Return');
    this.addRowsToSheet(ws, sheetData);
  }

  private addTransferredAnimalRegister(wb: ExcelJS.Workbook) {
    const headers = [
      ['TRANSFERRED ANIMAL REGISTER'],
      [`${format(this.data.reportingPeriod.startDate, 'do MMMM yyyy')} to ${format(this.data.reportingPeriod.endDate, 'do MMMM yyyy')}`],
      ['If you have transferred any animals to another organisation, complete this register'],
      ['Animal details', '', '', 'Transfer details', '', 'Institution, organisation, or individual details', '', '', '', '', ''],
      [
        'Unique rescue identification number assigned to the animal by your group',
        'Species',
        'Mark/Band/Microchip number (if applicable)',
        'Date of transfer',
        'Reason for transfer',
        'Recipient of transferred animal',
        'Licence #',
        'Unique rescue identification number assigned by receiving group/organisation/individual',
        'Street address of recipient',
        'Suburb/town',
        'Postcode'
      ]
    ];

    const dataRows = this.data.transfers.map(transfer => [
      transfer.animalId,
      transfer.species,
      transfer.markBandMicrochip || 'NA',
      format(transfer.dateOfTransfer, 'yyyy-MM-dd'),
      transfer.reasonForTransfer,
      transfer.recipientName,
      transfer.recipientLicense,
      transfer.recipientAnimalId,
      transfer.recipientAddress,
      transfer.recipientSuburb,
      transfer.recipientPostcode
    ]);

    const ws = wb.addWorksheet('Transferred Animal Register');
    this.addRowsToSheet(ws, [...headers, ...dataRows]);
    this.setColumnWidths(ws, [20, 20, 20, 15, 20, 25, 15, 20, 30, 20, 10]);
  }

  private addPermanentCareRegister(wb: ExcelJS.Workbook) {
    const headers = [
      ['PERMANENT CARE REGISTER'],
      [`${format(this.data.reportingPeriod.startDate, 'do MMMM yyyy')} to ${format(this.data.reportingPeriod.endDate, 'do MMMM yyyy')}`],
      ['Complete this table for every animal in permanent care'],
      ['Animal Details', '', '', 'Authorised institution, organisation, or individual details', '', '', '', '', 'Details of approval granted', '', '', 'Animal Status'],
      [
        'Unique rescue identification number',
        'Species',
        'Mark/Band/Microchip number (if applicable)',
        'Name of licensed facility/member where animal is permanently housed',
        'Licence number',
        'Street address',
        'Suburb/town',
        'Postcode',
        'Date of NPWS Approval',
        'Approval number issued by NPWS',
        'Category (Education, Companion, Research)',
        'Alive/Dead'
      ]
    ];

    const dataRows = this.data.permanentCare.map(record => [
      record.animalId,
      record.species,
      record.markBandMicrochip || 'NA',
      record.facilityName,
      record.licenseNumber,
      record.address,
      record.suburb,
      record.postcode,
      format(record.npwsApprovalDate, 'yyyy-MM-dd'),
      record.approvalNumber,
      record.category,
      record.status
    ]);

    const ws = wb.addWorksheet('Permanent Care Register');
    this.addRowsToSheet(ws, [...headers, ...dataRows]);
    this.setColumnWidths(ws, [20, 20, 20, 30, 15, 30, 20, 10, 15, 20, 25, 12]);
  }

  private addPreservedSpecimenRegister(wb: ExcelJS.Workbook) {
    const headers = [
      ['PRESERVED SPECIMEN REGISTER'],
      [`${format(this.data.reportingPeriod.startDate, 'do MMMM yyyy')} to ${format(this.data.reportingPeriod.endDate, 'do MMMM yyyy')}`],
      ['Fill out the table below if you have preserved specimens'],
      [],
      [
        'Species',
        'Register reference number',
        'Description of specimen',
        'Name of licensed facility/member where specimen preserved',
        'Street address where preserved',
        'Suburb/town',
        'Postcode'
      ]
    ];

    const dataRows = this.data.preservedSpecimens.map(specimen => [
      specimen.species,
      specimen.referenceNumber,
      specimen.description,
      specimen.facilityName,
      specimen.address,
      specimen.suburb,
      specimen.postcode
    ]);

    const ws = wb.addWorksheet('Preserved Specimen Register');
    this.addRowsToSheet(ws, [...headers, ...dataRows]);
    this.setColumnWidths(ws, [20, 20, 25, 30, 30, 20, 10]);
  }

  private addRegisterOfMembers(wb: ExcelJS.Workbook) {
    const headers = [
      ['REGISTER OF MEMBERS'],
      [`${format(this.data.reportingPeriod.startDate, 'do MMMM yyyy')} to ${format(this.data.reportingPeriod.endDate, 'do MMMM yyyy')}`],
      [
        'MemberID',
        'First Name',
        'Last Name',
        'Street address',
        'Suburb/town',
        'State',
        'Postcode',
        'Email',
        'Phone',
        'Executive Position (If yes, please specify position)',
        'Species Coordinator / Mentor (If yes, please specify for which species)',
        'Is the member rehabilitating any of the species listed below?',
        '', '', ''
      ],
      ['', '', '', '', '', '', '', '', '', '', '', 'Koala', 'Flying-Fox', 'Bird of Prey', '']
    ];

    const dataRows = this.data.carers.map((carer: any) => {
      const memberRecord: MemberRecord = {
        memberId: carer.id,
        firstName: carer.name.split(' ')[0] || carer.name,
        lastName: carer.name.split(' ').slice(1).join(' ') || '',
        address: carer.streetAddress || '',
        suburb: carer.suburb || '',
        state: carer.state || 'NSW',
        postcode: carer.postcode || '',
        email: carer.email,
        phone: carer.phone || '',
        executivePosition: carer.executivePosition || '',
        speciesCoordinator: carer.speciesCoordinatorFor || carer.specialties?.join(', ') || '',
        rehabilitatingKoala: carer.rehabilitatesKoala || carer.specialties?.includes('Koala') || false,
        rehabilitatingFlyingFox: carer.rehabilitatesFlyingFox || carer.specialties?.includes('Flying-Fox') || false,
        rehabilitatingBirdOfPrey: carer.rehabilitatesBirdOfPrey || carer.specialties?.includes('Bird of Prey') || false
      };

      return [
        memberRecord.memberId,
        memberRecord.firstName,
        memberRecord.lastName,
        memberRecord.address,
        memberRecord.suburb,
        memberRecord.state,
        memberRecord.postcode,
        memberRecord.email,
        memberRecord.phone,
        memberRecord.executivePosition,
        memberRecord.speciesCoordinator,
        memberRecord.rehabilitatingKoala ? 'Yes' : 'No',
        memberRecord.rehabilitatingFlyingFox ? 'Yes' : 'No',
        memberRecord.rehabilitatingBirdOfPrey ? 'Yes' : 'No',
        ''
      ];
    });

    const ws = wb.addWorksheet('Register of Members');
    this.addRowsToSheet(ws, [...headers, ...dataRows]);
    this.setColumnWidths(ws, [12, 15, 15, 25, 20, 8, 10, 25, 15, 25, 30, 10, 12, 14, 5]);
  }

  private addPrivacyNotice(wb: ExcelJS.Workbook) {
    const privacyText = [
      [],
      [],
      [],
      [],
      [],
      ['Privacy Notice'],
      [],
      ['The NSW National Parks and Wildlife Service collects the information in this annual report under section 132H of the National Parks and Wildlife Act 1974. ' +
       'The information is collected for the purpose of monitoring wildlife rehabilitation activities in NSW, evaluating compliance with licence conditions, ' +
       'and informing conservation and management decisions. The supply of this information is mandatory under wildlife rehabilitation licence conditions. ' +
       'NPWS may share this information with other government agencies for conservation and compliance purposes. ' +
       'Personal information will be handled in accordance with the Privacy and Personal Information Protection Act 1998.']
    ];

    const ws = wb.addWorksheet('Privacy Notice');
    this.addRowsToSheet(ws, privacyText);
  }

  async exportToExcel(filename: string = `NSW_Wildlife_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`) {
    const wb = this.generateReport();
    await wb.xlsx.writeFile(filename);
    return filename;
  }

  async getReportBuffer(): Promise<ArrayBuffer> {
    const wb = this.generateReport();
    const nodeBuffer = await wb.xlsx.writeBuffer();
    return nodeBuffer as ArrayBuffer;
  }
}