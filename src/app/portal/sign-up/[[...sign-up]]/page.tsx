'use client';

import { SignUp } from '@/lib/clerk-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HeartHandshake } from 'lucide-react';

export default function PortalSignUpPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 rounded-full bg-primary/10 p-3 w-fit text-primary">
            <HeartHandshake className="h-6 w-6" />
          </div>
          <CardTitle>Activate your portal access</CardTitle>
          <p className="text-sm text-muted-foreground">
            Use the same email your wildlife organisation has on file. We will match
            you to your existing membership automatically.
          </p>
        </CardHeader>
        <CardContent className="flex justify-center">
          <SignUp
            routing="path"
            path="/portal/sign-up"
            signInUrl="/portal/sign-in"
            forceRedirectUrl="/portal"
            fallbackRedirectUrl="/portal"
          />
        </CardContent>
      </Card>
    </div>
  );
}
