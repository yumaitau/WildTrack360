import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, Shield, Users, AlertTriangle, CheckCircle, ArrowLeft, Home } from "lucide-react";
import Link from "next/link";
import { getJurisdictionConfig, getCurrentJurisdiction, getOrganizationName } from '@/lib/config';
import { 
  getJurisdictionComplianceConfig, 
  getComplianceSectionsForJurisdiction,
  isFormRequired,
  isFormOptional 
} from '@/lib/compliance-rules';

export default function CompliancePage() {
  const jurisdiction = getCurrentJurisdiction();
  const config = getJurisdictionConfig();
  const complianceConfig = getJurisdictionComplianceConfig(jurisdiction);
  const complianceSections = getComplianceSectionsForJurisdiction(jurisdiction);
  const orgName = getOrganizationName();
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
              Manage compliance with {complianceConfig.codeOfPractice}
            </p>
            {complianceConfig.codeOfPracticeUrl && (
              <a 
                href={complianceConfig.codeOfPracticeUrl} 
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
        {complianceSections.map((section) => (
          <Card key={section.id} className="h-full">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                {section.id.includes('record') && <FileText className="h-6 w-6" />}
                {section.id.includes('release') && <CheckCircle className="h-6 w-6" />}
                {section.id.includes('hygiene') && <Shield className="h-6 w-6" />}
                {section.id.includes('incident') && <AlertTriangle className="h-6 w-6" />}
                {section.id.includes('carer') && <Users className="h-6 w-6" />}
                {!section.id.includes('record') && !section.id.includes('release') && !section.id.includes('hygiene') && !section.id.includes('incident') && !section.id.includes('carer') && <Calendar className="h-6 w-6" />}
                {section.title}
              </CardTitle>
              <CardDescription className="text-base">
                {section.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {section.rules.length} requirement{section.rules.length !== 1 ? 's' : ''}
                </span>
                <Badge variant="secondary">
                  {section.rules.every(rule => rule.required) ? 'Required' : 'Mixed'}
                </Badge>
              </div>
              <div className="space-y-3">
                {section.rules.slice(0, 3).map((rule) => (
                  <div key={rule.id} className="flex items-center gap-3 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>{rule.title}</span>
                  </div>
                ))}
                {section.rules.length > 3 && (
                  <div className="text-sm text-muted-foreground">
                    +{section.rules.length - 3} more requirements
                  </div>
                )}
              </div>
              {(() => {
                const formTypes = section.rules
                  .map(rule => rule.formType)
                  .filter(Boolean)
                  .filter((value, index, self) => self.indexOf(value) === index); // unique values
                
                if (formTypes.includes('wildlife-register')) {
                  return (
                    <Link href="/compliance/register">
                      <Button className="w-full mt-4">View Register</Button>
                    </Link>
                  );
                }
                if (formTypes.includes('release-checklist')) {
                  return (
                    <Link href="/compliance/release-checklist">
                      <Button className="w-full mt-4">Manage Releases</Button>
                    </Link>
                  );
                }
                if (formTypes.includes('hygiene-log')) {
                  return (
                    <Link href="/compliance/hygiene">
                      <Button className="w-full mt-4">View Hygiene Logs</Button>
                    </Link>
                  );
                }
                if (formTypes.includes('incident-report')) {
                  return (
                    <Link href="/compliance/incidents">
                      <Button className="w-full mt-4">View Incidents</Button>
                    </Link>
                  );
                }
                if (formTypes.includes('carer-licence')) {
                  return (
                    <Link href="/compliance/carers">
                      <Button className="w-full mt-4">Manage Carers</Button>
                    </Link>
                  );
                }
                return null;
              })()}
            </CardContent>
          </Card>
        ))}

        {/* Available Forms - Show all forms for the jurisdiction */}
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
                  {isFormRequired('wildlife-register', jurisdiction) && (
                    <Badge variant="secondary" className="ml-auto">Required</Badge>
                  )}
                </Button>
              </Link>
              {isFormRequired('release-checklist', jurisdiction) || isFormOptional('release-checklist', jurisdiction) ? (
                <Link href="/compliance/release-checklist">
                  <Button variant="outline" className="w-full justify-start">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Release Checklists
                    {isFormRequired('release-checklist', jurisdiction) && (
                      <Badge variant="secondary" className="ml-auto">Required</Badge>
                    )}
                  </Button>
                </Link>
              ) : null}
              {isFormRequired('hygiene-log', jurisdiction) || isFormOptional('hygiene-log', jurisdiction) ? (
                <Link href="/compliance/hygiene">
                  <Button variant="outline" className="w-full justify-start">
                    <Shield className="mr-2 h-4 w-4" />
                    Hygiene Logs
                    {isFormRequired('hygiene-log', jurisdiction) && (
                      <Badge variant="secondary" className="ml-auto">Required</Badge>
                    )}
                  </Button>
                </Link>
              ) : null}
              {isFormRequired('incident-report', jurisdiction) || isFormOptional('incident-report', jurisdiction) ? (
                <Link href="/compliance/incidents">
                  <Button variant="outline" className="w-full justify-start">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Incident Reports
                    {isFormRequired('incident-report', jurisdiction) && (
                      <Badge variant="secondary" className="ml-auto">Required</Badge>
                    )}
                  </Button>
                </Link>
              ) : null}
              {isFormRequired('carer-licence', jurisdiction) || isFormOptional('carer-licence', jurisdiction) ? (
                <Link href="/compliance/carers">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="mr-2 h-4 w-4" />
                    Carer Management
                    {isFormRequired('carer-licence', jurisdiction) && (
                      <Badge variant="secondary" className="ml-auto">Required</Badge>
                    )}
                  </Button>
                </Link>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* Compliance Overview - Always show */}
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