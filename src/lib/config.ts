// Define the JurisdictionConfig type locally since it's not exported from @prisma/client
type JurisdictionConfig = {
  enabledForms: string[];
  templates: string[];
  enforceReleaseDistance: boolean;
  requireVetSignOff: boolean;
  maxRetentionYears: number;
  codeOfPractice: string;
  codeOfPracticeUrl?: string;
};

// Default jurisdiction configurations
const DEFAULT_JURISDICTION_CONFIGS: { [key: string]: JurisdictionConfig } = {
  ACT: {
    enabledForms: ['releaseChecklist', 'incidentLog', 'hygieneLog', 'carerLicence'],
    templates: ['ACTRegister', 'ACTReleaseChecklist'],
    enforceReleaseDistance: true,
    requireVetSignOff: true,
    maxRetentionYears: 3,
    codeOfPractice: 'ACT Wildlife Code of Practice 2020',
    codeOfPracticeUrl: 'https://www.environment.act.gov.au/parks-conservation/plants-and-animals/wildlife-conservation/act-wildlife-code-of-practice',
  },
  NSW: {
    enabledForms: ['releaseChecklist', 'incidentLog'],
    templates: ['NSWRegister'],
    enforceReleaseDistance: false,
    requireVetSignOff: false,
    maxRetentionYears: 2,
    codeOfPractice: 'NSW Wildlife Rehabilitation Policy',
  },
  VIC: {
    enabledForms: ['releaseChecklist', 'incidentLog', 'hygieneLog'],
    templates: ['VICRegister'],
    enforceReleaseDistance: true,
    requireVetSignOff: true,
    maxRetentionYears: 3,
    codeOfPractice: 'Victorian Wildlife Act 1975',
  },
  QLD: {
    enabledForms: ['releaseChecklist', 'incidentLog', 'carerLicence'],
    templates: ['QLDRegister'],
    enforceReleaseDistance: false,
    requireVetSignOff: false,
    maxRetentionYears: 2,
    codeOfPractice: 'Queensland Nature Conservation Act 1992',
  },
  WA: {
    enabledForms: ['releaseChecklist', 'incidentLog'],
    templates: ['WARegister'],
    enforceReleaseDistance: true,
    requireVetSignOff: true,
    maxRetentionYears: 3,
    codeOfPractice: 'Western Australia Wildlife Conservation Act 1950',
  },
  SA: {
    enabledForms: ['releaseChecklist', 'incidentLog', 'hygieneLog'],
    templates: ['SARegister'],
    enforceReleaseDistance: true,
    requireVetSignOff: false,
    maxRetentionYears: 2,
    codeOfPractice: 'South Australia National Parks and Wildlife Act 1972',
  },
  TAS: {
    enabledForms: ['releaseChecklist', 'incidentLog'],
    templates: ['TASRegister'],
    enforceReleaseDistance: false,
    requireVetSignOff: false,
    maxRetentionYears: 2,
    codeOfPractice: 'Tasmania Nature Conservation Act 2002',
  },
  NT: {
    enabledForms: ['releaseChecklist', 'incidentLog', 'carerLicence'],
    templates: ['NTRegister'],
    enforceReleaseDistance: true,
    requireVetSignOff: true,
    maxRetentionYears: 3,
    codeOfPractice: 'Northern Territory Territory Parks and Wildlife Conservation Act 1976',
  },
};

// Get jurisdiction from environment variable
export const getCurrentJurisdiction = (): string => {
  // Only use Clerk organization publicMetadata (client-side)
  try {
    if (typeof window !== 'undefined') {
      const anyWin = window as any;
      const orgJurisdiction = anyWin?.Clerk?.organization?.publicMetadata?.jurisdiction as string | undefined;
      const value = orgJurisdiction?.toString().trim();
      if (value) {
        const upper = value.toUpperCase();
        if (DEFAULT_JURISDICTION_CONFIGS[upper]) return upper;
      }
    }
  } catch {}

  // Default if not present on organization metadata
  console.warn('Jurisdiction not set on Clerk organization publicMetadata. Defaulting to ACT.');
  return 'ACT';
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
  return process.env.NEXT_PUBLIC_ORGANIZATION_NAME || process.env.ORGANIZATION_NAME || 'WildTrack360';
};

// Get organization contact from environment
export const getOrganizationContact = (): string => {
  return process.env.NEXT_PUBLIC_ORGANIZATION_CONTACT || process.env.ORGANIZATION_CONTACT || 'contact@wildtrack360.com.au';
};

// Get organization logo from environment
export const getOrganizationLogo = (): string => {
  return process.env.NEXT_PUBLIC_ORGANIZATION_LOGO || process.env.ORGANIZATION_LOGO || '/logo.png';
};

// Get all available jurisdictions
export const getAvailableJurisdictions = (): string[] => {
  return Object.keys(DEFAULT_JURISDICTION_CONFIGS);
}; 