"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Calendar, Download, Plus, FileText, User, MapPin, ArrowLeft, Home } from "lucide-react";
import { useOrganization } from '@clerk/nextjs';
import Link from "next/link";
import { useEffect, useState } from "react";
import jsPDF from 'jspdf';

export default function IncidentReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { organization } = useOrganization();

  useEffect(() => {
    async function loadData() {
      try {
        if (!organization) return;
        const orgId = organization.id;
        const [incidentReports, animals] = await Promise.all([
          fetch(`/api/incidents?orgId=${orgId}`).then(r => r.json()),
          fetch(`/api/animals?orgId=${orgId}`).then(r => r.json()),
        ]);
        setData({ incidentReports, animals });
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [organization]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading incident data...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600">Error loading data</div>
        </div>
      </div>
    );
  }

  const { incidentReports, animals } = data;

  const getAnimalName = (animalId?: string) => {
    if (!animalId) return 'N/A';
    const animal = animals.find((a: any) => a.id === animalId);
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
          <Link href="/">
            <Button variant="outline" size="icon">
              <Home className="h-4 w-4" />
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
          <Button 
            variant="outline"
            onClick={() => {
              // Generate CSV export
              const csvContent = [
                ['Incident ID', 'Date', 'Type', 'Animal', 'Person Involved', 'Description', 'Reported To', 'Action Taken'],
                ...incidentReports.map((incident: any) => [
                  incident.id,
                  incident.date,
                  incident.type,
                  incident.animalId ? getAnimalName(incident.animalId) : 'N/A',
                  incident.personInvolved,
                  incident.description,
                  incident.reportedTo || 'Not reported',
                  incident.actionTaken
                ])
              ].map(row => row.join(',')).join('\n');
              
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `incident-reports-${new Date().toISOString().split('T')[0]}.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button 
            variant="outline"
            onClick={() => {
              // Generate PDF export
              const doc = new jsPDF();
              const pageWidth = doc.internal.pageSize.getWidth();
              const margin = 20;
              let yPosition = 20;
              
              // Header
              doc.setFontSize(20);
              doc.setFont('helvetica', 'bold');
              doc.text('Incident Report Log', pageWidth / 2, yPosition, { align: 'center' });
              
              yPosition += 15;
              doc.setFontSize(12);
              doc.setFont('helvetica', 'normal');
              doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
              
              yPosition += 20;
              
              // Statistics
              doc.setFontSize(14);
              doc.setFont('helvetica', 'bold');
              doc.text('Summary Statistics', margin, yPosition);
              
              yPosition += 10;
              doc.setFontSize(10);
              doc.setFont('helvetica', 'normal');
              
              const totalIncidents = incidentReports.length;
              const criticalIncidents = incidentReports.filter((i: any) => i.severity === 'CRITICAL' || i.severity === 'HIGH').length;
              const diseaseOutbreaks = incidentReports.filter((i: any) => i.type === 'Disease Outbreak').length;
              const handlingIssues = incidentReports.filter((i: any) => i.type === 'Improper Handling').length;
              
              doc.text(`Total Incidents: ${totalIncidents}`, margin + 10, yPosition);
              yPosition += 7;
              doc.text(`High/Critical Severity: ${criticalIncidents}`, margin + 10, yPosition);
              yPosition += 7;
              doc.text(`Disease Outbreaks: ${diseaseOutbreaks}`, margin + 10, yPosition);
              yPosition += 7;
              doc.text(`Handling Issues: ${handlingIssues}`, margin + 10, yPosition);
              
              yPosition += 15;
              
              // Incident entries table
              doc.setFontSize(14);
              doc.setFont('helvetica', 'bold');
              doc.text('Incident Reports', margin, yPosition);
              
              yPosition += 10;
              doc.setFontSize(8);
              doc.setFont('helvetica', 'normal');
              
              // Table headers
              const headers = ['Date', 'Type', 'Animal', 'Person', 'Status'];
              const colWidths = [25, 30, 40, 35, 20];
              let xPos = margin;
              
              headers.forEach((header, index) => {
                doc.setFont('helvetica', 'bold');
                doc.text(header, xPos, yPosition);
                xPos += colWidths[index];
              });
              
              yPosition += 5;
              
              // Table data
              incidentReports.slice(0, 20).forEach((incident: any) => {
                if (yPosition > 250) {
                  doc.addPage();
                  yPosition = 20;
                }
                
                xPos = margin;
                doc.setFont('helvetica', 'normal');
                doc.text(incident.date, xPos, yPosition);
                xPos += colWidths[0];
                doc.text(incident.type, xPos, yPosition);
                xPos += colWidths[1];
                doc.text(incident.animalId ? getAnimalName(incident.animalId) : 'N/A', xPos, yPosition);
                xPos += colWidths[2];
                doc.text(incident.personInvolved, xPos, yPosition);
                xPos += colWidths[3];
                doc.text(incident.reportedTo ? 'Reported' : 'Not reported', xPos, yPosition);
                
                yPosition += 5;
              });
              
              if (incidentReports.length > 20) {
                yPosition += 5;
                doc.text(`... and ${incidentReports.length - 20} more entries`, margin, yPosition);
              }
              
              // Footer
              doc.addPage();
              yPosition = 20;
              doc.setFontSize(10);
              doc.setFont('helvetica', 'italic');
              doc.text('This report was generated automatically by WildTrack360 Compliance System.', margin, yPosition);
              yPosition += 7;
              doc.text('For questions or concerns, please contact your compliance coordinator.', margin, yPosition);
              
              // Save the PDF
              doc.save(`incident-reports-${new Date().toISOString().split('T')[0]}.pdf`);
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
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
              {incidentReports.filter((i: any) => i.severity === 'CRITICAL' || i.severity === 'HIGH').length}
            </div>
            <div className="text-sm text-muted-foreground">High/Critical Severity</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {incidentReports.filter((i: any) => i.type === 'Disease Outbreak').length}
            </div>
            <div className="text-sm text-muted-foreground">Disease Outbreaks</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {incidentReports.filter((i: any) => i.type === 'Improper Handling').length}
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
              {incidentReports.map((incident: any) => (
                <TableRow key={incident.id}>
                  <TableCell className="font-mono text-sm">
                    {incident.id}
                  </TableCell>
                   <TableCell>{new Date(incident.date).toISOString().split('T')[0]}</TableCell>
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
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          const button = e.currentTarget;
                          button.innerHTML = '<span class="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full inline-block mr-1"></span> Loading...';
                          button.disabled = true;
                        }}
                      >
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
              <h4 className="font-semibold mb-2">Severity Levels</h4>
              <div className="space-y-3">
                <div>
                  <Badge variant="destructive" className="mb-1">CRITICAL</Badge>
                  <p className="text-sm text-muted-foreground">
                    Emergency situations requiring immediate action and notification 
                    to authorities.
                  </p>
                </div>
                <div>
                  <Badge variant="destructive" className="mb-1">HIGH</Badge>
                  <p className="text-sm text-muted-foreground">
                    Serious incidents requiring immediate attention and follow-up 
                    within 24 hours.
                  </p>
                </div>
                <div>
                  <Badge variant="outline" className="mb-1">MEDIUM</Badge>
                  <p className="text-sm text-muted-foreground">
                    Incidents requiring attention within 24-48 hours.
                  </p>
                </div>
                <div>
                  <Badge variant="secondary" className="mb-1">LOW</Badge>
                  <p className="text-sm text-muted-foreground">
                    Minor issues that should be addressed but don't require immediate action.
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