// Removed invalid import: JurisdictionConfig is not exported from @prisma/client

import { JurisdictionConfig } from "./types";

export interface ComplianceRule {
  id: string;
  section: string;
  title: string;
  description: string;
  required: boolean;
  jurisdictions: string[];
  category: 'record-keeping' | 'hygiene' | 'release' | 'carer-management' | 'incident-management' | 'general';
  formType?: string;
  retentionYears?: number;
  exportFormats?: string[];
}

export interface ComplianceSection {
  id: string;
  title: string;
  description: string;
  rules: ComplianceRule[];
  jurisdictions: string[];
}

export interface JurisdictionComplianceConfig extends JurisdictionConfig {
  codeOfPractice: string;
  codeOfPracticeUrl?: string;
  sections: ComplianceSection[];
  retentionRequirements: {
    animalRecords: number;
    incidentReports: number;
    hygieneLogs: number;
    releaseChecklists: number;
    carerRecords: number;
  };
  mandatoryForms: string[];
  optionalForms: string[];
  distanceRequirements: {
    releaseDistance: number;
    unit: 'km' | 'miles';
    enforced: boolean;
  };
  vetRequirements: {
    signOffRequired: boolean;
    forJuveniles: boolean;
    forSpecificSpecies: string[];
  };
}

// ACT Wildlife Code of Practice 2020 Compliance Rules
const ACT_COMPLIANCE_RULES: ComplianceSection[] = [
  {
    id: 'section-7',
    title: 'Record Keeping Requirements',
    description: 'Wildlife admission and outcome register requirements',
    jurisdictions: ['ACT'],
    rules: [
      {
        id: '7.1.1',
        section: '7.1.1',
        title: 'Wildlife Admission Register',
        description: 'Maintain a register of all wildlife admitted to care',
        required: true,
        jurisdictions: ['ACT'],
        category: 'record-keeping',
        formType: 'wildlife-register',
        retentionYears: 3,
        exportFormats: ['CSV', 'PDF']
      },
      {
        id: '7.1.2',
        section: '7.1.2',
        title: 'Search and Filter Capability',
        description: 'Register must allow searching and filtering by species, date, and carer',
        required: true,
        jurisdictions: ['ACT'],
        category: 'record-keeping',
        formType: 'wildlife-register'
      },
      {
        id: '7.1.3',
        section: '7.1.3',
        title: 'Export Functionality',
        description: 'Ability to export records as CSV and PDF formats',
        required: true,
        jurisdictions: ['ACT'],
        category: 'record-keeping',
        formType: 'wildlife-register',
        exportFormats: ['CSV', 'PDF']
      }
    ]
  },
  {
    id: 'section-6',
    title: 'Release Requirements',
    description: 'Release site selection and checklist requirements',
    jurisdictions: ['ACT'],
    rules: [
      {
        id: '6.1',
        section: '6.1',
        title: 'Release Site Distance',
        description: 'Release sites must be at least 10km from capture location',
        required: true,
        jurisdictions: ['ACT'],
        category: 'release',
        formType: 'release-checklist'
      },
      {
        id: '6.2',
        section: '6.2',
        title: 'Veterinary Sign-off for Juveniles',
        description: 'Veterinary approval required for release of juvenile animals',
        required: true,
        jurisdictions: ['ACT'],
        category: 'release',
        formType: 'release-checklist'
      },
      {
        id: '6.3',
        section: '6.3',
        title: 'Release Checklist Documentation',
        description: 'Complete release checklist must be documented and retained',
        required: true,
        jurisdictions: ['ACT'],
        category: 'release',
        formType: 'release-checklist',
        retentionYears: 3,
        exportFormats: ['PDF']
      }
    ]
  },
  {
    id: 'section-5',
    title: 'Hygiene and Biosecurity',
    description: 'Daily hygiene and biosecurity protocols',
    jurisdictions: ['ACT'],
    rules: [
      {
        id: '5.2.1',
        section: '5.2.1',
        title: 'Daily Hygiene Log',
        description: 'Daily cleaning and biosecurity protocols must be documented',
        required: true,
        jurisdictions: ['ACT'],
        category: 'hygiene',
        formType: 'hygiene-log',
        retentionYears: 3
      },
      {
        id: '5.2.2',
        section: '5.2.2',
        title: 'PPE Usage Tracking',
        description: 'Personal protective equipment usage must be recorded',
        required: true,
        jurisdictions: ['ACT'],
        category: 'hygiene',
        formType: 'hygiene-log'
      },
      {
        id: '5.2.3',
        section: '5.2.3',
        title: 'Equipment Disinfection',
        description: 'Feeding bowls and equipment disinfection must be documented',
        required: true,
        jurisdictions: ['ACT'],
        category: 'hygiene',
        formType: 'hygiene-log'
      }
    ]
  },
  {
    id: 'section-5.1',
    title: 'Incident Management',
    description: 'Incident reporting and management requirements',
    jurisdictions: ['ACT'],
    rules: [
      {
        id: '5.1.3',
        section: '5.1.3',
        title: 'Incident Reporting',
        description: 'All major incidents must be reported and documented',
        required: true,
        jurisdictions: ['ACT'],
        category: 'incident-management',
        formType: 'incident-report',
        retentionYears: 3,
        exportFormats: ['PDF']
      },
      {
        id: '5.2.4',
        section: '5.2.4',
        title: 'Escape Incidents',
        description: 'Animal escape incidents must be reported immediately',
        required: true,
        jurisdictions: ['ACT'],
        category: 'incident-management',
        formType: 'incident-report'
      },
      {
        id: '6.4',
        section: '6.4',
        title: 'Release Incidents',
        description: 'Incidents during release must be documented',
        required: true,
        jurisdictions: ['ACT'],
        category: 'incident-management',
        formType: 'incident-report'
      }
    ]
  },
  {
    id: 'section-4',
    title: 'Carer Management',
    description: 'Carer licensing and training requirements',
    jurisdictions: ['ACT'],
    rules: [
      {
        id: '4.1.1',
        section: '4.1.1',
        title: 'Licence Management',
        description: 'Carer licences must be tracked and managed',
        required: true,
        jurisdictions: ['ACT'],
        category: 'carer-management',
        formType: 'carer-licence'
      },
      {
        id: '4.1.2',
        section: '4.1.2',
        title: 'Training Records',
        description: 'Training history and continuing professional development must be documented',
        required: true,
        jurisdictions: ['ACT'],
        category: 'carer-management',
        formType: 'carer-licence'
      },
      {
        id: '4.1.3',
        section: '4.1.3',
        title: 'Authorised Species',
        description: 'Authorised species for each carer must be tracked',
        required: true,
        jurisdictions: ['ACT'],
        category: 'carer-management',
        formType: 'carer-licence'
      }
    ]
  }
];

// NSW Wildlife Rehabilitation Compliance Rules
const NSW_COMPLIANCE_RULES: ComplianceSection[] = [
  {
    id: 'section-14',
    title: 'Record Keeping Requirements',
    description: 'Standards and guidelines for maintaining records of protected fauna',
    jurisdictions: ['NSW'],
    rules: [
      {
        id: '14.1.1',
        section: '14.1.1',
        title: 'Individual Animal Records',
        description: 'Maintain individual records for each animal including rescue details, assessment, care, and fate',
        required: true,
        jurisdictions: ['NSW'],
        category: 'record-keeping',
        formType: 'wildlife-register',
        retentionYears: 2
      },
      {
        id: '14.1.2',
        section: '14.1.2',
        title: 'Record Transfer',
        description: 'When animals are transferred, copies of records must be transferred with them',
        required: true,
        jurisdictions: ['NSW'],
        category: 'record-keeping',
        formType: 'wildlife-register'
      },
      {
        id: '14.1.3',
        section: '14.1.3',
        title: 'Disease Outbreak Reporting',
        description: 'Immediately contact rehabilitation group for tissue analysis or necropsy if death suspected from serious disease',
        required: true,
        jurisdictions: ['NSW'],
        category: 'incident-management',
        formType: 'incident-report'
      },
      {
        id: '14.2.1',
        section: '14.2.1',
        title: 'Rescue Information',
        description: 'Record who discovered animal, when discovered, and any treatment provided prior to transport',
        required: false,
        jurisdictions: ['NSW'],
        category: 'record-keeping',
        formType: 'wildlife-register'
      },
      {
        id: '14.2.2',
        section: '14.2.2',
        title: 'Veterinary Assessment',
        description: 'Record details of wounds, injuries, diseases, mobility, abnormal behaviour, and recommended management',
        required: false,
        jurisdictions: ['NSW'],
        category: 'record-keeping',
        formType: 'wildlife-register'
      },
      {
        id: '14.2.3',
        section: '14.2.3',
        title: 'Entry Information',
        description: 'Record standard measurements, identifying features, and housing type',
        required: false,
        jurisdictions: ['NSW'],
        category: 'record-keeping',
        formType: 'wildlife-register'
      },
      {
        id: '14.2.4',
        section: '14.2.4',
        title: 'Daily Care Records',
        description: 'Record food intake, treatment details, veterinary instructions, fitness changes, and enclosure cleaning',
        required: false,
        jurisdictions: ['NSW'],
        category: 'record-keeping',
        formType: 'wildlife-register'
      },
      {
        id: '14.2.5',
        section: '14.2.5',
        title: 'Release Information',
        description: 'Record release type (hard or soft) and animal condition at release',
        required: false,
        jurisdictions: ['NSW'],
        category: 'record-keeping',
        formType: 'release-checklist'
      },
      {
        id: '14.2.6',
        section: '14.2.6',
        title: 'Record Backups',
        description: 'Keep duplicates or backups of records to avoid information loss',
        required: false,
        jurisdictions: ['NSW'],
        category: 'record-keeping',
        formType: 'wildlife-register'
      }
    ]
  },
  {
    id: 'section-11',
    title: 'Suitability for Release',
    description: 'Assessment criteria for determining if animals are suitable for release',
    jurisdictions: ['NSW'],
    rules: [
      {
        id: '11.1',
        section: '11.1',
        title: 'Release Assessment',
        description: 'Animals must be assessed for suitability for release based on health, behavior, and survival skills',
        required: true,
        jurisdictions: ['NSW'],
        category: 'release',
        formType: 'release-checklist'
      }
    ]
  },
  {
    id: 'section-12',
    title: 'Release Considerations',
    description: 'Factors to consider when releasing animals back to the wild',
    jurisdictions: ['NSW'],
    rules: [
      {
        id: '12.1',
        section: '12.1',
        title: 'Release Planning',
        description: 'Consider habitat suitability, season, weather conditions, and potential threats',
        required: true,
        jurisdictions: ['NSW'],
        category: 'release',
        formType: 'release-checklist'
      }
    ]
  },
  {
    id: 'section-13',
    title: 'Training Requirements',
    description: 'Training and experience requirements for fauna rehabilitators',
    jurisdictions: ['NSW'],
    rules: [
      {
        id: '13.1',
        section: '13.1',
        title: 'Rehabilitator Training',
        description: 'Fauna rehabilitators must have appropriate training and experience',
        required: true,
        jurisdictions: ['NSW'],
        category: 'carer-management',
        formType: 'carer-licence'
      }
    ]
  },
  {
    id: 'section-8',
    title: 'Care Procedures',
    description: 'Standards for care procedures and treatment of protected fauna',
    jurisdictions: ['NSW'],
    rules: [
      {
        id: '8.1',
        section: '8.1',
        title: 'Care Standards',
        description: 'Follow appropriate care procedures for the species and condition of the animal',
        required: true,
        jurisdictions: ['NSW'],
        category: 'general'
      }
    ]
  },
  {
    id: 'section-9',
    title: 'Husbandry',
    description: 'Husbandry standards for the care of protected fauna',
    jurisdictions: ['NSW'],
    rules: [
      {
        id: '9.1',
        section: '9.1',
        title: 'Husbandry Standards',
        description: 'Maintain appropriate husbandry practices for the species in care',
        required: true,
        jurisdictions: ['NSW'],
        category: 'general'
      }
    ]
  },
  {
    id: 'section-10',
    title: 'Housing Requirements',
    description: 'Standards for housing and enclosure requirements based on species',
    jurisdictions: ['NSW'],
    rules: [
      {
        id: '10.1',
        section: '10.1',
        title: 'Enclosure Standards',
        description: 'Provide appropriate enclosure sizes and conditions as per Appendix A guidelines',
        required: true,
        jurisdictions: ['NSW'],
        category: 'general'
      }
    ]
  }
];

// VIC Wildlife Rehabilitation Compliance Rules
const VIC_COMPLIANCE_RULES: ComplianceSection[] = [
  {
    id: 'vic-record-keeping',
    title: 'Record Keeping',
    description: 'Record keeping requirements for Victoria',
    jurisdictions: ['VIC'],
    rules: [
      {
        id: 'vic-1',
        section: 'VIC-1',
        title: 'Animal Records',
        description: 'Animal admission and outcome records',
        required: true,
        jurisdictions: ['VIC'],
        category: 'record-keeping',
        formType: 'wildlife-register',
        retentionYears: 3
      }
    ]
  },
  {
    id: 'vic-hygiene',
    title: 'Hygiene Requirements',
    description: 'Hygiene and biosecurity requirements for Victoria',
    jurisdictions: ['VIC'],
    rules: [
      {
        id: 'vic-2',
        section: 'VIC-2',
        title: 'Hygiene Logs',
        description: 'Daily hygiene and cleaning protocols',
        required: true,
        jurisdictions: ['VIC'],
        category: 'hygiene',
        formType: 'hygiene-log',
        retentionYears: 3
      }
    ]
  }
];

// Jurisdiction-specific compliance configurations
export const JURISDICTION_COMPLIANCE_CONFIGS: { [key: string]: JurisdictionComplianceConfig } = {
  ACT: {
    enabledForms: ['releaseChecklist', 'incidentLog', 'hygieneLog', 'carerLicence', 'wildlifeRegister'],
    templates: ['ACTRegister', 'ACTReleaseChecklist'],
    enforceReleaseDistance: true,
    requireVetSignOff: true,
    maxRetentionYears: 3,
    codeOfPractice: 'ACT Wildlife Code of Practice 2020',
    codeOfPracticeUrl: 'https://actwildlife.net/wp-content/uploads/2022/03/Wildlife-COP-2020.pdf',
    sections: ACT_COMPLIANCE_RULES,
    retentionRequirements: {
      animalRecords: 3,
      incidentReports: 3,
      hygieneLogs: 3,
      releaseChecklists: 3,
      carerRecords: 3
    },
    mandatoryForms: ['wildlife-register', 'release-checklist', 'hygiene-log', 'incident-report'],
    optionalForms: ['carer-licence'],
    distanceRequirements: {
      releaseDistance: 10,
      unit: 'km',
      enforced: true
    },
    vetRequirements: {
      signOffRequired: true,
      forJuveniles: true,
      forSpecificSpecies: ['All species']
    }
  },
  NSW: {
    enabledForms: ['releaseChecklist', 'incidentLog', 'wildlifeRegister'],
    templates: ['NSWRegister'],
    enforceReleaseDistance: false,
    requireVetSignOff: false,
    maxRetentionYears: 2,
    codeOfPractice: 'Code of Practice for Injured, Sick and Orphaned Protected Fauna',
    codeOfPracticeUrl: 'https://www.environment.nsw.gov.au/sites/default/files/code-practice-injured-protected-fauna-110004.pdf',
    sections: NSW_COMPLIANCE_RULES,
    retentionRequirements: {
      animalRecords: 2,
      incidentReports: 2,
      hygieneLogs: 1,
      releaseChecklists: 2,
      carerRecords: 2
    },
    mandatoryForms: ['wildlife-register', 'release-checklist', 'incident-report'],
    optionalForms: ['carer-licence'],
    distanceRequirements: {
      releaseDistance: 0,
      unit: 'km',
      enforced: false
    },
    vetRequirements: {
      signOffRequired: false,
      forJuveniles: false,
      forSpecificSpecies: []
    }
  },
  VIC: {
    enabledForms: ['releaseChecklist', 'incidentLog', 'hygieneLog'],
    templates: ['VICRegister'],
    enforceReleaseDistance: true,
    requireVetSignOff: true,
    maxRetentionYears: 3,
    codeOfPractice: 'Victorian Wildlife Rehabilitation Guidelines',
    sections: VIC_COMPLIANCE_RULES,
    retentionRequirements: {
      animalRecords: 3,
      incidentReports: 3,
      hygieneLogs: 3,
      releaseChecklists: 3,
      carerRecords: 3
    },
    mandatoryForms: ['wildlife-register', 'release-checklist', 'hygiene-log'],
    optionalForms: ['incident-report'],
    distanceRequirements: {
      releaseDistance: 5,
      unit: 'km',
      enforced: true
    },
    vetRequirements: {
      signOffRequired: true,
      forJuveniles: true,
      forSpecificSpecies: ['Endangered species']
    }
  }
};

// Helper functions
export const getJurisdictionComplianceConfig = (jurisdiction: string): JurisdictionComplianceConfig => {
  return JURISDICTION_COMPLIANCE_CONFIGS[jurisdiction] || JURISDICTION_COMPLIANCE_CONFIGS['ACT'];
};

export const isComplianceRuleRequired = (ruleId: string, jurisdiction: string): boolean => {
  const config = getJurisdictionComplianceConfig(jurisdiction);
  const rule = config.sections
    .flatMap(section => section.rules)
    .find(rule => rule.id === ruleId);
  
  return rule?.required || false;
};

export const getComplianceRulesForJurisdiction = (jurisdiction: string): ComplianceRule[] => {
  const config = getJurisdictionComplianceConfig(jurisdiction);
  return config.sections.flatMap(section => section.rules);
};

export const getComplianceSectionsForJurisdiction = (jurisdiction: string): ComplianceSection[] => {
  const config = getJurisdictionComplianceConfig(jurisdiction);
  return config.sections;
};

export const isFormRequired = (formType: string, jurisdiction: string): boolean => {
  const config = getJurisdictionComplianceConfig(jurisdiction);
  return config.mandatoryForms.includes(formType);
};

export const isFormOptional = (formType: string, jurisdiction: string): boolean => {
  const config = getJurisdictionComplianceConfig(jurisdiction);
  return config.optionalForms.includes(formType);
};

export const getRetentionYears = (recordType: string, jurisdiction: string): number => {
  const config = getJurisdictionComplianceConfig(jurisdiction);
  const retentionMap: { [key: string]: number } = {
    'animal-records': config.retentionRequirements.animalRecords,
    'incident-reports': config.retentionRequirements.incidentReports,
    'hygiene-logs': config.retentionRequirements.hygieneLogs,
    'release-checklists': config.retentionRequirements.releaseChecklists,
    'carer-records': config.retentionRequirements.carerRecords
  };
  return retentionMap[recordType] || config.maxRetentionYears;
};

export const getComplianceRuleById = (ruleId: string, jurisdiction: string): ComplianceRule | undefined => {
  const config = getJurisdictionComplianceConfig(jurisdiction);
  return config.sections
    .flatMap(section => section.rules)
    .find(rule => rule.id === ruleId);
};

export const getComplianceRulesByCategory = (category: string, jurisdiction: string): ComplianceRule[] => {
  const config = getJurisdictionComplianceConfig(jurisdiction);
  return config.sections
    .flatMap(section => section.rules)
    .filter(rule => rule.category === category);
};

export const getComplianceRulesByFormType = (formType: string, jurisdiction: string): ComplianceRule[] => {
  const config = getJurisdictionComplianceConfig(jurisdiction);
  return config.sections
    .flatMap(section => section.rules)
    .filter(rule => rule.formType === formType);
};

export const getRequiredComplianceRules = (jurisdiction: string): ComplianceRule[] => {
  const config = getJurisdictionComplianceConfig(jurisdiction);
  return config.sections
    .flatMap(section => section.rules)
    .filter(rule => rule.required);
};

export const getOptionalComplianceRules = (jurisdiction: string): ComplianceRule[] => {
  const config = getJurisdictionComplianceConfig(jurisdiction);
  return config.sections
    .flatMap(section => section.rules)
    .filter(rule => !rule.required);
}; 