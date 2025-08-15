"use client";

import { SignIn, SignInButton } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PawPrint, ArrowLeft, Shield, Users, BarChart3, CheckCircle, LogIn } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const [showFullSignIn, setShowFullSignIn] = useState(false);
  
  // Check if we should show the full Clerk sign-in (when redirected from Clerk)
  useEffect(() => {
    // If there are Clerk-specific params in the URL, show the full sign-in
    if (searchParams.get('redirect_url') || searchParams.get('after_sign_in_url')) {
      setShowFullSignIn(true);
    }
  }, [searchParams]);

  // If showing full Clerk sign-in
  if (showFullSignIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted/20">
        <SignIn forceRedirectUrl="/" />
      </div>
    );
  }

  // Otherwise show our custom landing page
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <PawPrint className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold font-headline text-primary">
                WildTrack360
              </h1>
            </div>
            <Link href="/landing">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          {/* Left Column - Sign In Options */}
          <div className="order-2 lg:order-1">
            <div className="max-w-md mx-auto space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-2">Welcome Back</h2>
                <p className="text-muted-foreground">
                  Choose how you'd like to sign in to your account
                </p>
              </div>
              
              <Card className="shadow-xl">
                <CardHeader>
                  <CardTitle>Sign In</CardTitle>
                  <CardDescription>
                    Access your wildlife management dashboard
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <SignInButton mode="redirect" forceRedirectUrl="/">
                    <Button className="w-full" size="lg">
                      <LogIn className="mr-2 h-5 w-5" />
                      Sign In with Email
                    </Button>
                  </SignInButton>
                </CardContent>
              </Card>
              
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Access is managed by your organization administrator
                </p>
                <p className="text-xs text-muted-foreground">
                  By signing in, you agree to our Terms of Service and Privacy Policy
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Features */}
          <div className="order-1 lg:order-2 space-y-8">
            <div className="text-center lg:text-left">
              <div className="flex justify-center lg:justify-start mb-6">
                <div className="relative h-32 w-64">
                  <Image
                    src="/Brandmark-Text-Vert.svg"
                    alt="WildTrack360 Logo"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
              </div>
              
              <h3 className="text-2xl font-bold mb-4">
                Comprehensive Wildlife Management
              </h3>
              <p className="text-muted-foreground mb-8">
                Join wildlife organizations across Australia in streamlining their rehabilitation and care operations.
              </p>
            </div>

            {/* Feature List */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
                  <PawPrint className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Track Every Animal</h4>
                  <p className="text-sm text-muted-foreground">
                    From rescue to release, maintain complete records for every animal in your care.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-primary/10 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Stay Compliant</h4>
                  <p className="text-sm text-muted-foreground">
                    Built-in tools for Australian wildlife codes of practice and regulations.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-primary/10 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Manage Your Team</h4>
                  <p className="text-sm text-muted-foreground">
                    Coordinate carers, track licenses, and manage training requirements.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-primary/10 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Generate Reports</h4>
                  <p className="text-sm text-muted-foreground">
                    Instant compliance reports and analytics for better decision making.
                  </p>
                </div>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="pt-6 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-muted-foreground">Secure cloud storage</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-muted-foreground">Multi-jurisdiction support</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-muted-foreground">30-day free trial</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-8 text-muted-foreground border-t mt-auto">
        <div className="container mx-auto px-4">
          <p>&copy; {new Date().getFullYear()} WildTrack360. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
