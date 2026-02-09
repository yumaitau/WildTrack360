import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, Shield, Users, AlertTriangle, CheckCircle, Home, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from '@/lib/prisma';
import { redirect } from "next/navigation";
import { getServerJurisdiction, getServerJurisdictionConfig } from '@/lib/server-config';
import { getEnrichedCarers } from '@/lib/carer-helpers';

export default async function CompliancePage() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect('/sign-in');
  
  // Get jurisdiction from Clerk organization metadata
  const jurisdiction = await getServerJurisdiction(orgId);
  const config = await getServerJurisdictionConfig(orgId);

  // Fetch all data server-side
  let animals, carers, releaseChecklists, incidents;
  try {
    [animals, carers, releaseChecklists, incidents] = await Promise.all([
      prisma.animal.findMany({
        where: { clerkOrganizationId: orgId },
      }),
      getEnrichedCarers(orgId),
      prisma.releaseChecklist.findMany({
        where: { clerkOrganizationId: orgId },
      }),
      prisma.incidentReport.findMany({
        where: { clerkOrganizationId: orgId },
      }),
    ]);
  } catch (error) {
    console.error('Error loading compliance data:', error);
    throw new Error('Unable to load compliance data. Please try again later.');
  }

  const activeCarers = carers.filter((c: any) => c.active).length;
  const totalAnimals = animals.length;
  const animalsInCare = animals.filter((a: any) => a.status === 'IN_CARE').length;
  const readyForRelease = animals.filter((a: any) => a.status === 'READY_FOR_RELEASE').length;
  const released = animals.filter((a: any) => a.status === 'RELEASED').length;
  const completedChecklists = releaseChecklists.filter((c: any) => c.completed).length;
  const totalIncidents = incidents.length;
  const criticalIncidents = incidents.filter((i: any) => i.severity === 'CRITICAL').length;

  const complianceModules = [
    {
      title: "Compliance Register",
      description: "Complete record of all wildlife in care",
      icon: FileText,
      href: "/compliance/register",
      status: "updated",
      count: totalAnimals,
      color: "text-blue-600"
    },
    {
      title: "Carer Licence & CPD Tracker",
      description: "Manage licences and training records",
      icon: Shield,
      href: "/compliance/carers",
      status: "action-required",
      count: activeCarers,
      color: "text-purple-600",
      alert: carers.some((c: any) => {
        if (!c.licenseExpiry) return false;
        const daysUntil = Math.ceil((new Date(c.licenseExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return daysUntil < 30 && daysUntil > 0;
      })
    },
    {
      title: "Release Checklist",
      description: "Standardised pre-release assessment",
      icon: CheckCircle,
      href: "/compliance/release-checklist",
      status: "compliant",
      count: completedChecklists,
      color: "text-green-600"
    },
    {
      title: "Incident Report Log",
      description: "Track and document all incidents",
      icon: AlertTriangle,
      href: "/compliance/incidents",
      status: criticalIncidents > 0 ? "critical" : "updated",
      count: totalIncidents,
      color: "text-red-600",
      alert: criticalIncidents > 0
    },
    {
      title: "Hygiene Records",
      description: "Daily cleaning and disinfection logs",
      icon: Calendar,
      href: "/compliance/hygiene",
      status: "compliant",
      count: 0,
      color: "text-teal-600"
    },
    {
      title: "Compliance Overview",
      description: "Dashboard and reporting tools",
      icon: Users,
      href: "/compliance/overview",
      status: "compliant",
      count: 0,
      color: "text-indigo-600"
    }
  ];

  // Add NSW-specific report module if in NSW jurisdiction
  if (jurisdiction === 'NSW') {
    complianceModules.push({
      title: "NSW Annual Report",
      description: "Generate NSW Wildlife Rehabilitation Combined Report",
      icon: FileSpreadsheet,
      href: "/compliance/nsw-report",
      status: "compliant",
      count: 0,
      color: "text-blue-600"
    });
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="icon">
              <Home className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Compliance Management</h1>
            <p className="text-muted-foreground">
              {config.fullName} Wildlife Care Requirements
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {jurisdiction} Jurisdiction
        </Badge>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{animalsInCare}</div>
            <p className="text-sm text-muted-foreground">Animals in Care</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{activeCarers}</div>
            <p className="text-sm text-muted-foreground">Active Carers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{readyForRelease}</div>
            <p className="text-sm text-muted-foreground">Ready for Release</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{completedChecklists}</div>
            <p className="text-sm text-muted-foreground">Completed Checklists</p>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {complianceModules.map((module) => {
          const Icon = module.icon;
          return (
            <Link key={module.title} href={module.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <Icon className={`h-8 w-8 ${module.color}`} />
                    <div className="flex items-center gap-2">
                      {module.alert && (
                        <Badge variant="destructive" className="text-xs">
                          Action Required
                        </Badge>
                      )}
                      {module.count > 0 && (
                        <Badge variant="outline">{module.count}</Badge>
                      )}
                    </div>
                  </div>
                  <CardTitle className="mt-4">{module.title}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Compliance Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>Key Compliance Requirements</CardTitle>
          <CardDescription>
            Essential record-keeping for {config.fullName} wildlife carers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Daily Requirements</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Record all animal admissions</li>
                <li>• Update treatment records</li>
                <li>• Complete hygiene logs</li>
                <li>• Document feeding schedules</li>
                <li>• Monitor animal conditions</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Periodic Requirements</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Maintain carer licence validity</li>
                <li>• Complete pre-release assessments</li>
                <li>• Submit incident reports within 24 hours</li>
                <li>• Update CPD training records</li>
                <li>• Review compliance status monthly</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}