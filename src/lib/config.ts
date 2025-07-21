import { JurisdictionConfig } from './types';

// Default jurisdiction configurations
const DEFAULT_JURISDICTION_CONFIGS: { [key: string]: JurisdictionConfig } = {
  ACT: {
    enabledForms: ['releaseChecklist', 'incidentLog', 'hygieneLog', 'carerLicence'],
    templates: ['ACTRegister', 'ACTReleaseChecklist'],
    enforceReleaseDistance: true,
    requireVetSignOff: true,
    maxRetentionYears: 3,
  },
  NSW: {
    enabledForms: ['releaseChecklist', 'incidentLog'],
    templates: ['NSWRegister'],
    enforceReleaseDistance: false,
    requireVetSignOff: false,
    maxRetentionYears: 2,
  },
  VIC: {
    enabledForms: ['releaseChecklist', 'incidentLog', 'hygieneLog'],
    templates: ['VICRegister'],
    enforceReleaseDistance: true,
    requireVetSignOff: true,
    maxRetentionYears: 3,
  },
  QLD: {
    enabledForms: ['releaseChecklist', 'incidentLog', 'carerLicence'],
    templates: ['QLDRegister'],
    enforceReleaseDistance: false,
    requireVetSignOff: false,
    maxRetentionYears: 2,
  },
  WA: {
    enabledForms: ['releaseChecklist', 'incidentLog'],
    templates: ['WARegister'],
    enforceReleaseDistance: true,
    requireVetSignOff: true,
    maxRetentionYears: 3,
  },
  SA: {
    enabledForms: ['releaseChecklist', 'incidentLog', 'hygieneLog'],
    templates: ['SARegister'],
    enforceReleaseDistance: true,
    requireVetSignOff: false,
    maxRetentionYears: 2,
  },
  TAS: {
    enabledForms: ['releaseChecklist', 'incidentLog'],
    templates: ['TASRegister'],
    enforceReleaseDistance: false,
    requireVetSignOff: false,
    maxRetentionYears: 2,
  },
  NT: {
    enabledForms: ['releaseChecklist', 'incidentLog', 'carerLicence'],
    templates: ['NTRegister'],
    enforceReleaseDistance: true,
    requireVetSignOff: true,
    maxRetentionYears: 3,
  },
};

// Get jurisdiction from environment variable
export const getCurrentJurisdiction = (): string => {
  const envJurisdiction = process.env.NEXT_PUBLIC_JURISDICTION || process.env.JURISDICTION;
  
  if (!envJurisdiction) {
    console.warn('No jurisdiction specified in environment variables. Defaulting to ACT.');
    return 'ACT';
  }
  
  const jurisdiction = envJurisdiction.toUpperCase();
  
  if (!DEFAULT_JURISDICTION_CONFIGS[jurisdiction]) {
    console.warn(`Unknown jurisdiction: ${jurisdiction}. Defaulting to ACT.`);
    return 'ACT';
  }
  
  return jurisdiction;
};

// Get jurisdiction configuration
export const getJurisdictionConfig = (): JurisdictionConfig => {
  const jurisdiction = getCurrentJurisdiction();
  return DEFAULT_JURISDICTION_CONFIGS[jurisdiction];
};

// Check if a feature is enabled for current jurisdiction
export const isFeatureEnabled = (feature: string): boolean => {
  const config = getJurisdictionConfig();
  return config.enabledForms.includes(feature);
};

// Get organization name from environment
export const getOrganizationName = (): string => {
  return process.env.NEXT_PUBLIC_ORGANIZATION_NAME || process.env.ORGANIZATION_NAME || 'WildHub';
};

// Get organization contact from environment
export const getOrganizationContact = (): string => {
  return process.env.NEXT_PUBLIC_ORGANIZATION_CONTACT || process.env.ORGANIZATION_CONTACT || 'contact@wildhub.org';
};

// Get organization logo from environment
export const getOrganizationLogo = (): string => {
  return process.env.NEXT_PUBLIC_ORGANIZATION_LOGO || process.env.ORGANIZATION_LOGO || '/logo.png';
};

// Get all available jurisdictions
export const getAvailableJurisdictions = (): string[] => {
  return Object.keys(DEFAULT_JURISDICTION_CONFIGS);
}; 