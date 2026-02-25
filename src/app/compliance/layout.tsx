import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ShieldOff } from 'lucide-react';
import { requireMinimumRole } from '@/lib/rbac';
import { getServerJurisdiction } from '@/lib/server-config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function ComplianceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect('/sign-in');

  try {
    await requireMinimumRole(userId, orgId, 'COORDINATOR');
  } catch {
    redirect('/');
  }

  const jurisdiction = await getServerJurisdiction(orgId);

  if (jurisdiction === 'NATIONAL') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <ShieldOff className="h-12 w-12 text-muted-foreground" />
            </div>
            <CardTitle>Compliance Reporting Not Available</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your organisation&apos;s jurisdiction does not currently have state-specific compliance requirements configured. Compliance reporting is available for jurisdictions with defined regulatory frameworks.
            </p>
            <p className="text-sm text-muted-foreground">
              If you believe this is incorrect, please contact your administrator to update your organisation&apos;s jurisdiction setting.
            </p>
            <Link href="/">
              <Button className="mt-2">Return to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
