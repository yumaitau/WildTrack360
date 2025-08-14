import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Calendar, Plus, FileText, User, MapPin, ArrowLeft, Home } from "lucide-react";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from '@/lib/prisma';
import { redirect } from "next/navigation";
import { ExportPDFButton } from "@/components/export-pdf-button";
import { ViewButton } from "@/components/view-button";

export default async function IncidentReportsPage() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect('/sign-in');

  const [incidentReports, animals] = await Promise.all([
    prisma.incidentReport.findMany({
      where: { clerkOrganizationId: orgId },
      orderBy: { date: 'desc' },
    }),
    prisma.animal.findMany({
      where: { clerkOrganizationId: orgId },
    }),
  ]);

  const totalIncidents = incidentReports.length;
  const criticalIncidents = incidentReports.filter((i: any) => i.severity === 'CRITICAL').length;
  const last30Days = incidentReports.filter((i: any) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return new Date(i.date) >= thirtyDaysAgo;
  }).length;

  const unreportedIncidents = incidentReports.filter((i: any) => !i.reportedTo).length;

  const getIncidentTypeColor = (type: string) => {
    switch (type) {
      case 'Escape':
        return 'destructive';
      case 'Injury':
        return 'destructive';
      case 'Disease Outbreak':
        return 'outline';
      case 'Improper Handling':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'destructive';
      case 'HIGH':
        return 'destructive';
      case 'MEDIUM':
        return 'outline';
      case 'LOW':
        return 'secondary';
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
            <h1 className="text-3xl font-bold">Incident Report Log</h1>
            <p className="text-muted-foreground">
              Track and document all wildlife care incidents
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportPDFButton 
            data={{ incidentReports, animals }} 
            type="incidents"
          />
          <Link href="/compliance/incidents/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Incident Report
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totalIncidents}</div>
            <div className="text-sm text-muted-foreground">Total Incidents</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{criticalIncidents}</div>
            <div className="text-sm text-muted-foreground">Critical Severity</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{last30Days}</div>
            <div className="text-sm text-muted-foreground">Last 30 Days</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{unreportedIncidents}</div>
            <div className="text-sm text-muted-foreground">Unreported</div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Incidents Alert */}
      {criticalIncidents > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Critical Incidents Requiring Immediate Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {incidentReports
                .filter((i: any) => i.severity === 'CRITICAL')
                .slice(0, 3)
                .map((incident: any) => {
                  const animal = animals.find((a: any) => a.id === incident.animalId);
                  return (
                    <div key={incident.id} className="flex items-center justify-between p-2 bg-white rounded">
                      <div>
                        <span className="font-medium">{incident.type}</span>
                        {animal && (
                          <span className="text-muted-foreground ml-2">
                            - {animal.name} ({animal.species})
                          </span>
                        )}
                        <div className="text-sm text-muted-foreground">
                          {new Date(incident.date).toLocaleDateString()} - {incident.personInvolved}
                        </div>
                      </div>
                      <ViewButton 
                        href={`/compliance/incidents/${incident.id}`} 
                        label="View Details"
                      />
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Incidents Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Incident Reports</CardTitle>
          <CardDescription>
            Complete log of all incidents requiring documentation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Animal</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Person Involved</TableHead>
                <TableHead>Reported To</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidentReports.map((incident: any) => {
                const animal = animals.find((a: any) => a.id === incident.animalId);
                return (
                  <TableRow key={incident.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(incident.date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getIncidentTypeColor(incident.type) as any} className="text-xs">
                        {incident.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {animal ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{animal.name}</div>
                            <div className="text-xs text-muted-foreground">{animal.species}</div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSeverityColor(incident.severity) as any} className="text-xs">
                        {incident.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>{incident.personInvolved}</TableCell>
                    <TableCell>
                      {incident.reportedTo ? (
                        <Badge variant="secondary" className="text-xs">
                          {incident.reportedTo}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">Not reported</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <ViewButton href={`/compliance/incidents/${incident.id}`} />
                    </TableCell>
                  </TableRow>
                );
              })}
              {incidentReports.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No incident reports found. This is good news!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Compliance Requirements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Reporting Requirements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Immediate Reporting (within 1 hour)</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Animal escapes</li>
                <li>• Serious injuries to animals or humans</li>
                <li>• Death of an animal in care</li>
                <li>• Suspected disease outbreak</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">24-Hour Reporting</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Minor injuries</li>
                <li>• Property damage</li>
                <li>• Medication errors</li>
                <li>• Equipment failures</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Incident Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Escape</span>
                <Badge variant="destructive" className="text-xs">Critical</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Injury</span>
                <Badge variant="destructive" className="text-xs">High</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Disease Outbreak</span>
                <Badge variant="outline" className="text-xs">Medium</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Improper Handling</span>
                <Badge variant="secondary" className="text-xs">Low</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Other</span>
                <Badge variant="outline" className="text-xs">Variable</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}