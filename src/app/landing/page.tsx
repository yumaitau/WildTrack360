"use client";

import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PawPrint, Shield, BarChart3, Users, CheckCircle, LogIn } from "lucide-react";

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If user is already signed in, redirect to home
    if (isLoaded && isSignedIn) {
      router.push('/');
    }
  }, [isSignedIn, isLoaded, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="bg-card/80 backdrop-blur-sm shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <PawPrint className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold font-headline text-primary">
                WildTrack360
              </h1>
            </div>
            <Link href="/sign-in">
              <Button size="lg">
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center py-16 space-y-8">
          <div className="flex justify-center">
            <div className="relative h-48 w-96">
              <Image
                src="/Brandmark-Text-Vert.svg"
                alt="WildTrack360 Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          
          <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-5xl lg:text-6xl font-bold text-primary">
              Wildlife Care Management
              <span className="block text-3xl lg:text-4xl mt-2 text-muted-foreground">
                Made Simple
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Comprehensive wildlife rehabilitation tracking, compliance management, and care coordination 
              for Australian wildlife organizations.
            </p>
          </div>
          
          <div className="flex justify-center pt-4">
            <Link href="/sign-in">
              <Button size="lg" className="text-lg px-10 py-6 shadow-lg hover:shadow-xl transition-all">
                <LogIn className="mr-2 h-5 w-5" />
                Sign In to Dashboard
              </Button>
            </Link>
          </div>
          
          <p className="text-sm text-muted-foreground pt-4">
            Contact your organization administrator for access
          </p>
        </div>
        
        {/* Trust Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-12 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium">ACT Wildlife Compliant</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium">Multi-Jurisdiction Support</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium">Secure Cloud Storage</span>
          </div>
        </div>
        
        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 py-16">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center space-y-4">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                <PawPrint className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Animal Tracking</h3>
              <p className="text-muted-foreground text-sm">
                Track every animal from rescue to release with detailed medical records and care notes.
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center space-y-4">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Compliance Ready</h3>
              <p className="text-muted-foreground text-sm">
                Built-in compliance tools for Australian wildlife codes of practice and regulations.
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center space-y-4">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Carer Management</h3>
              <p className="text-muted-foreground text-sm">
                Manage carers, track licenses, training, and coordinate care assignments efficiently.
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center space-y-4">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                <BarChart3 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Analytics & Reports</h3>
              <p className="text-muted-foreground text-sm">
                Generate compliance reports, track outcomes, and gain insights into your operations.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <footer className="text-center py-8 text-muted-foreground border-t mt-16">
        <div className="container mx-auto px-4">
          <p>&copy; {new Date().getFullYear()} WildTrack360. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}