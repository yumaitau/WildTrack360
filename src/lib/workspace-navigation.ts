import type { OrgRole } from '@prisma/client';

export type WorkspaceNavigationIcon =
  | 'animals'
  | 'calls'
  | 'compliance'
  | 'dashboard'
  | 'feed'
  | 'forms'
  | 'organisation'
  | 'tools'
  | 'community';

export type WorkspaceNavigationItem = {
  id: WorkspaceNavigationIcon;
  label: string;
  mobileLabel: string;
  href: string;
  icon: WorkspaceNavigationIcon;
};

const CARER_NAVIGATION: WorkspaceNavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', mobileLabel: 'Home', href: '/', icon: 'dashboard' },
  { id: 'animals', label: 'My Animals', mobileLabel: 'Animals', href: '/animals', icon: 'animals' },
  {
    id: 'feed',
    label: 'Feed Roster',
    mobileLabel: 'Feed',
    href: '/tools/feed-roster',
    icon: 'feed',
  },
  { id: 'forms', label: 'Forms', mobileLabel: 'Forms', href: '/forms', icon: 'forms' },
  { id: 'tools', label: 'Care Tools', mobileLabel: 'Tools', href: '/tools', icon: 'tools' },
  {
    id: 'community',
    label: 'Community',
    mobileLabel: 'Community',
    href: '/community',
    icon: 'community',
  },
];

const COORDINATOR_NAVIGATION: WorkspaceNavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', mobileLabel: 'Home', href: '/', icon: 'dashboard' },
  { id: 'animals', label: 'Animals', mobileLabel: 'Animals', href: '/animals', icon: 'animals' },
  {
    id: 'calls',
    label: 'Call Logs',
    mobileLabel: 'Calls',
    href: '/compliance/call-logs',
    icon: 'calls',
  },
  {
    id: 'compliance',
    label: 'Compliance',
    mobileLabel: 'Compliance',
    href: '/compliance',
    icon: 'compliance',
  },
  { id: 'forms', label: 'Forms', mobileLabel: 'Forms', href: '/forms', icon: 'forms' },
  { id: 'tools', label: 'Care Tools', mobileLabel: 'Tools', href: '/tools', icon: 'tools' },
  {
    id: 'organisation',
    label: 'Organisation',
    mobileLabel: 'Organisation',
    href: '/admin',
    icon: 'organisation',
  },
  {
    id: 'community',
    label: 'Community',
    mobileLabel: 'Community',
    href: '/community',
    icon: 'community',
  },
];

const WORKSPACE_PREFIXES = ['/animals', '/compliance', '/admin', '/tools', '/forms', '/community'];
const PRINT_ROUTE_PATTERNS = [
  /\/print(?:\/|$)/,
  /\/receipt(?:\/|$)/,
  /\/statements\/view(?:\/|$)/,
  /\/preserved-specimens\/[^/]+\/label(?:\/|$)/,
];

export function isCoordinatorRole(role: OrgRole): boolean {
  return role === 'ADMIN' || role === 'COORDINATOR' || role === 'COORDINATOR_ALL';
}

export type WorkspaceNavigationOptions = {
  // CUSTOM_FORMS is an org feature flag; the Forms entry ships dark until the
  // flag is enabled for the org (mirrors how the routes 404 when disabled).
  customFormsEnabled?: boolean;
  // COMMUNITY_BOARD org feature flag; the Community entry ships dark until the
  // caller's home org is enabled (mirrors how the routes 404 when disabled).
  communityEnabled?: boolean;
};

export function getWorkspaceNavigation(
  role: OrgRole,
  options: WorkspaceNavigationOptions = {}
): WorkspaceNavigationItem[] {
  const items = isCoordinatorRole(role) ? COORDINATOR_NAVIGATION : CARER_NAVIGATION;
  return items.filter(
    (item) =>
      (item.id !== 'forms' || options.customFormsEnabled) &&
      (item.id !== 'community' || options.communityEnabled)
  );
}

export function getMobilePrimaryNavigation(
  role: OrgRole,
  options: WorkspaceNavigationOptions = {}
): WorkspaceNavigationItem[] {
  const items = getWorkspaceNavigation(role, options);
  return isCoordinatorRole(role) ? items.slice(0, 4) : items;
}

export function getMobileMoreNavigation(
  role: OrgRole,
  options: WorkspaceNavigationOptions = {}
): WorkspaceNavigationItem[] {
  const primaryIds = new Set(getMobilePrimaryNavigation(role, options).map((item) => item.id));
  return getWorkspaceNavigation(role, options).filter((item) => !primaryIds.has(item.id));
}

export function getActiveWorkspaceNavigationId(
  pathname: string,
  items: WorkspaceNavigationItem[]
): WorkspaceNavigationItem['id'] | null {
  const match = [...items]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) =>
      item.href === '/'
        ? pathname === '/'
        : pathname === item.href || pathname.startsWith(`${item.href}/`)
    );

  return match?.id ?? null;
}

export function isWorkspaceRoute(pathname: string): boolean {
  if (PRINT_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname))) return false;
  return (
    pathname === '/' ||
    WORKSPACE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  );
}

export function filterCommandItemsForRole<T extends { id: string; group?: string }>(
  items: T[],
  role: OrgRole | null
): T[] {
  if (!role) return [];
  if (role === 'ADMIN') return items;

  if (isCoordinatorRole(role)) {
    return items.filter((item) => item.id !== 'admin-people' && item.id !== 'admin-settings');
  }

  const allowedGroups = new Set(['Main', 'Care', 'Tools']);
  return items.filter((item) => item.group && allowedGroups.has(item.group));
}

export function getWorkspaceRoleLabel(role: OrgRole): string {
  switch (role) {
    case 'ADMIN':
      return 'Administrator';
    case 'COORDINATOR':
      return 'Coordinator';
    case 'COORDINATOR_ALL':
      return 'Coordinator (all species)';
    case 'CARER_ALL':
      return 'Carer (all animals)';
    default:
      return 'Carer';
  }
}
