'use client';

import type { OrgRole } from '@prisma/client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  Calculator,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  PawPrint,
  PhoneCall,
  Search,
  Settings,
  ShieldCheck,
  Utensils,
} from 'lucide-react';

import { COMMAND_PALETTE_OPEN_EVENT } from '@/components/command-palette';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useClerk, useOrganization, useUser } from '@/lib/clerk-client';
import { cn } from '@/lib/utils';
import {
  getActiveWorkspaceNavigationId,
  getMobileMoreNavigation,
  getMobilePrimaryNavigation,
  getWorkspaceNavigation,
  getWorkspaceRoleLabel,
  isWorkspaceRoute,
  type WorkspaceNavigationIcon,
  type WorkspaceNavigationItem,
} from '@/lib/workspace-navigation';

const ICONS: Record<WorkspaceNavigationIcon, React.ComponentType<{ className?: string }>> = {
  animals: PawPrint,
  calls: PhoneCall,
  compliance: ShieldCheck,
  dashboard: LayoutDashboard,
  feed: Utensils,
  forms: ClipboardList,
  organisation: Settings,
  tools: Calculator,
};

function openCommandPalette() {
  window.dispatchEvent(new Event(COMMAND_PALETTE_OPEN_EVENT));
}

function DesktopNavigationLink({
  item,
  active,
}: {
  item: WorkspaceNavigationItem;
  active: boolean;
}) {
  const Icon = ICONS[item.icon];

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </Link>
  );
}

function MobileNavigationLink({
  item,
  active,
}: {
  item: WorkspaceNavigationItem;
  active: boolean;
}) {
  const Icon = ICONS[item.icon];

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 py-1.5 text-[11px] font-medium transition-colors',
        active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <span className={cn('rounded-md p-1', active && 'bg-primary/10')}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="max-w-full truncate">{item.mobileLabel}</span>
    </Link>
  );
}

export function WorkspaceShell({
  children,
  role,
  customFormsEnabled = false,
}: {
  children: React.ReactNode;
  role: OrgRole | null;
  customFormsEnabled?: boolean;
}) {
  const pathname = usePathname();
  const { user } = useUser();
  const { organization } = useOrganization();
  const { signOut } = useClerk();

  if (!role || !isWorkspaceRoute(pathname)) return <>{children}</>;

  const navOptions = { customFormsEnabled };
  const navigation = getWorkspaceNavigation(role, navOptions);
  const mobilePrimary = getMobilePrimaryNavigation(role, navOptions);
  const mobileMore = getMobileMoreNavigation(role, navOptions);
  const activeId = getActiveWorkspaceNavigationId(pathname, navigation);
  const moreActive = mobileMore.some((item) => item.id === activeId);
  const roleLabel = getWorkspaceRoleLabel(role);
  const userName = user?.fullName || user?.firstName || 'Account';
  const initials = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .map((part) => part?.charAt(0).toUpperCase())
    .join('') || 'WT';

  return (
    <div data-workspace-shell="">
      <header className="sticky top-0 z-40 border-b bg-card">
        <div className="container mx-auto flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-2 text-primary">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <PawPrint className="h-5 w-5" />
            </span>
            <span className="hidden text-lg font-semibold sm:inline">WildTrack360</span>
            <span className="max-w-32 truncate text-sm font-medium text-foreground sm:hidden">
              {organization?.name || 'WildTrack360'}
            </span>
          </Link>

          <nav aria-label="Workspace" className="ml-2 hidden min-w-0 flex-1 items-center gap-1 xl:flex">
            {navigation.map((item) => (
              <DesktopNavigationLink key={item.id} item={item} active={activeId === item.id} />
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="hidden h-10 min-w-36 justify-between gap-3 text-muted-foreground md:inline-flex"
              onClick={openCommandPalette}
              aria-label="Search and navigate"
            >
              <span className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search
              </span>
              <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px]">⌘/Ctrl K</kbd>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={openCommandPalette}
              aria-label="Search and navigate"
            >
              <Search className="h-5 w-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="hidden h-11 gap-2 px-2 xl:inline-flex">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    {initials}
                  </span>
                  <span className="max-w-36 text-left leading-tight">
                    <span className="block truncate text-sm font-medium">{userName}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {organization?.name || roleLabel}
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="space-y-1">
                  <span className="block truncate">{userName}</span>
                  <span className="block truncate text-xs font-normal text-muted-foreground">
                    {organization?.name || roleLabel}
                  </span>
                  <span className="block text-xs font-normal text-muted-foreground">{roleLabel}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ redirectUrl: '/logout-success' })}>
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="pb-24 xl:pb-0">{children}</div>

      <div
        data-workspace-bottom-nav=""
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card px-2 pb-[env(safe-area-inset-bottom)] xl:hidden"
      >
        <nav aria-label="Primary workspace" className="grid h-16 grid-cols-5 gap-1">
          {mobilePrimary.map((item) => (
            <MobileNavigationLink key={item.id} item={item} active={activeId === item.id} />
          ))}

          <Sheet>
            <SheetTrigger asChild>
              <button
                type="button"
                className={cn(
                  'flex min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 py-1.5 text-[11px] font-medium transition-colors',
                  moreActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
                aria-label="More navigation and account options"
              >
                <span className={cn('rounded-md p-1', moreActive && 'bg-primary/10')}>
                  <Menu className="h-5 w-5" />
                </span>
                More
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
              <SheetHeader className="pr-8 text-left">
                <SheetTitle>Workspace</SheetTitle>
                <SheetDescription>Navigation and account options</SheetDescription>
              </SheetHeader>

              {mobileMore.length > 0 && (
                <nav aria-label="More workspace destinations" className="mt-5 grid gap-2">
                  {mobileMore.map((item) => {
                    const Icon = ICONS[item.icon];
                    const active = activeId === item.id;
                    return (
                      <SheetClose asChild key={item.id}>
                        <Link
                          href={item.href}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'flex min-h-12 items-center gap-3 rounded-md px-3 text-sm font-medium',
                            active ? 'bg-primary/10 text-primary' : 'bg-muted/60 text-foreground'
                          )}
                        >
                          <Icon className="h-5 w-5" />
                          {item.label}
                        </Link>
                      </SheetClose>
                    );
                  })}
                </nav>
              )}

              <div className="mt-6 rounded-lg border bg-muted/40 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background text-sm font-semibold">
                    {initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{userName}</p>
                    <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      {organization?.name || 'WildTrack360'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{roleLabel}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 w-full"
                  onClick={() => signOut({ redirectUrl: '/logout-success' })}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </nav>
      </div>
    </div>
  );
}
