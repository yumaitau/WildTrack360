import 'server-only';
import { clerkClient } from '@clerk/nextjs/server';

// Define jurisdiction configuration type
type JurisdictionConfig = {
  fullName: string;
  shortName: string;
  enabledForms: string[];
  templates: string[];
  enforceReleaseDistance: boolean;
  requireVetSignOff: boolean;
  maxRetentionYears: number;
  codeOfPractice: string;
  codeOfPracticeUrl?: string;
};

// Jurisdiction configurations
const JURISDICTION_CONFIGS: { [key: string]: JurisdictionConfig } = {
  ACT: {
    fullName: 'Australian Capital Territory',
    shortName: 'ACT',
    enabledForms: ['releaseChecklist', 'incidentLog', 'hygieneLog', 'carerLicence'],
    templates: ['ACTRegister', 'ACTReleaseChecklist'],
    enforceReleaseDistance: true,
    requireVetSignOff: true,
    maxRetentionYears: 3,
    codeOfPractice: 'ACT Wildlife Code of Practice 2020',
    codeOfPracticeUrl: 'https://www.environment.act.gov.au/parks-conservation/plants-and-animals/wildlife-conservation/act-wildlife-code-of-practice',
  },
  NSW: {
    fullName: 'New South Wales',
    shortName: 'NSW',
    enabledForms: ['releaseChecklist', 'incidentLog'],
    templates: ['NSWRegister'],
    enforceReleaseDistance: false,
    requireVetSignOff: false,
    maxRetentionYears: 2,
    codeOfPractice: 'NSW Wildlife Rehabilitation Policy',
  },
  VIC: {
    fullName: 'Victoria',
    shortName: 'VIC',
    enabledForms: ['releaseChecklist', 'incidentLog', 'hygieneLog'],
    templates: ['VICRegister'],
    enforceReleaseDistance: true,
    requireVetSignOff: true,
    maxRetentionYears: 3,
    codeOfPractice: 'Victorian Wildlife Act 1975',
  },
  QLD: {
    fullName: 'Queensland',
    shortName: 'QLD',
    enabledForms: ['releaseChecklist', 'incidentLog', 'carerLicence'],
    templates: ['QLDRegister'],
    enforceReleaseDistance: false,
    requireVetSignOff: false,
    maxRetentionYears: 2,
    codeOfPractice: 'Queensland Nature Conservation Act 1992',
  },
  WA: {
    fullName: 'Western Australia',
    shortName: 'WA',
    enabledForms: ['releaseChecklist', 'incidentLog'],
    templates: ['WARegister'],
    enforceReleaseDistance: true,
    requireVetSignOff: true,
    maxRetentionYears: 3,
    codeOfPractice: 'Western Australian Wildlife Conservation Act 1950',
  },
  SA: {
    fullName: 'South Australia',
    shortName: 'SA',
    enabledForms: ['releaseChecklist', 'incidentLog', 'hygieneLog'],
    templates: ['SARegister'],
    enforceReleaseDistance: false,
    requireVetSignOff: false,
    maxRetentionYears: 2,
    codeOfPractice: 'South Australian National Parks and Wildlife Act 1972',
  },
  TAS: {
    fullName: 'Tasmania',
    shortName: 'TAS',
    enabledForms: ['releaseChecklist', 'incidentLog'],
    templates: ['TASRegister'],
    enforceReleaseDistance: true,
    requireVetSignOff: true,
    maxRetentionYears: 3,
    codeOfPractice: 'Tasmanian Wildlife Act 1970',
  },
  NT: {
    fullName: 'Northern Territory',
    shortName: 'NT',
    enabledForms: ['releaseChecklist', 'incidentLog', 'carerLicence'],
    templates: ['NTRegister'],
    enforceReleaseDistance: false,
    requireVetSignOff: false,
    maxRetentionYears: 2,
    codeOfPractice: 'Northern Territory Wildlife Act 2000',
  },
};

// Get organization jurisdiction from Clerk (server-side)
export async function getServerJurisdiction(orgId: string | null): Promise<string> {
  if (!orgId) return 'ACT'; // Default jurisdiction
  
  try {
    const client = await clerkClient();
    const org = await client.organizations.getOrganization({ organizationId: orgId });
    
    // Check for jurisdiction in publicMetadata
    const jurisdiction = org.publicMetadata?.jurisdiction as string | undefined;
    
    // Validate jurisdiction exists in our configs
    if (jurisdiction && JURISDICTION_CONFIGS[jurisdiction]) {
      return jurisdiction;
    }
  } catch (error) {
    console.error('Error fetching organization jurisdiction:', error);
  }
  
  return 'ACT'; // Default jurisdiction if not found
}

// Get jurisdiction config for server components
export async function getServerJurisdictionConfig(orgId: string | null): Promise<JurisdictionConfig> {
  const jurisdiction = await getServerJurisdiction(orgId);
  return JURISDICTION_CONFIGS[jurisdiction] || JURISDICTION_CONFIGS.ACT;
}

// Check if a feature is enabled for the organization's jurisdiction
export async function isServerFeatureEnabled(orgId: string | null, feature: string): Promise<boolean> {
  const config = await getServerJurisdictionConfig(orgId);
  return config.enabledForms.includes(feature);
}