import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, MapPin, Calendar, Plus, AlertTriangle, ArrowLeft, Home } from "lucide-react";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from '@/lib/prisma';
import { redirect } from "next/navigation";
import { ExportPDFButton } from "@/components/export-pdf-button";
import { getServerJurisdiction, getServerJurisdictionConfig } from '@/lib/server-config';

export default async function ReleaseChecklistPage() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect('/sign-in');
  
  // Get jurisdiction from Clerk organization metadata
  const jurisdiction = await getServerJurisdiction(orgId);
  const config = await getServerJurisdictionConfig(orgId);

  const [releaseChecklists, animals] = await Promise.all([
    prisma.releaseChecklist.findMany({
      where: { clerkOrganizationId: orgId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.animal.findMany({
      where: { clerkOrganizationId: orgId },
    }),
  ]);

  const readyForRelease = animals.filter((a: any) => a.status === 'READY_FOR_RELEASE');
  const pendingChecklists = releaseChecklists.filter((c: any) => !c.completed).length;
  const completedChecklists = releaseChecklists.filter((c: any) => c.completed).length;
  const averageRehab = 45; // Calculate from actual data if needed

  const getCompletionStatus = (checklist: any) => {
    if (checklist.completed) return 'Completed';
    
    const checks = [
      checklist.speciesAppropriate,
      checklist.weightGain,
      checklist.behaviorNormal,
      checklist.medicalClearance,
      checklist.releaseLocationSuitable,
      checklist.weatherConditions,
      checklist.noHumanDependency,
      checklist.identificationMarking,
      checklist.releasePermitObtained,
      checklist.postReleaseMonitoring
    ];
    
    const completed = checks.filter(Boolean).length;
    const total = checks.length;
    
    if (completed === total) return 'Ready';
    if (completed >= total * 0.7) return 'In Progress';
    return 'Not Started';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'secondary';
      case 'Ready':
        return 'default';
      case 'In Progress':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/compliance">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" size="icon">
              <Home className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Pre-Release Checklist</h1>
            <p className="text-muted-foreground">
              {config.fullName} standardised assessment
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportPDFButton 
            data={{ releaseChecklists, animals }} 
            type="release-checklist"
          />
          <Link href="/compliance/release-checklist/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Assessment
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{readyForRelease.length}</div>
            <div className="text-sm text-muted-foreground">Ready for Release</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{pendingChecklists}</div>
            <div className="text-sm text-muted-foreground">Pending Assessments</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{completedChecklists}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{averageRehab} days</div>
            <div className="text-sm text-muted-foreground">Avg. Rehab Time</div>
          </CardContent>
        </Card>
      </div>

      {/* Ready for Release Alert */}
      {readyForRelease.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5" />
              Animals Ready for Release Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {readyForRelease.slice(0, 5).map((animal: any) => {
                const checklist = releaseChecklists.find((c: any) => c.animalId === animal.id);
                return (
                  <div key={animal.id} className="flex items-center justify-between p-2 bg-white rounded">
                    <div>
                      <span className="font-medium">{animal.name}</span>
                      <span className="text-muted-foreground ml-2">- {animal.species}</span>
                      <div className="text-sm text-muted-foreground">
                        In care since {new Date(animal.dateFound).toLocaleDateString()}
                      </div>
                    </div>
                    {checklist ? (
                      <Link href={`/compliance/release-checklist/${checklist.id}`}>
                        <Button variant="outline" size="sm">
                          Continue Assessment
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/compliance/release-checklist/new?animalId=${animal.id}`}>
                        <Button variant="default" size="sm">
                          Start Assessment
                        </Button>
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checklists Table */}
      <Card>
        <CardHeader>
          <CardTitle>Release Assessments</CardTitle>
          <CardDescription>
            Pre-release assessment checklists for all animals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Animal</TableHead>
                <TableHead>Species</TableHead>
                <TableHead>Assessment Date</TableHead>
                <TableHead>Release Date</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {releaseChecklists.map((checklist: any) => {
                const animal = animals.find((a: any) => a.id === checklist.animalId);
                const status = getCompletionStatus(checklist);
                
                return (
                  <TableRow key={checklist.id}>
                    <TableCell>
                      <div className="font-medium">{animal?.name || 'Unknown'}</div>
                    </TableCell>
                    <TableCell>{animal?.species || 'Unknown'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(checklist.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {checklist.releaseDate ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          {new Date(checklist.releaseDate).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">TBD</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {checklist.releaseLocation ? (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{checklist.releaseLocation}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(status) as any} className="text-xs">
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/compliance/release-checklist/${checklist.id}`}>
                        <Button variant="outline" size="sm">
                          {status === 'Completed' ? 'View' : 'Continue'}
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
              {releaseChecklists.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No release assessments found. Start by creating one for animals ready for release.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assessment Criteria */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Release Criteria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Physical Health</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Weight within normal range</li>
                <li>• No injuries or illness</li>
                <li>• Normal mobility and function</li>
                <li>• Adequate body condition</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Behavioral Assessment</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Species-appropriate behavior</li>
                <li>• No human dependency</li>
                <li>• Proper fear response</li>
                <li>• Foraging ability demonstrated</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Release Requirements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Environmental Conditions</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Suitable weather forecast</li>
                <li>• Appropriate habitat available</li>
                <li>• Food sources present</li>
                <li>• Minimal predator risk</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Documentation</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Release permit obtained</li>
                <li>• Location GPS recorded</li>
                <li>• Identification marking complete</li>
                <li>• Post-release monitoring plan</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}