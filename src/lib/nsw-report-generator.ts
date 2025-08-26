import { Animal, Carer } from '@prisma/client';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { NSW_FATE_OPTIONS } from './compliance-rules';

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
  carers: Carer[];
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

  /**
   * Generate the complete NSW Combined Report workbook
   */
  generateReport(): XLSX.WorkBook {
    const wb = XLSX.utils.book_new();

    // Add each required sheet
    this.addNilReturnSheet(wb);
    this.addTransferredAnimalRegister(wb);
    this.addPermanentCareRegister(wb);
    this.addPreservedSpecimenRegister(wb);
    this.addRegisterOfMembers(wb);
    this.addPrivacyNotice(wb);

    return wb;
  }

  /**
   * Add Nil Return sheet
   */
  private addNilReturnSheet(wb: XLSX.WorkBook) {
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

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, 'Nil Return');
  }

  /**
   * Add Transferred Animal Register
   */
  private addTransferredAnimalRegister(wb: XLSX.WorkBook) {
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

    const sheetData = [...headers, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 15 },
      { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 20 },
      { wch: 30 }, { wch: 20 }, { wch: 10 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Transferred Animal Register');
  }

  /**
   * Add Permanent Care Register
   */
  private addPermanentCareRegister(wb: XLSX.WorkBook) {
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

    const sheetData = [...headers, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 30 },
      { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 10 },
      { wch: 15 }, { wch: 20 }, { wch: 25 }, { wch: 12 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Permanent Care Register');
  }

  /**
   * Add Preserved Specimen Register
   */
  private addPreservedSpecimenRegister(wb: XLSX.WorkBook) {
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

    const sheetData = [...headers, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 30 },
      { wch: 30 }, { wch: 20 }, { wch: 10 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Preserved Specimen Register');
  }

  /**
   * Add Register of Members
   */
  private addRegisterOfMembers(wb: XLSX.WorkBook) {
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

    const dataRows = this.data.carers.map((carer: any, index) => {
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

    const sheetData = [...headers, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 25 },
      { wch: 20 }, { wch: 8 }, { wch: 10 }, { wch: 25 },
      { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 10 },
      { wch: 12 }, { wch: 14 }, { wch: 5 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Register of Members');
  }

  /**
   * Add Privacy Notice
   */
  private addPrivacyNotice(wb: XLSX.WorkBook) {
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

    const ws = XLSX.utils.aoa_to_sheet(privacyText);
    XLSX.utils.book_append_sheet(wb, ws, 'Privacy Notice');
  }

  /**
   * Export the report to Excel file
   */
  exportToExcel(filename: string = `NSW_Wildlife_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`) {
    const wb = this.generateReport();
    XLSX.writeFile(wb, filename);
    return filename;
  }

  /**
   * Get report as buffer for download
   */
  getReportBuffer(): ArrayBuffer {
    const wb = this.generateReport();
    return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  }
}