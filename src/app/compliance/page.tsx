import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, Shield, Users, AlertTriangle, CheckCircle, ArrowLeft, Home } from "lucide-react";
import Link from "next/link";
import { getCurrentJurisdiction, getJurisdictionConfig } from '@/lib/config';

export default function CompliancePage() {
  const jurisdiction = getCurrentJurisdiction();
  const config = getJurisdictionConfig();
  
  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="icon">
              <Home className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-bold mb-2">{jurisdiction} Wildlife Compliance Toolkit</h1>
            <p className="text-lg text-muted-foreground">
              Manage compliance with {config.codeOfPractice}
            </p>
            {config.codeOfPracticeUrl && (
              <a 
                href={config.codeOfPracticeUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                View Code of Practice →
              </a>
            )}
          </div>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          {jurisdiction} Jurisdiction
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Wildlife Register */}
        <Card className="h-full">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <FileText className="h-6 w-6" />
              Wildlife Register
            </CardTitle>
            <CardDescription className="text-base">
              Maintain records of all wildlife admissions and outcomes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                3 requirements
              </span>
              <Badge variant="secondary">Required</Badge>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>Wildlife Admission Register</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>Search and Filter Capability</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>Export Functionality</span>
              </div>
            </div>
            <Link href="/compliance/register">
              <Button className="w-full mt-4">View Register</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Release Checklists */}
        <Card className="h-full">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <CheckCircle className="h-6 w-6" />
              Release Checklists
            </CardTitle>
            <CardDescription className="text-base">
              Document release site selection and animal fitness
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                3 requirements
              </span>
              <Badge variant="secondary">Required</Badge>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>Release Site Assessment</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>Animal Fitness Evaluation</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>Release Documentation</span>
              </div>
            </div>
            <Link href="/compliance/release-checklist">
              <Button className="w-full mt-4">Manage Releases</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Hygiene Management */}
        <Card className="h-full">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <Shield className="h-6 w-6" />
              Hygiene Management
            </CardTitle>
            <CardDescription className="text-base">
              Maintain hygiene standards and quarantine protocols
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                3 requirements
              </span>
              <Badge variant="secondary">Required</Badge>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>Daily Hygiene Checks</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>Quarantine Protocols</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>PPE Usage Records</span>
              </div>
            </div>
            <Link href="/compliance/hygiene">
              <Button className="w-full mt-4">View Hygiene Logs</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Incident Management */}
        <Card className="h-full">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <AlertTriangle className="h-6 w-6" />
              Incident Management
            </CardTitle>
            <CardDescription className="text-base">
              Report and document incidents and accidents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                3 requirements
              </span>
              <Badge variant="secondary">Required</Badge>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>Incident Reporting</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>Investigation Process</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>Corrective Actions</span>
              </div>
            </div>
            <Link href="/compliance/incidents">
              <Button className="w-full mt-4">View Incidents</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Carer Management */}
        <Card className="h-full">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <Users className="h-6 w-6" />
              Carer Management
            </CardTitle>
            <CardDescription className="text-base">
              Manage carer qualifications and compliance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                3 requirements
              </span>
              <Badge variant="secondary">Required</Badge>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>License Verification</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>Training Records</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>Compliance Monitoring</span>
              </div>
            </div>
            <Link href="/compliance/carers">
              <Button className="w-full mt-4">Manage Carers</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Available Forms */}
        <Card className="h-full">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <FileText className="h-6 w-6" />
              Available Forms
            </CardTitle>
            <CardDescription className="text-base">
              Forms and tools available for {jurisdiction} compliance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <Link href="/compliance/register">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Wildlife Register
                  <Badge variant="secondary" className="ml-auto">Required</Badge>
                </Button>
              </Link>
              <Link href="/compliance/release-checklist">
                <Button variant="outline" className="w-full justify-start">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Release Checklists
                  <Badge variant="secondary" className="ml-auto">Required</Badge>
                </Button>
              </Link>
              <Link href="/compliance/hygiene">
                <Button variant="outline" className="w-full justify-start">
                  <Shield className="mr-2 h-4 w-4" />
                  Hygiene Logs
                  <Badge variant="secondary" className="ml-auto">Required</Badge>
                </Button>
              </Link>
              <Link href="/compliance/incidents">
                <Button variant="outline" className="w-full justify-start">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Incident Reports
                  <Badge variant="secondary" className="ml-auto">Required</Badge>
                </Button>
              </Link>
              <Link href="/compliance/carers">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Carer Management
                  <Badge variant="secondary" className="ml-auto">Required</Badge>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Compliance Overview */}
        <Card className="h-full">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <Calendar className="h-6 w-6" />
              Compliance Overview
            </CardTitle>
            <CardDescription className="text-base">
              Summary of compliance status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-green-600 mb-1">95%</div>
                <div className="text-sm text-muted-foreground">Compliance Rate</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600 mb-1">12</div>
                <div className="text-sm text-muted-foreground">Active Carers</div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Licences Expiring Soon</span>
                <Badge variant="destructive">2</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Pending Releases</span>
                <Badge variant="outline">3</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Recent Incidents</span>
                <Badge variant="outline">1</Badge>
              </div>
            </div>
            <Link href="/compliance/overview">
              <Button variant="outline" className="w-full mt-4">View Details</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 