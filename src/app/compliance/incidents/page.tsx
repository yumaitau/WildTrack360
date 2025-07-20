import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Calendar, Download, Plus, FileText, User, MapPin, ArrowLeft } from "lucide-react";
import { getIncidentReports, getAnimals } from "@/lib/data";
import Link from "next/link";

export default async function IncidentReportsPage() {
  const incidentReports = await getIncidentReports();
  const animals = await getAnimals();

  const getAnimalName = (animalId?: string) => {
    if (!animalId) return 'N/A';
    const animal = animals.find(a => a.animalId === animalId);
    return animal?.name || 'Unknown';
  };

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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/compliance">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Incident Report Log</h1>
            <p className="text-muted-foreground">
              Section 5.1.3, 5.2.4, 6.4 - Log major incidents and escalations
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Link href="/compliance/incidents/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Incident
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{incidentReports.length}</div>
            <div className="text-sm text-muted-foreground">Total Incidents</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {incidentReports.filter(i => i.type === 'Escape' || i.type === 'Injury').length}
            </div>
            <div className="text-sm text-muted-foreground">Critical Incidents</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {incidentReports.filter(i => i.type === 'Disease Outbreak').length}
            </div>
            <div className="text-sm text-muted-foreground">Disease Outbreaks</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {incidentReports.filter(i => i.type === 'Improper Handling').length}
            </div>
            <div className="text-sm text-muted-foreground">Handling Issues</div>
          </CardContent>
        </Card>
      </div>

      {/* Incident Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Incident Reports</CardTitle>
          <CardDescription>
            Complete record of all major incidents and escalations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Incident ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Animal</TableHead>
                <TableHead>Person Involved</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Reported To</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidentReports.map((incident) => (
                <TableRow key={incident.id}>
                  <TableCell className="font-mono text-sm">
                    {incident.id}
                  </TableCell>
                  <TableCell>{incident.date}</TableCell>
                  <TableCell>
                    <Badge variant={getIncidentTypeColor(incident.type)} className="text-xs">
                      {incident.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {incident.animalId ? (
                      <Link href={`/animals/${incident.animalId}`} className="text-blue-600 hover:underline">
                        {getAnimalName(incident.animalId)}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>{incident.personInvolved}</TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {incident.description}
                  </TableCell>
                  <TableCell>
                    {incident.reportedTo ? (
                      <Badge variant="outline" className="text-xs">
                        {incident.reportedTo}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">Not reported</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link href={`/compliance/incidents/${incident.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Critical Incidents */}
      {incidentReports.filter(i => i.type === 'Escape' || i.type === 'Injury').length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Recent Critical Incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {incidentReports
                .filter(i => i.type === 'Escape' || i.type === 'Injury')
                .slice(0, 3)
                .map(incident => (
                  <div key={incident.id} className="p-4 bg-white rounded border">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="destructive" className="text-xs">
                            {incident.type}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{incident.date}</span>
                        </div>
                        <h4 className="font-medium mb-1">
                          {incident.animalId ? getAnimalName(incident.animalId) : 'General Incident'}
                        </h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          {incident.description}
                        </p>
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">Action taken:</span> {incident.actionTaken}
                        </div>
                      </div>
                      <Link href={`/compliance/incidents/${incident.id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compliance Requirements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Incident Reporting Requirements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Section 5.1.3 - Incident Reporting</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• All escapes must be reported immediately</li>
                <li>• Injuries to animals or humans documented</li>
                <li>• Disease outbreaks reported to authorities</li>
                <li>• Improper handling incidents logged</li>
                <li>• Follow-up actions documented</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Reporting Timeline</h4>
              <div className="text-sm text-muted-foreground">
                <p><strong>Immediate (within 1 hour):</strong> Escapes, serious injuries</p>
                <p><strong>Within 24 hours:</strong> Disease outbreaks, minor injuries</p>
                <p><strong>Within 48 hours:</strong> Improper handling, other incidents</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentation Standards
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Required Information</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Incident type and severity classification</li>
                <li>• Date, time, and location of incident</li>
                <li>• Animals and people involved</li>
                <li>• Detailed description of what occurred</li>
                <li>• Actions taken and follow-up required</li>
                <li>• Authority notifications made</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Record Keeping</h4>
              <div className="text-sm text-muted-foreground">
                <p>• All incidents retained for minimum 3 years</p>
                <p>• Available for inspection by authorities</p>
                <p>• Regular review and trend analysis</p>
                <p>• Annual incident report to management</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Incident Types Explanation */}
      <Card>
        <CardHeader>
          <CardTitle>Incident Type Classifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Critical Incidents</h4>
              <div className="space-y-3">
                <div>
                  <Badge variant="destructive" className="mb-1">Escape</Badge>
                  <p className="text-sm text-muted-foreground">
                    Any animal escaping from care or enclosure. Requires immediate 
                    notification and search procedures.
                  </p>
                </div>
                <div>
                  <Badge variant="destructive" className="mb-1">Injury</Badge>
                  <p className="text-sm text-muted-foreground">
                    Injuries to animals in care or humans during handling. 
                    Includes both minor and serious injuries.
                  </p>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Other Incidents</h4>
              <div className="space-y-3">
                <div>
                  <Badge variant="outline" className="mb-1">Disease Outbreak</Badge>
                  <p className="text-sm text-muted-foreground">
                    Suspected or confirmed disease affecting multiple animals 
                    or requiring quarantine procedures.
                  </p>
                </div>
                <div>
                  <Badge variant="secondary" className="mb-1">Improper Handling</Badge>
                  <p className="text-sm text-muted-foreground">
                    Incidents involving improper handling techniques, 
                    unauthorised handling, or protocol violations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 