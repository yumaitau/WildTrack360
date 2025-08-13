import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Shield, Calendar, Download, ArrowLeft, AlertTriangle, CheckCircle, XCircle, User, FileText, Image as ImageIcon, Home } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

interface HygieneLogDetailPageProps {
  params: {
    id: string;
  };
}

export default async function HygieneLogDetailPage({ params }: HygieneLogDetailPageProps) {
  const { userId, orgId } = await auth();
  if (!userId) redirect("/sign-in");
  const organizationId = orgId || "";

  const log = await prisma.hygieneLog.findFirst({
    where: { id: params.id, clerkUserId: userId, clerkOrganizationId: organizationId },
    include: { carer: true },
  });
  if (!log) notFound();
  const carer = log.carer;

  const getComplianceScore = (log: any) => {
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

  const complianceScore = getComplianceScore(log as any);
  const isFullyCompliant = complianceScore === 100;
  const isMostlyCompliant = complianceScore >= 80 && complianceScore < 100;

  const checks = [
    { name: 'Enclosure Cleaned', value: log.enclosureCleaned },
    { name: 'PPE Used', value: log.ppeUsed },
    { name: 'Handwash Available', value: log.handwashAvailable },
    { name: 'Feeding Bowls Disinfected', value: log.feedingBowlsDisinfected },
    { name: 'Quarantine Signs Present', value: log.quarantineSignsPresent }
  ];

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
            <Link href="/compliance/hygiene">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div>
            <h1 className="text-3xl font-bold">Hygiene Log</h1>
            <p className="text-muted-foreground">
              {carer?.name} • {new Date(log.date).toLocaleDateString("en-AU", { year: "numeric", month: "short", day: "numeric" })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button>Edit Log</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Carer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Carer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Carer Name</label>
                  <p className="text-lg font-medium">{carer?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Licence Number</label>
                  <p className="font-mono text-sm">{carer?.licenseNumber || '—'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date</label>
                  <p className="text-lg">{new Date(log.date).toLocaleDateString("en-AU", { year: "numeric", month: "long", day: "numeric" })}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Jurisdiction</label>
                  <Badge variant="outline" className="text-sm">
                    {carer?.jurisdiction || '—'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Daily Hygiene Checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Daily Hygiene Checklist
              </CardTitle>
              <CardDescription>
                Section 5.2.x - Daily cleaning and biosecurity protocols
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {checks.map((check, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="font-medium">{check.name}</span>
                    <div className="flex items-center gap-2">
                      {check.value ? (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="text-green-600 font-medium">Completed</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5 text-red-600" />
                          <span className="text-red-600 font-medium">Not Completed</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {log.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-gray-50 rounded border">
                  <p className="text-sm">{log.notes}</p>
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
                  <h4 className="font-semibold mb-2">Section 5.2.x - Daily Protocols</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• All enclosures cleaned and disinfected daily</li>
                    <li>• Appropriate PPE worn during cleaning</li>
                    <li>• Handwashing facilities available and used</li>
                    <li>• Feeding bowls and equipment disinfected</li>
                    <li>• Quarantine area signs clearly displayed</li>
                  </ul>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-semibold mb-2">Biosecurity Protocols</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Quarantine new animals for minimum 14 days</li>
                    <li>• Separate equipment for different species</li>
                    <li>• Regular disinfection of all surfaces</li>
                    <li>• Proper waste management procedures</li>
                  </ul>
                </div>
              </div>
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
                  <span className="text-sm">Enclosure Cleaning</span>
                  {log.enclosureCleaned ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">PPE Usage</span>
                  {log.ppeUsed ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Handwash Available</span>
                  {log.handwashAvailable ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Bowls Disinfected</span>
                  {log.feedingBowlsDisinfected ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Quarantine Signs</span>
                  {log.quarantineSignsPresent ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
              </div>
              
              <Separator />
              
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  isFullyCompliant ? 'text-green-600' : 
                  isMostlyCompliant ? 'text-orange-600' : 'text-red-600'
                }`}>
                  {complianceScore}%
                </div>
                <div className="text-sm text-muted-foreground">Compliance Score</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {isFullyCompliant ? 'Fully Compliant' : 
                   isMostlyCompliant ? 'Mostly Compliant' : 'Non-Compliant'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Daily Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Date</span>
                <span className="font-medium">{new Date(log.date).toLocaleDateString("en-AU")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Carer</span>
                <span className="font-medium">{carer?.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Completed Items</span>
                <span className="font-medium">{checks.filter(c => c.value).length}/5</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Photos Attached</span>
                <span className="font-medium">{Array.isArray((log as any).photos) ? ((log as any).photos as any[]).length : 0}</span>
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
                Print Log
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Follow-up
              </Button>
            </CardContent>
          </Card>

          {/* Compliance Alerts */}
          {!isFullyCompliant && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-800">
                  <AlertTriangle className="h-5 w-5" />
                  Compliance Alert
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-orange-800 space-y-2">
                  {!log.enclosureCleaned && (
                    <p>• Enclosure cleaning not completed</p>
                  )}
                  {!log.ppeUsed && (
                    <p>• PPE not used during cleaning</p>
                  )}
                  {!log.handwashAvailable && (
                    <p>• Handwashing facilities not available</p>
                  )}
                  {!log.feedingBowlsDisinfected && (
                    <p>• Feeding bowls not disinfected</p>
                  )}
                  {!log.quarantineSignsPresent && (
                    <p>• Quarantine signs not present</p>
                  )}
                </div>
                <Button variant="outline" className="w-full mt-3" size="sm">
                  Report Issue
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 