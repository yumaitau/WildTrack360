import type { Metadata } from 'next';
import type { OrgRole } from '@prisma/client';
import './globals.css';
import { ClerkProvider } from '@/lib/clerk-client';
import { auth } from '@/lib/clerk-server';
import { headers } from 'next/headers';
import { Toaster } from 'sonner';
import { Toaster as LegacyToaster } from '@/components/ui/toaster';
import { GoogleMapsProvider } from '@/components/google-maps-provider';
import { CommandPalette, type CommandItem } from '@/components/command-palette';
import { WallyAssistant } from '@/components/wally-assistant';
import { WorkspaceShell } from '@/components/workspace-shell';
import { getUserRole } from '@/lib/rbac';
import { filterCommandItemsForRole } from '@/lib/workspace-navigation';

export const metadata: Metadata = {
  title: 'WildTrack360',
  description: 'Wildlife Career Management App',
};

const staticNavigationItems: CommandItem[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    subtitle: 'Overview, caseload, and key alerts',
    href: '/',
    group: 'Main',
    icon: 'dashboard',
    keywords: ['home', 'overview', 'caseload'],
  },
  {
    id: 'animals',
    title: 'Animals',
    subtitle: 'Browse and manage wildlife records',
    href: '/animals',
    group: 'Care',
    icon: 'animals',
    keywords: ['wildlife', 'records', 'patients'],
  },
  {
    id: 'compliance',
    title: 'Compliance',
    subtitle: 'Registers, reports, and care requirements',
    href: '/compliance',
    group: 'Compliance',
    icon: 'compliance',
    keywords: ['regulatory', 'requirements', 'audit'],
  },
  {
    id: 'compliance-register',
    title: 'Compliance Register',
    subtitle: 'Complete record of wildlife in care',
    href: '/compliance/register',
    group: 'Compliance',
    icon: 'docs',
    keywords: ['animal register', 'records'],
  },
  {
    id: 'carers',
    title: 'Carer Licence & CPD Tracker',
    subtitle: 'Manage licences, training, and carer records',
    href: '/compliance/carers',
    group: 'Compliance',
    icon: 'users',
    keywords: ['carers', 'licence', 'training', 'cpd'],
  },
  {
    id: 'call-logs',
    title: 'Call Logs',
    subtitle: 'Rescue and advice call records',
    href: '/compliance/call-logs',
    group: 'Compliance',
    icon: 'docs',
    keywords: ['calls', 'rescue', 'phone'],
  },
  {
    id: 'release-checklist',
    title: 'Release Checklist',
    subtitle: 'Pre-release assessment records',
    href: '/compliance/release-checklist',
    group: 'Compliance',
    icon: 'compliance',
    keywords: ['release', 'assessment'],
  },
  {
    id: 'hygiene-records',
    title: 'Hygiene Records',
    subtitle: 'Cleaning and disinfection logs',
    href: '/compliance/hygiene',
    group: 'Compliance',
    icon: 'docs',
    keywords: ['cleaning', 'biosecurity', 'disinfection'],
  },
  {
    id: 'incident-reports',
    title: 'Incident Reports',
    subtitle: 'Track and document incidents',
    href: '/compliance/incidents',
    group: 'Compliance',
    icon: 'docs',
    keywords: ['incidents', 'critical', 'safety'],
  },
  {
    id: 'nsw-report',
    title: 'NSW Annual Report',
    subtitle: 'Generate rehabilitation reporting exports',
    href: '/compliance/nsw-report',
    group: 'Reports',
    icon: 'reports',
    keywords: ['annual', 'nsw', 'report', 'spreadsheet'],
  },
  {
    id: 'preserved-specimens',
    title: 'Preserved Specimen Register',
    subtitle: 'Specimens and register-reference labels',
    href: '/compliance/preserved-specimens',
    group: 'Compliance',
    icon: 'docs',
    keywords: ['specimens', 'labels', 'register'],
  },
  {
    id: 'tools',
    title: 'Care Tools',
    subtitle: 'Feed roster and calculators',
    href: '/tools',
    group: 'Tools',
    icon: 'calculator',
    keywords: ['calculator', 'feeding', 'roster'],
  },
  {
    id: 'feed-roster',
    title: 'Feed Roster',
    subtitle: "Today's feeding schedule and overdue feeds",
    href: '/tools/feed-roster',
    group: 'Tools',
    icon: 'calculator',
    keywords: ['feeding', 'schedule', 'overdue'],
  },
  {
    id: 'flying-fox-calculator',
    title: 'Flying Fox Feed Calculator',
    subtitle: 'Milk volumes, feeds, and stage guidance',
    href: '/tools/feed-calculator/flying-fox',
    group: 'Tools',
    icon: 'calculator',
    keywords: ['flying fox', 'feed', 'milk'],
  },
  {
    id: 'macropod-calculator',
    title: 'Macropod Joey Feed Calculator',
    subtitle: 'Formula stage and daily feed plans',
    href: '/tools/feed-calculator/macropod',
    group: 'Tools',
    icon: 'calculator',
    keywords: ['kangaroo', 'wallaby', 'joey', 'feed'],
  },
  {
    id: 'admin',
    title: 'Admin Panel',
    subtitle: 'People, species, assets, and organisation settings',
    href: '/admin',
    group: 'Admin',
    icon: 'admin',
    keywords: ['settings', 'management'],
  },
  {
    id: 'admin-people',
    title: 'Manage People',
    subtitle: 'Organisation members, roles, and coordinators',
    href: '/admin?tab=people',
    group: 'Admin',
    icon: 'users',
    keywords: ['members', 'roles', 'carers'],
  },
  {
    id: 'admin-settings',
    title: 'Organisation Settings',
    subtitle: 'Animal ID format and organisation configuration',
    href: '/admin?tab=org-settings',
    group: 'Admin',
    icon: 'settings',
    keywords: ['organisation', 'configuration', 'animal id'],
  },
];

const staticActionItems: CommandItem[] = [
  {
    id: 'new-call-log',
    title: 'New Call Log',
    subtitle: 'Create a rescue or advice call record',
    href: '/compliance/call-logs/new',
    group: 'Actions',
    icon: 'docs',
    keywords: ['create call', 'rescue call'],
  },
  {
    id: 'new-release-checklist',
    title: 'New Release Checklist',
    subtitle: 'Start a pre-release assessment',
    href: '/compliance/release-checklist/new',
    group: 'Actions',
    icon: 'compliance',
    keywords: ['create release', 'assessment'],
  },
  {
    id: 'new-hygiene-record',
    title: 'New Hygiene Record',
    subtitle: 'Log cleaning or disinfection work',
    href: '/compliance/hygiene/new',
    group: 'Actions',
    icon: 'docs',
    keywords: ['create hygiene', 'cleaning'],
  },
  {
    id: 'new-incident-report',
    title: 'New Incident Report',
    subtitle: 'Document a new incident',
    href: '/compliance/incidents/new',
    group: 'Actions',
    icon: 'docs',
    keywords: ['create incident', 'safety'],
  },
];

const commandItems: CommandItem[] = [
  ...staticNavigationItems,
  ...staticActionItems,
  // Append tenant-specific recent records here as serializable CommandItem data.
];

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';

function normalizeHost(value: string | null | undefined): string | null {
  const rawHost = value?.split(',')[0]?.trim().toLowerCase();

  if (!rawHost) {
    return null;
  }

  try {
    return new URL(rawHost.includes('://') ? rawHost : `https://${rawHost}`).host;
  } catch {
    return null;
  }
}

function buildAllowedRedirectOrigins(currentHost: string | null): string[] {
  const rootDomain = normalizeHost(ROOT_DOMAIN);

  if (!rootDomain) {
    return [];
  }

  const allowedHosts = new Set([rootDomain]);
  const tenantHost = normalizeHost(currentHost);

  if (tenantHost === rootDomain || tenantHost?.endsWith(`.${rootDomain}`)) {
    allowedHosts.add(tenantHost);
  }

  return Array.from(allowedHosts).flatMap(host => [
    new URL(`https://${host}`).origin,
    new URL(`http://${host}`).origin,
  ]);
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headerStore = await headers();
  const allowedRedirectOrigins = buildAllowedRedirectOrigins(headerStore.get('host'));
  const { userId, orgId } = await auth();
  let workspaceRole: OrgRole | null = null;

  if (userId && orgId) {
    try {
      workspaceRole = await getUserRole(userId, orgId);
    } catch (error) {
      console.error('Unable to load workspace navigation role:', error);
    }
  }

  const visibleCommandItems = filterCommandItemsForRole(commandItems, workspaceRole);

  return (
    <ClerkProvider allowedRedirectOrigins={allowedRedirectOrigins}>
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Alegreya:wght@400;700&family=PT+Sans:wght@400;700&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className="font-body antialiased min-h-screen">
          <GoogleMapsProvider>
            <WorkspaceShell role={workspaceRole}>{children}</WorkspaceShell>
          </GoogleMapsProvider>
          <CommandPalette items={visibleCommandItems} />
          <WallyAssistant />
          <Toaster closeButton richColors position="top-right" />
          <LegacyToaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
