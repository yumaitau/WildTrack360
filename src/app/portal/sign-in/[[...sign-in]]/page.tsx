'use client';

import { SignIn } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HeartHandshake } from 'lucide-react';

export default function PortalSignInPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 rounded-full bg-primary/10 p-3 w-fit text-primary">
            <HeartHandshake className="h-6 w-6" />
          </div>
          <CardTitle>Member portal</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sign in with the email address your wildlife organisation has on file.
          </p>
        </CardHeader>
        <CardContent className="flex justify-center">
          <SignIn
            routing="path"
            path="/portal/sign-in"
            signUpUrl="/portal/sign-up"
            forceRedirectUrl="/portal"
            fallbackRedirectUrl="/portal"
          />
        </CardContent>
      </Card>
    </div>
  );
}
