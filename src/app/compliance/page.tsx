import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, Shield, Users, AlertTriangle, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function CompliancePage() {
  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">ACT Wildlife Compliance Toolkit</h1>
          <p className="text-lg text-muted-foreground">
            Manage compliance with ACT Wildlife Code of Practice
          </p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          ACT Jurisdiction
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Wildlife Admission & Outcome Register */}
        <Card className="h-full">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <FileText className="h-6 w-6" />
              Wildlife Register
            </CardTitle>
            <CardDescription className="text-base">
              Maintain records of all wildlife in care
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Section 7.1.1, 7.1.2</span>
              <Badge variant="secondary">Required</Badge>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>Search & filter by species, date, carer</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>Export as CSV and PDF</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>3+ years retention</span>
              </div>
            </div>
            <Link href="/compliance/register">
              <Button className="w-full mt-4">View Register</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Release Site Checklist */}
        <Card className="h-full">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <CheckCircle className="h-6 w-6" />
              Release Checklist
            </CardTitle>
            <CardDescription className="text-base">
              Ensure ethical and ecologically sound releases
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Section 6.1 – 6.3</span>
              <Badge variant="secondary">Required</Badge>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>10km distance enforcement</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>Vet sign-off for juveniles</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>Printable PDF export</span>
              </div>
            </div>
            <Link href="/compliance/release-checklist">
              <Button className="w-full mt-4">Manage Releases</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Carer Licence & CPD Tracker */}
        <Card className="h-full">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <Users className="h-6 w-6" />
              Carer Management
            </CardTitle>
            <CardDescription className="text-base">
              Track licences and continuing professional development
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Licence Management</span>
              <Badge variant="secondary">Required</Badge>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>Licence expiry reminders</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>Training history tracking</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>Authorised species management</span>
              </div>
            </div>
            <Link href="/compliance/carers">
              <Button className="w-full mt-4">Manage Carers</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Daily Hygiene & Biosecurity Log */}
        <Card className="h-full">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <Shield className="h-6 w-6" />
              Hygiene Log
            </CardTitle>
            <CardDescription className="text-base">
              Daily cleaning and biosecurity protocols
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Section 5.2.x</span>
              <Badge variant="secondary">Required</Badge>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>Daily form per carer</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>Admin log viewer</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>Weekly PDF export</span>
              </div>
            </div>
            <Link href="/compliance/hygiene">
              <Button className="w-full mt-4">View Hygiene Logs</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Incident Report Log */}
        <Card className="h-full">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <AlertTriangle className="h-6 w-6" />
              Incident Reports
            </CardTitle>
            <CardDescription className="text-base">
              Log major incidents and escalations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Section 5.1.3, 5.2.4, 6.4</span>
              <Badge variant="secondary">Required</Badge>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>Export individual incidents</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>Admin filtering/sorting</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>Link to animal records</span>
              </div>
            </div>
            <Link href="/compliance/incidents">
              <Button className="w-full mt-4">View Incidents</Button>
            </Link>
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