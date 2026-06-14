'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignOutButton } from '@/lib/clerk-client';
import { Button } from '@/components/ui/button';
import {
  CreditCard, Heart, HeartHandshake, LayoutDashboard, LogOut, Mail, Megaphone,
  Receipt, Sparkles, Ticket, UserCog,
} from 'lucide-react';

const NAV = [
  { href: '/portal', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/portal/impact', label: 'Impact', icon: Sparkles },
  { href: '/portal/card', label: 'Card', icon: CreditCard },
  { href: '/portal/news', label: 'News', icon: Megaphone },
  { href: '/portal/messages', label: 'Messages', icon: Mail },
  { href: '/portal/membership', label: 'Membership', icon: Ticket },
  { href: '/portal/donate', label: 'Donate', icon: Heart },
  { href: '/portal/payments', label: 'Receipts', icon: Receipt },
  { href: '/portal/profile', label: 'Profile', icon: UserCog },
];

export function PortalShell({
  children,
  memberName,
  unreadCount = 0,
}: {
  children: React.ReactNode;
  memberName: string;
  unreadCount?: number;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 text-primary p-2">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Member portal</div>
              <div className="font-semibold">{memberName}</div>
            </div>
          </div>
          <SignOutButton redirectUrl="/portal/sign-in">
            <Button variant="ghost" size="sm">
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </SignOutButton>
        </div>
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8 pb-2 flex gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            const showBadge = href === '/portal/messages' && unreadCount > 0;
            return (
              <Link
                key={href}
                href={href}
                className={
                  'inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ' +
                  (active ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground')
                }
              >
                <Icon className="h-4 w-4" /> {label}
                {showBadge && (
                  <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
