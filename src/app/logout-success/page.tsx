"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PawPrint, CheckCircle, ArrowLeft, Home } from "lucide-react";
import { SignInButton } from "@clerk/nextjs";

export default function LogoutSuccessPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
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
                <Home className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>
      
      <main className="flex-grow flex items-center justify-center px-4 py-16">
        <Card className="max-w-md w-full shadow-xl">
          <CardContent className="p-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">You've been signed out</h1>
              <p className="text-muted-foreground">
                Thank you for using WildTrack360. Your session has been securely ended.
              </p>
            </div>
            
            <div className="pt-4 space-y-3">
              <Link href="/landing" className="block">
                <Button variant="outline" className="w-full" size="lg">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Return to Home
                </Button>
              </Link>
            </div>
            
            <div className="pt-6 border-t">
              <p className="text-sm text-muted-foreground">
                Remember to save your work regularly and keep your login credentials secure.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
      
      <footer className="text-center py-8 text-muted-foreground border-t">
        <p>&copy; {new Date().getFullYear()} WildTrack360. All rights reserved.</p>
      </footer>
    </div>
  );
}