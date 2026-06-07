import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { SignOutButton } from '@clerk/nextjs';

export default function NoMembershipPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 rounded-full bg-amber-500/10 p-3 w-fit text-amber-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <CardTitle>No membership found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground text-center">
          <p>
            We could not match your account to an existing membership. Please contact
            your wildlife organisation to confirm the email address they have on file.
          </p>
          <div className="flex flex-col gap-2">
            <SignOutButton redirectUrl="/portal/sign-in">
              <Button variant="outline" className="w-full">Sign out</Button>
            </SignOutButton>
            <Link href="/">
              <Button variant="ghost" className="w-full">Back to homepage</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
