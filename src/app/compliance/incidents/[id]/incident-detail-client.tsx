"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  AlertTriangle, 
  Calendar, 
  Download, 
  ArrowLeft, 
  User,
  FileText,
  MapPin,
  Image as ImageIcon,
  ExternalLink,
  Home
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

interface IncidentDetailClientProps {
  incident: any;
  animal: any;
}

export default function IncidentDetailClient({ incident, animal }: IncidentDetailClientProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate minimum loading time for smooth transition
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

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

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">Loading incident report...</p>
          </div>
        </div>
      </div>
    );
  }

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
            <Link href="/compliance/incidents">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div>
            <h1 className="text-3xl font-bold">Incident Report</h1>
            <p className="text-muted-foreground">
              {incident.type} • {new Date(incident.date).toISOString().split('T')[0]}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Link href={`/compliance/incidents/${incident.id}/edit`}>
            <Button>Edit Report</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Incident Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Incident Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Incident Type</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={getIncidentTypeColor(incident.type)} className="text-sm">
                      {incident.type}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Severity</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge 
                      variant={
                        incident.severity === 'CRITICAL' ? 'destructive' : 
                        incident.severity === 'HIGH' ? 'destructive' :
                        incident.severity === 'MEDIUM' ? 'outline' : 
                        'secondary'
                      } 
                      className="text-sm"
                    >
                      {incident.severity}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date</label>
                   <p className="text-lg font-medium">{new Date(incident.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Incident ID</label>
                  <p className="font-mono text-sm">{incident.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Reported To</label>
                  {incident.reportedTo ? (
                    <Badge variant="outline" className="text-sm">
                      {incident.reportedTo}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">Not reported</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Animal Information */}
          {animal && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Animal Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Animal Name</label>
                    <p className="text-lg font-medium">{animal.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Species</label>
                    <p className="text-lg">{animal.species}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Animal ID</label>
                    <p className="font-mono text-sm">{animal.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <Badge 
                       variant="outline"
                    >
                      {animal.status === 'IN_CARE' ? 'In Care' :
                       animal.status === 'RELEASED' ? 'Released' :
                       animal.status === 'DECEASED' ? 'Deceased' :
                       animal.status === 'READY_FOR_RELEASE' ? 'Ready for Release' :
                       animal.status === 'TRANSFERRED' ? 'Transferred' :
                       animal.status}
                    </Badge>
                  </div>
                </div>
                <div className="mt-4">
                  <Link href={`/animals/${animal.id}`}>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View Animal Record
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Incident Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Incident Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <div className="mt-2 p-4 bg-gray-50 rounded border">
                  <p className="text-sm">{incident.description}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Person Involved</label>
                <p className="text-lg font-medium">{incident.personInvolved}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Action Taken</label>
                <div className="mt-2 p-4 bg-gray-50 rounded border">
                  <p className="text-sm">{incident.actionTaken}</p>
                </div>
              </div>
              
              {incident.notes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Additional Notes</label>
                  <div className="mt-2 p-4 bg-gray-50 rounded border">
                    <p className="text-sm">{incident.notes}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attachments */}
          {Array.isArray(incident.attachments as any) && (incident.attachments as any).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Attachments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(incident.attachments as any).map((attachment: string, index: number) => (
                    <div key={index} className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                      <img 
                        src={attachment} 
                        alt={`Attachment ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ACT Requirements */}
          <Card>
            <CardHeader>
              <CardTitle>ACT Compliance Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
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
                
                <Separator />
                
                <div>
                  <h4 className="font-semibold mb-2">Reporting Timeline</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><strong>Immediate (within 1 hour):</strong> Escapes, serious injuries</p>
                    <p><strong>Within 24 hours:</strong> Disease outbreaks, minor injuries</p>
                    <p><strong>Within 48 hours:</strong> Improper handling, other incidents</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Incident Status */}
          <Card>
            <CardHeader>
              <CardTitle>Incident Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Type Classification</span>
                  <Badge variant={getIncidentTypeColor(incident.type)} className="text-xs">
                    {incident.type}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Severity</span>
                  <Badge 
                    variant={
                      incident.severity === 'CRITICAL' ? 'destructive' : 
                      incident.severity === 'HIGH' ? 'destructive' :
                      incident.severity === 'MEDIUM' ? 'outline' : 
                      'secondary'
                    } 
                    className="text-xs"
                  >
                    {incident.severity}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Reported to Authorities</span>
                  {incident.reportedTo ? (
                    <Badge variant="secondary" className="text-xs">
                      Yes
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      No
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Documentation</span>
                  <Badge variant="secondary" className="text-xs">
                    Complete
                  </Badge>
                </div>
              </div>
              
              <Separator />
              
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  incident.severity === 'CRITICAL' ? 'text-red-600' : 
                  incident.severity === 'HIGH' ? 'text-red-600' :
                  incident.severity === 'MEDIUM' ? 'text-orange-600' : 
                  'text-green-600'
                }`}>
                  {incident.severity === 'CRITICAL' ? 'Critical' : 
                   incident.severity === 'HIGH' ? 'High' :
                   incident.severity === 'MEDIUM' ? 'Medium' : 'Low'}
                </div>
                <div className="text-sm text-muted-foreground">Priority Level</div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="text-sm font-medium">Incident Occurred</div>
                     <div className="text-xs text-muted-foreground">{new Date(incident.date).toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="text-sm font-medium">Action Taken</div>
                       <div className="text-xs text-muted-foreground">{new Date(incident.date).toLocaleString()}</div>
                  </div>
                </div>
                {incident.reportedTo && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <div className="text-sm font-medium">Reported to {incident.reportedTo}</div>
                       <div className="text-xs text-muted-foreground">{new Date(incident.date).toLocaleString()}</div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Print Report
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}