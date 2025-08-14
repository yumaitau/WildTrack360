import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Download, ArrowLeft, Award, Shield, Home, Calendar } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { Table, TableHead, TableHeader, TableRow, TableCell, TableBody } from "@/components/ui/table";
import { FileText } from "lucide-react";
import { XCircle } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { CheckCircle } from "lucide-react";

interface CarerDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CarerDetailPage({ params }: CarerDetailPageProps) {
  const { id } = await params;
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  const organizationId = orgId || '';

  const carer = await prisma.carer.findFirst({
    where: { id: id, clerkUserId: userId, clerkOrganizationId: organizationId },
  });
  if (!carer) notFound();

  const carerAnimals = await prisma.animal.findMany({
    where: { carerId: carer.id, clerkUserId: userId, clerkOrganizationId: organizationId },
    orderBy: { dateFound: 'desc' },
  });
  const animalsInCare = carerAnimals.filter(a => a.status === 'IN_CARE');
  const releasedAnimals = carerAnimals.filter(a => a.status === 'RELEASED');

  const computeAnimalAge = (dateOfBirth: Date | string | null | undefined, fallbackAge?: string | null): string => {
    if (dateOfBirth) {
      const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
      if (!isNaN(dob.getTime())) {
        const now = new Date();
        let years = now.getFullYear() - dob.getFullYear();
        let months = now.getMonth() - dob.getMonth();
        let days = now.getDate() - dob.getDate();
        if (days < 0) {
          months -= 1;
          const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
          days += prevMonth.getDate();
        }
        if (months < 0) {
          years -= 1;
          months += 12;
        }
        if (years > 0) return `${years}y`;
        if (months > 0) return `${months}m`;
        return `${Math.max(days, 0)}d`;
      }
    }
    return (fallbackAge && fallbackAge.trim()) ? fallbackAge : '—';
  };

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <Link href="/">
              <Button variant="outline" size="icon">
                <Home className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/compliance/carers">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div>
            <h1 className="text-3xl font-bold">{carer.name}</h1>
            <p className="text-muted-foreground">{carer.email || 'No email'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/compliance/carers/${carer.id}/edit`}>
            <Button>Edit Carer</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Licence Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                License Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Licence Number</label>
                  <p className="text-lg font-mono">{carer.licenseNumber || '—'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Active</label>
                  <Badge variant="outline" className="text-sm">{carer.active ? 'Yes' : 'No'}</Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Jurisdiction</label>
                  <Badge variant="outline" className="text-sm">
                    {carer.jurisdiction || '—'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Specialties */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Specialties
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(carer.specialties || []).map((sp, index) => (
                  <Badge key={index} variant="secondary" className="text-sm">
                    {sp}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Areas of expertise for the carer.
              </p>
            </CardContent>
          </Card>

          {/* Training History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Training History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* @ts-expect-error: trainingHistory may not exist on carer type */}
                  {(carer.trainingHistory ?? []).map((training: any) => {
                    const isExpired = training.expiryDate && new Date(training.expiryDate) < new Date();
                    const isExpiringSoon = training.expiryDate && 
                      new Date(training.expiryDate) > new Date() && 
                      new Date(training.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                    return (
                      <TableRow key={training.id}>
                        <TableCell className="font-medium">{training.courseName}</TableCell>
                        <TableCell>{training.provider}</TableCell>
                        <TableCell>{training.date}</TableCell>
                        <TableCell>
                          {training.expiryDate ? (
                            <div className="flex items-center gap-2">
                              <span>{training.expiryDate}</span>
                              {isExpired ? (
                                <Badge variant="destructive" className="text-xs">
                                  Expired
                                </Badge>
                              ) : isExpiringSoon ? (
                                <Badge variant="outline" className="text-xs text-orange-600">
                                  Soon
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  Valid
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No expiry</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {training.certificateUrl ? (
                            <Button variant="outline" size="sm">
                              <Download className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          ) : (
                            <span className="text-muted-foreground">No certificate</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Current Animals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Current Animals in Care
              </CardTitle>
            </CardHeader>
            <CardContent>
              {animalsInCare.length > 0 ? (
                <div className="space-y-3">
                  {animalsInCare.map((animal) => (
                    <div key={animal.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <div className="font-medium">{animal.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {animal.species} • {computeAnimalAge((animal as any).dateOfBirth, (animal as any).age)}
                        </div>
                      </div>
                      <Link href={`/animals/${animal.id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No animals currently in care</p>
              )}
            </CardContent>
          </Card>
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
                  <span className="text-sm">Licence Status</span>
                    {carer.licenseExpiry && new Date(carer.licenseExpiry) < new Date() ? (
                    <XCircle className="h-4 w-4 text-red-600" />
                  ) : carer.licenseExpiry && new Date(carer.licenseExpiry) > new Date() ? (
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Training Current</span>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Species Authorised</span>
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

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{animalsInCare.length}</div>
                  <div className="text-sm text-muted-foreground">In Care</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{releasedAnimals.length}</div>
                  <div className="text-sm text-muted-foreground">Released</div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{(carer.specialties || []).length}</div>
                <div className="text-sm text-muted-foreground">Specialties</div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-sm">{carer.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Licence Number</label>
                <p className="font-mono text-sm">{carer.licenseNumber || '—'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Jurisdiction</label>
                <p className="text-sm">{carer.jurisdiction || '—'}</p>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
} 