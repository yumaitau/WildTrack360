'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import { PawPrint, ShieldAlert, Clock, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SetupRoleClient({
  isClerkAdmin,
  orgName,
}: {
  isClerkAdmin: boolean;
  orgName: string;
}) {
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { signOut } = useClerk();

  async function handleProvision() {
    setIsProvisioning(true);
    setError('');

    try {
      const res = await fetch('/api/rbac/provision', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to set up role');
      }
      // Success — redirect to admin
      router.push('/admin');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setIsProvisioning(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
      {/* Minimal header — no navigation links */}
      <header className="bg-card/80 backdrop-blur-sm shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <PawPrint className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold font-headline text-primary">
                WildTrack360
              </h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut({ redirectUrl: '/landing' })}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Centered content */}
      <main className="flex-1 flex items-center justify-center px-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            {isClerkAdmin ? (
              <>
                <div className="mx-auto mb-4 bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center">
                  <ShieldAlert className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Set Up Your Role</CardTitle>
                <CardDescription className="text-base mt-2">
                  WildTrack360 has upgraded to a new role-based access system.
                  As an admin of <strong>{orgName}</strong>, you need to activate
                  your admin role to continue.
                </CardDescription>
              </>
            ) : (
              <>
                <div className="mx-auto mb-4 bg-amber-100 rounded-full w-16 h-16 flex items-center justify-center">
                  <Clock className="h-8 w-8 text-amber-600" />
                </div>
                <CardTitle className="text-2xl">Access Pending</CardTitle>
                <CardDescription className="text-base mt-2">
                  WildTrack360 has upgraded to a new role-based access system.
                  An admin of <strong>{orgName}</strong> needs to assign your
                  role before you can access the application.
                </CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent>
            {isClerkAdmin ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  This will set you up as an <strong>Admin</strong> in the new
                  system. You can then assign roles to other members of your
                  organisation from the Admin panel.
                </p>

                {error && (
                  <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <Button
                  onClick={handleProvision}
                  disabled={isProvisioning}
                  className="w-full"
                  size="lg"
                >
                  {isProvisioning ? 'Setting up...' : 'Activate Admin Role'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Please contact your organisation administrator and ask them to
                  assign you a role (Admin, Coordinator, or Carer) in the new
                  system. Once your role is assigned, you will be able to access
                  WildTrack360 as normal.
                </p>
                <div className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
                  If you believe this is an error, please reach out to the person
                  who manages your WildTrack360 organisation.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <footer className="text-center py-6 text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} WildTrack360. All rights reserved.</p>
      </footer>
    </div>
  );
}
