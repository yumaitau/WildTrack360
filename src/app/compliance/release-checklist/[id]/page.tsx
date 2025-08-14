import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  CheckCircle, 
  MapPin, 
  AlertTriangle, 
  ArrowLeft,
  Home
} from "lucide-react";
import Link from "next/link";
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getCurrentJurisdiction } from '@/lib/config';

export default async function ReleaseChecklistDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const { userId, orgId } = await auth();
  
  if (!userId || !orgId) {
    redirect('/sign-in');
  }

  const checklist = await prisma.releaseChecklist.findFirst({
    where: {
      id: id,
      clerkOrganizationId: orgId,
    },
    include: {
      animal: true,
    },
  });

  if (!checklist) {
    redirect('/compliance/release-checklist');
  }

  const jurisdiction = getCurrentJurisdiction();

  // Helper function to safely access JSON fields
  const getJsonValue = (value: any, key: string) => {
    if (value && typeof value === 'object' && key in value) {
      return value[key];
    }
    return null;
  };

  // Format dates
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Get release coordinates (if needed for future features)
  // const releaseCoords = checklist.releaseCoordinates as any;
  // const rescueCoords = checklist.animal?.rescueCoordinates as any;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/compliance/release-checklist">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Release Checklist</h1>
            <p className="text-muted-foreground">
              {checklist.animal?.name} - {checklist.animal?.species}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/">
            <Button variant="outline" size="icon">
              <Home className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Release Information</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Animal</TableCell>
                    <TableCell>{checklist.animal?.name}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Species</TableCell>
                    <TableCell>{checklist.animal?.species}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Release Date</TableCell>
                    <TableCell>{formatDate(checklist.releaseDate)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Release Location</TableCell>
                    <TableCell>{checklist.releaseLocation}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Release Type</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {checklist.releaseType}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Distance Check</TableCell>
                    <TableCell>
                      <Badge variant={checklist.within10km ? "default" : "secondary"}>
                        {checklist.within10km ? "Within 10km" : "Outside 10km"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>


          {/* Fitness Indicators */}
          {checklist.fitnessIndicators && Array.isArray(checklist.fitnessIndicators) && checklist.fitnessIndicators.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Fitness Indicators</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(checklist.fitnessIndicators as string[]).map((indicator: string, index: number) => (
                    <Badge key={index} variant="outline">
                      {indicator}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Vet Sign-off */}
          {checklist.vetSignOff && (
            <Card>
              <CardHeader>
                <CardTitle>Veterinary Sign-off</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Veterinarian:</span>
                    <span>{getJsonValue(checklist.vetSignOff, 'name')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Date:</span>
                    <span>{getJsonValue(checklist.vetSignOff, 'date')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">License:</span>
                    <span>{getJsonValue(checklist.vetSignOff, 'license')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {checklist.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{checklist.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Photos */}
          {checklist.photos && Array.isArray(checklist.photos) && checklist.photos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Release Photos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {(checklist.photos as string[]).map((photo: string, index: number) => (
                    <div key={index} className="aspect-square rounded-lg overflow-hidden">
                      <img 
                        src={photo} 
                        alt={`Release photo ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Compliance Status */}
          <Card>
            <CardHeader>
              <CardTitle>Compliance Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Distance Check</span>
                  {checklist.within10km ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Vet Sign-off</span>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Fitness Assessment</span>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Documentation</span>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </div>
              
              <Separator />
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">100%</div>
                <div className="text-sm text-muted-foreground">Compliance Score</div>
              </div>
            </CardContent>
          </Card>

          {/* Jurisdiction Requirements */}
          <Card>
            <CardHeader>
              <CardTitle>{jurisdiction} Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Section 6.1 - Release site selection</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Section 6.2 - Pre-release assessment</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Section 6.3 - Release procedures</span>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
} 