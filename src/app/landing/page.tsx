import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold font-headline text-primary">
                WildTrack360
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <SignInButton>
                <Button variant="outline">Sign In</Button>
              </SignInButton>
              <SignUpButton>
                <Button>Get Started</Button>
              </SignUpButton>
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Hero Section */}
          <div className="text-center py-16">
            <div className="flex justify-center mb-8">
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
            <h1 className="text-5xl font-bold text-primary mb-6">
              Wildlife Conservation Management
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Track animals throughout their entire lifecycle, from initial admission to release. 
              Manage critical assets, ensure compliance, and streamline wildlife care operations.
            </p>
            <div className="flex justify-center gap-4">
              <SignUpButton>
                <Button size="lg" className="text-lg px-8 py-3">
                  Start Free Trial
                </Button>
              </SignUpButton>
              <SignInButton>
                <Button variant="outline" size="lg" className="text-lg px-8 py-3">
                  Sign In
                </Button>
              </SignInButton>
            </div>
          </div>
          
          {/* Features Section */}
          <div className="grid md:grid-cols-3 gap-8 py-16">
            <div className="text-center">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🐾</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Animal Tracking</h3>
              <p className="text-muted-foreground">
                Comprehensive tracking from admission to release with detailed records and photos.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🛡️</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Compliance Management</h3>
              <p className="text-muted-foreground">
                Ensure adherence to wildlife codes of practice and regulatory requirements.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Analytics & Reporting</h3>
              <p className="text-muted-foreground">
                Powerful insights and reports to optimize wildlife care operations.
              </p>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="text-center py-8 text-muted-foreground border-t">
        <p>&copy; {new Date().getFullYear()} WildTrack360. All rights reserved.</p>
      </footer>
    </div>
  );
}
