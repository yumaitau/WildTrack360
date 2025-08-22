"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Calendar, 
  Users, 
  Shield, 
  FileText,
  TrendingUp,
  TrendingDown,
  Activity,
  Home,
  ArrowLeft
} from "lucide-react";
import { useOrganization } from '@clerk/nextjs';
import { getJurisdictionConfig, getOrganizationName } from '@/lib/config';
import { 
  getJurisdictionComplianceConfig, 
  getComplianceRulesForJurisdiction,
  isFormRequired,
  isFormOptional 
} from '@/lib/compliance-rules';
import Link from "next/link";
import { useEffect, useState } from "react";
import jsPDF from 'jspdf';

interface ComplianceOverviewClientProps {
  jurisdiction: string;
  organizationId: string;
}

export default function ComplianceOverviewClient({ jurisdiction, organizationId }: ComplianceOverviewClientProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { organization } = useOrganization();
  // Use jurisdiction passed from server
  const config = getJurisdictionConfig();
  const complianceConfig = getJurisdictionComplianceConfig(jurisdiction);
  const complianceRules = getComplianceRulesForJurisdiction(jurisdiction);
  const orgName = getOrganizationName();

  useEffect(() => {
    async function loadData() {
      try {
        if (!organizationId) return;
        const orgId = organizationId;
        const [animals, carers, releaseChecklists, hygieneLogs, incidentReports] = await Promise.all([
          fetch(`/api/animals?orgId=${orgId}`).then(r => r.json()),
          fetch(`/api/carers?orgId=${orgId}`).then(r => r.json()),
          fetch(`/api/release-checklists?orgId=${orgId}`).then(r => r.json()),
          fetch(`/api/hygiene?orgId=${orgId}`).then(r => r.json()),
          fetch(`/api/incidents?orgId=${orgId}`).then(r => r.json()),
        ]);
        setData({ animals, carers, releaseChecklists, hygieneLogs, incidentReports });
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [organizationId]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading compliance data...</div>
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

  const { animals, carers, releaseChecklists, hygieneLogs, incidentReports } = data;
  const animalsInCare = animals.filter((a: any) => a.status === 'IN_CARE');
  const releasedAnimals = animals.filter((a: any) => a.status === 'RELEASED');

  // Calculate compliance metrics
  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const expiringLicences = carers.filter((c: any) => {
    const daysUntil = getDaysUntilExpiry(c.licenseExpiry || '');
    return daysUntil <= 30 && daysUntil > 0;
  });

  const expiredLicences = carers.filter((c: any) => {
    const daysUntil = getDaysUntilExpiry(c.licenseExpiry || '');
    return daysUntil < 0;
  });

  const getHygieneComplianceScore = (log: any) => {
    const checks = [
      log.enclosureCleaned,
      log.ppeUsed,
      log.handwashAvailable,
      log.feedingBowlsDisinfected,
      log.quarantineSignsPresent
    ];
    const passed = checks.filter(Boolean).length;
    return Math.round((passed / checks.length) * 100);
  };

  const avgHygieneScore = hygieneLogs.length > 0 
    ? Math.round(hygieneLogs.reduce((sum: number, log: any) => sum + getHygieneComplianceScore(log), 0) / hygieneLogs.length)
    : 0;

  const criticalIncidents = incidentReports.filter((i: any) => i.type === 'Escape' || i.type === 'Injury');

  // Overall compliance score calculation - jurisdiction-aware
  const complianceFactors = [
    { 
      name: 'Licence Compliance', 
      score: Math.max(0, 100 - (expiredLicences.length * 20)),
      required: isFormRequired('carer-licence', jurisdiction)
    },
    { 
      name: 'Hygiene Compliance', 
      score: avgHygieneScore,
      required: isFormRequired('hygiene-log', jurisdiction)
    },
    { 
      name: 'Release Compliance', 
      score: complianceConfig.distanceRequirements.enforced 
        ? (releaseChecklists.filter((r: any) => r.within10km).length > 0 ? 100 : 80)
        : 100,
      required: isFormRequired('release-checklist', jurisdiction)
    },
    { 
      name: 'Incident Management', 
      score: criticalIncidents.length === 0 ? 100 : Math.max(60, 100 - (criticalIncidents.length * 10)),
      required: isFormRequired('incident-report', jurisdiction)
    }
  ].filter(factor => factor.required); // Only include factors required for this jurisdiction

  const overallCompliance = Math.round(complianceFactors.reduce((sum, factor) => sum + factor.score, 0) / complianceFactors.length);

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
            <h1 className="text-3xl font-bold">Compliance Overview</h1>
            <p className="text-muted-foreground">
              {jurisdiction} Wildlife Compliance Status Dashboard
            </p>
            <p className="text-sm text-muted-foreground">
              Based on {complianceConfig.codeOfPractice}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => {
              // Create PDF report
              const doc = new jsPDF();
              const pageWidth = doc.internal.pageSize.getWidth();
              const margin = 20;
              let yPosition = 20;
              
              // Header
              doc.setFontSize(20);
              doc.setFont('helvetica', 'bold');
              doc.text(`${jurisdiction} Wildlife Compliance Report`, pageWidth / 2, yPosition, { align: 'center' });
              
              yPosition += 15;
              doc.setFontSize(12);
              doc.setFont('helvetica', 'normal');
              doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
              
              yPosition += 20;
              
              // Overall Compliance Score
              doc.setFontSize(16);
              doc.setFont('helvetica', 'bold');
              doc.text('Overall Compliance Score', margin, yPosition);
              
              yPosition += 10;
              doc.setFontSize(24);
              doc.setTextColor(overallCompliance >= 90 ? 0 : overallCompliance >= 75 ? 128 : 255, 0, 0);
              doc.text(`${overallCompliance}%`, margin, yPosition);
              doc.setTextColor(0, 0, 0);
              
              yPosition += 15;
              
              // Compliance Factors
              doc.setFontSize(14);
              doc.setFont('helvetica', 'bold');
              doc.text('Compliance Factors', margin, yPosition);
              
              yPosition += 10;
              doc.setFontSize(10);
              doc.setFont('helvetica', 'normal');
              
              complianceFactors.forEach(factor => {
                if (yPosition > 250) {
                  doc.addPage();
                  yPosition = 20;
                }
                
                                 const scoreColor = factor.score >= 90 ? [0, 128, 0] : factor.score >= 75 ? [255, 165, 0] : [255, 0, 0];
                 doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
                doc.text(`${factor.name}: ${factor.score}%`, margin + 10, yPosition);
                doc.setTextColor(0, 0, 0);
                yPosition += 7;
              });
              
              yPosition += 10;
              
              // Key Metrics
              doc.setFontSize(14);
              doc.setFont('helvetica', 'bold');
              doc.text('Key Metrics', margin, yPosition);
              
              yPosition += 10;
              doc.setFontSize(10);
              doc.setFont('helvetica', 'normal');
              
              const metrics = [
                `Active Carers: ${carers.length}`,
                `Animals in Care: ${animalsInCare.length}`,
                `Successfully Released: ${releasedAnimals.length}`,
                `Hygiene Compliance: ${avgHygieneScore}%`,
                `Critical Incidents: ${criticalIncidents.length}`,
                `Total Incidents: ${incidentReports.length}`
              ];
              
              metrics.forEach(metric => {
                if (yPosition > 250) {
                  doc.addPage();
                  yPosition = 20;
                }
                doc.text(metric, margin + 10, yPosition);
                yPosition += 7;
              });
              
              yPosition += 10;
              
              // Alerts Section
              if (expiredLicences.length > 0 || expiringLicences.length > 0 || criticalIncidents.length > 0) {
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(255, 0, 0);
                doc.text('Alerts & Warnings', margin, yPosition);
                doc.setTextColor(0, 0, 0);
                
                yPosition += 10;
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                
                if (expiredLicences.length > 0) {
                  if (yPosition > 250) {
                    doc.addPage();
                    yPosition = 20;
                  }
                  doc.setTextColor(255, 0, 0);
                  doc.text(`Expired Licences: ${expiredLicences.length}`, margin + 10, yPosition);
                  yPosition += 7;
                  
                  expiredLicences.forEach((carer: any) => {
                    if (yPosition > 250) {
                      doc.addPage();
                      yPosition = 20;
                    }
                    doc.text(`- ${carer.name} (${carer.licenseExpiry || ''})`, margin + 20, yPosition);
                    yPosition += 6;
                  });
                  yPosition += 5;
                }
                
                if (expiringLicences.length > 0) {
                  if (yPosition > 250) {
                    doc.addPage();
                    yPosition = 20;
                  }
                  doc.setTextColor(255, 165, 0);
                  doc.text(`Licences Expiring Soon: ${expiringLicences.length}`, margin + 10, yPosition);
                  yPosition += 7;
                  
                  expiringLicences.forEach((carer: any) => {
                    if (yPosition > 250) {
                      doc.addPage();
                      yPosition = 20;
                    }
                    doc.text(`- ${carer.name} (${carer.licenseExpiry || ''})`, margin + 20, yPosition);
                    yPosition += 6;
                  });
                  yPosition += 5;
                }
                
                if (criticalIncidents.length > 0) {
                  if (yPosition > 250) {
                    doc.addPage();
                    yPosition = 20;
                  }
                  doc.setTextColor(255, 0, 0);
                  doc.text(`Critical Incidents: ${criticalIncidents.length}`, margin + 10, yPosition);
                  yPosition += 7;
                  
                  criticalIncidents.forEach((incident: any) => {
                    if (yPosition > 250) {
                      doc.addPage();
                      yPosition = 20;
                    }
                    doc.text(`- ${incident.type}: ${incident.date}`, margin + 20, yPosition);
                    yPosition += 6;
                    doc.text(`  ${incident.description.substring(0, 60)}...`, margin + 20, yPosition);
                    yPosition += 6;
                  });
                }
                
                doc.setTextColor(0, 0, 0);
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
              doc.save(`compliance-report-${new Date().toISOString().split('T')[0]}.pdf`);
            }}
          >
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>

      </div>

      {/* Overall Compliance Score */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Overall Compliance Score
          </CardTitle>
          <CardDescription>
            Comprehensive compliance assessment across all {jurisdiction} requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-4xl font-bold">
                  {overallCompliance}%
                </div>
                <div>
                  <Badge 
                    variant={
                      overallCompliance >= 90 ? 'secondary' :
                      overallCompliance >= 75 ? 'outline' : 'destructive'
                    }
                    className="text-lg"
                  >
                    {overallCompliance >= 90 ? 'Excellent' :
                     overallCompliance >= 75 ? 'Good' : 'Needs Attention'}
                  </Badge>
                </div>
              </div>
              <Progress value={overallCompliance} className="h-3" />
              <p className="text-sm text-muted-foreground mt-2">
                Based on licence compliance, hygiene standards, release protocols, and incident management
              </p>
            </div>
            <div className="space-y-3">
              {complianceFactors.map((factor, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{factor.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          factor.score >= 90 ? 'bg-green-600' :
                          factor.score >= 75 ? 'bg-yellow-600' : 'bg-red-600'
                        }`}
                        style={{ width: `${factor.score}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-8">{factor.score}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{carers.length}</div>
                <div className="text-sm text-muted-foreground">Active Carers</div>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-2">
              {expiredLicences.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {expiredLicences.length} expired
                </Badge>
              )}
              {expiringLicences.length > 0 && (
                <Badge variant="outline" className="text-xs ml-1">
                  {expiringLicences.length} expiring
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{animalsInCare.length}</div>
                <div className="text-sm text-muted-foreground">Animals in Care</div>
              </div>
              <Shield className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-2">
              <div className="text-xs text-muted-foreground">
                {releasedAnimals.length} successfully released
              </div>
            </div>
          </CardContent>
        </Card>

        {isFormRequired('hygiene-log', jurisdiction) && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{avgHygieneScore}%</div>
                  <div className="text-sm text-muted-foreground">Hygiene Compliance</div>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="mt-2">
                <div className="text-xs text-muted-foreground">
                  Based on {hygieneLogs.length} daily logs
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{criticalIncidents.length}</div>
                <div className="text-sm text-muted-foreground">Critical Incidents</div>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <div className="mt-2">
              <div className="text-xs text-muted-foreground">
                {incidentReports.length} total incidents
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts and Warnings */}
      <div className="space-y-4">
        {isFormRequired('carer-licence', jurisdiction) && expiredLicences.length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <XCircle className="h-5 w-5" />
                Expired Licences
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {expiredLicences.map((carer: any) => (
                  <div key={carer.id} className="flex items-center justify-between p-2 bg-white rounded">
                    <div>
                      <span className="font-medium">{carer.name}</span>
                      <span className="text-muted-foreground ml-2">
                        expired {carer.licenseExpiry || ''}
                      </span>
                    </div>
                    <Link href={`/compliance/carers/${carer.id}`}>
                      <Button variant="outline" size="sm">
                        Review
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {isFormRequired('carer-licence', jurisdiction) && expiringLicences.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <AlertTriangle className="h-5 w-5" />
                Licences Expiring Soon
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {expiringLicences.map((carer: any) => (
                  <div key={carer.id} className="flex items-center justify-between p-2 bg-white rounded">
                    <div>
                      <span className="font-medium">{carer.name}</span>
                      <span className="text-muted-foreground ml-2">
                        expires {carer.licenseExpiry || ''} ({getDaysUntilExpiry(carer.licenseExpiry || '')} days)
                      </span>
                    </div>
                    <Link href={`/compliance/carers/${carer.id}`}>
                      <Button variant="outline" size="sm">
                        Renew
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {isFormRequired('incident-report', jurisdiction) && criticalIncidents.length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-5 w-5" />
                Recent Critical Incidents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {criticalIncidents.slice(0, 3).map((incident: any) => (
                  <div key={incident.id} className="flex items-center justify-between p-2 bg-white rounded">
                    <div>
                      <span className="font-medium">{incident.type}</span>
                      <span className="text-muted-foreground ml-2">
                        {incident.date} - {incident.description.substring(0, 50)}...
                      </span>
                    </div>
                    <Link href={`/compliance/incidents/${incident.id}`}>
                      <Button variant="outline" size="sm">
                        Review
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common compliance tasks and reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/compliance/register">
              <Button variant="outline" className="w-full h-20 flex-col">
                <FileText className="h-6 w-6 mb-2" />
                Wildlife Register
              </Button>
            </Link>
            {isFormRequired('release-checklist', jurisdiction) && (
              <Link href="/compliance/release-checklist">
                <Button variant="outline" className="w-full h-20 flex-col">
                  <CheckCircle className="h-6 w-6 mb-2" />
                  Release Checklists
                </Button>
              </Link>
            )}
            {isFormRequired('hygiene-log', jurisdiction) && (
              <Link href="/compliance/hygiene">
                <Button variant="outline" className="w-full h-20 flex-col">
                  <Shield className="h-6 w-6 mb-2" />
                  Hygiene Logs
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Compliance Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
                {expiringLicences.slice(0, 3).map((carer: any) => (
                <div key={carer.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                      <div className="font-medium">{carer.name}</div>
                    <div className="text-sm text-muted-foreground">
                        Licence expires {carer.licenseExpiry || ''}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                      {getDaysUntilExpiry(carer.licenseExpiry || '')} days
                  </Badge>
                </div>
              ))}
              {expiringLicences.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  No upcoming deadlines
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 