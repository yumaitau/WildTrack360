"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Users,
  GraduationCap,
  Building2,
  ExternalLink,
  X,
} from "lucide-react";

interface ChecklistItem {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  actionLabel?: string;
  actionHref?: string;
}

interface ChecklistCategory {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  items: ChecklistItem[];
}

interface AdminComplianceChecklistProps {
  carers: any[];
  organization: any;
  jurisdiction: string;
}

export function AdminComplianceChecklist({
  carers,
  organization,
  jurisdiction,
}: AdminComplianceChecklistProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("wt360-compliance-checklist-dismissed");
    if (!stored) return false;
    // Auto-show again after 24 hours
    const dismissedAt = parseInt(stored, 10);
    return Date.now() - dismissedAt < 24 * 60 * 60 * 1000;
  });
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  const categories = useMemo(() => {
    const now = new Date();
    const allCarers = carers || [];
    const orgMetadata = organization?.publicMetadata || {};

    // --- Category 1: Carer / User Profiles ---
    const carersWithoutProfile = allCarers.filter((c) => !c.hasProfile);
    const carersWithoutPhone = allCarers.filter(
      (c) => c.hasProfile && !c.phone
    );
    const carersWithoutLicense = allCarers.filter(
      (c) => c.hasProfile && !c.licenseNumber
    );
    const carersWithoutEmail = allCarers.filter((c) => !c.email);

    const profileItems: ChecklistItem[] = [
      {
        id: "profiles-created",
        label: "All members have a carer profile",
        passed: carersWithoutProfile.length === 0,
        detail:
          carersWithoutProfile.length === 0
            ? `All ${allCarers.length} members have profiles`
            : `${carersWithoutProfile.length} member${carersWithoutProfile.length !== 1 ? "s" : ""} missing profiles: ${carersWithoutProfile
                .slice(0, 3)
                .map((c: any) => c.name)
                .join(", ")}${carersWithoutProfile.length > 3 ? ` and ${carersWithoutProfile.length - 3} more` : ""}`,
        actionLabel: "Manage Profiles",
        actionHref: "/admin",
      },
      {
        id: "profiles-phone",
        label: "All carers have phone numbers",
        passed: carersWithoutPhone.length === 0 && allCarers.length > 0,
        detail:
          carersWithoutPhone.length === 0
            ? "All carer profiles have phone numbers"
            : `${carersWithoutPhone.length} carer${carersWithoutPhone.length !== 1 ? "s" : ""} missing phone: ${carersWithoutPhone
                .slice(0, 3)
                .map((c: any) => c.name)
                .join(", ")}${carersWithoutPhone.length > 3 ? ` and ${carersWithoutPhone.length - 3} more` : ""}`,
        actionLabel: "Update Profiles",
        actionHref: "/admin",
      },
      {
        id: "profiles-email",
        label: "All members have email addresses",
        passed: carersWithoutEmail.length === 0 && allCarers.length > 0,
        detail:
          carersWithoutEmail.length === 0
            ? "All members have email addresses on file"
            : `${carersWithoutEmail.length} member${carersWithoutEmail.length !== 1 ? "s" : ""} missing email`,
        actionLabel: "View Members",
        actionHref: "/admin",
      },
      {
        id: "profiles-license",
        label: "All carers have licence numbers",
        passed: carersWithoutLicense.length === 0 && allCarers.length > 0,
        detail:
          carersWithoutLicense.length === 0
            ? "All carer profiles have licence numbers recorded"
            : `${carersWithoutLicense.length} carer${carersWithoutLicense.length !== 1 ? "s" : ""} missing licence: ${carersWithoutLicense
                .slice(0, 3)
                .map((c: any) => c.name)
                .join(", ")}${carersWithoutLicense.length > 3 ? ` and ${carersWithoutLicense.length - 3} more` : ""}`,
        actionLabel: "Update Licences",
        actionHref: "/admin",
      },
    ];

    // --- Category 2: Training Records ---
    const carersWithProfiles = allCarers.filter((c: any) => c.hasProfile);
    const carersWithNoTraining = carersWithProfiles.filter(
      (c: any) => !c.trainings || c.trainings.length === 0
    );
    const carersWithExpiredTraining = carersWithProfiles.filter((c: any) =>
      (c.trainings || []).some(
        (t: any) => t.expiryDate && new Date(t.expiryDate) < now
      )
    );
    const carersWithExpiredLicense = allCarers.filter(
      (c: any) => c.licenseExpiry && new Date(c.licenseExpiry) < now
    );
    const carersWithExpiringLicense = allCarers.filter((c: any) => {
      if (!c.licenseExpiry) return false;
      const expiry = new Date(c.licenseExpiry);
      const daysUntil = Math.ceil(
        (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntil > 0 && daysUntil <= 30;
    });

    const trainingItems: ChecklistItem[] = [
      {
        id: "training-records-exist",
        label: "All carers have training records",
        passed: carersWithNoTraining.length === 0 && carersWithProfiles.length > 0,
        detail:
          carersWithNoTraining.length === 0
            ? `All ${carersWithProfiles.length} carers have training records`
            : `${carersWithNoTraining.length} carer${carersWithNoTraining.length !== 1 ? "s" : ""} have no training records: ${carersWithNoTraining
                .slice(0, 3)
                .map((c: any) => c.name)
                .join(", ")}${carersWithNoTraining.length > 3 ? ` and ${carersWithNoTraining.length - 3} more` : ""}`,
        actionLabel: "Manage Training",
        actionHref: "/compliance/carers",
      },
      {
        id: "training-not-expired",
        label: "No expired training certifications",
        passed: carersWithExpiredTraining.length === 0,
        detail:
          carersWithExpiredTraining.length === 0
            ? "All training certifications are current"
            : `${carersWithExpiredTraining.length} carer${carersWithExpiredTraining.length !== 1 ? "s" : ""} have expired training: ${carersWithExpiredTraining
                .slice(0, 3)
                .map((c: any) => c.name)
                .join(", ")}${carersWithExpiredTraining.length > 3 ? ` and ${carersWithExpiredTraining.length - 3} more` : ""}`,
        actionLabel: "Review Training",
        actionHref: "/compliance/carers",
      },
      {
        id: "license-not-expired",
        label: "No expired carer licences",
        passed: carersWithExpiredLicense.length === 0,
        detail:
          carersWithExpiredLicense.length === 0
            ? carersWithExpiringLicense.length > 0
              ? `No expired licences, but ${carersWithExpiringLicense.length} expiring within 30 days`
              : "All carer licences are current"
            : `${carersWithExpiredLicense.length} carer${carersWithExpiredLicense.length !== 1 ? "s" : ""} have expired licences: ${carersWithExpiredLicense
                .slice(0, 3)
                .map((c: any) => c.name)
                .join(", ")}${carersWithExpiredLicense.length > 3 ? ` and ${carersWithExpiredLicense.length - 3} more` : ""}`,
        actionLabel: "Review Licences",
        actionHref: "/compliance/carers",
      },
    ];

    // --- Category 3: Organisation Profile ---
    const hasOrgName = !!organization?.name;
    const hasContactEmail = !!orgMetadata.contactEmail;
    const hasContactPhone = !!orgMetadata.contactPhone;
    const hasOrgLicense = !!orgMetadata.licenseNumber;
    const hasJurisdiction = !!jurisdiction;

    const orgItems: ChecklistItem[] = [
      {
        id: "org-name",
        label: "Organisation name is set",
        passed: hasOrgName,
        detail: hasOrgName
          ? `Organisation: ${organization.name}`
          : "Organisation name has not been configured",
      },
      {
        id: "org-jurisdiction",
        label: "Jurisdiction is configured",
        passed: hasJurisdiction,
        detail: hasJurisdiction
          ? `Jurisdiction: ${jurisdiction}`
          : "No jurisdiction has been set for this organisation",
      },
      {
        id: "org-email",
        label: "Organisation contact email is set",
        passed: hasContactEmail,
        detail: hasContactEmail
          ? "Contact email is on file"
          : "No organisation contact email configured. Update in organisation settings.",
        actionLabel: "Organisation Settings",
        actionHref: "/admin",
      },
      {
        id: "org-phone",
        label: "Organisation contact phone is set",
        passed: hasContactPhone,
        detail: hasContactPhone
          ? "Contact phone number is on file"
          : "No organisation contact phone configured. Update in organisation settings.",
        actionLabel: "Organisation Settings",
        actionHref: "/admin",
      },
      {
        id: "org-license",
        label: "Organisation licence number is set",
        passed: hasOrgLicense,
        detail: hasOrgLicense
          ? "Organisation licence number is on file"
          : "No licence number configured. This is required for compliance reports.",
        actionLabel: "Organisation Settings",
        actionHref: "/admin",
      },
    ];

    return [
      {
        id: "profiles",
        title: "Carer & User Profiles",
        icon: <Users className="h-5 w-5" />,
        description: "Ensure all carers have complete profiles with contact information",
        items: profileItems,
      },
      {
        id: "training",
        title: "Training & Licence Records",
        icon: <GraduationCap className="h-5 w-5" />,
        description: "Verify training records are current and licences are up to date",
        items: trainingItems,
      },
      {
        id: "organisation",
        title: "Organisation Profile",
        icon: <Building2 className="h-5 w-5" />,
        description:
          "Check organisation details are complete for end-of-year compliance reports",
        items: orgItems,
      },
    ] satisfies ChecklistCategory[];
  }, [carers, organization, jurisdiction]);

  const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0);
  const passedItems = categories.reduce(
    (sum, cat) => sum + cat.items.filter((i) => i.passed).length,
    0
  );
  const completionPercent = totalItems > 0 ? Math.round((passedItems / totalItems) * 100) : 0;
  const allPassed = passedItems === totalItems;

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDismiss = () => {
    localStorage.setItem(
      "wt360-compliance-checklist-dismissed",
      Date.now().toString()
    );
    setDismissed(true);
  };

  if (dismissed) {
    return (
      <div className="flex justify-end mb-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground"
          onClick={() => {
            localStorage.removeItem("wt360-compliance-checklist-dismissed");
            setDismissed(false);
          }}
        >
          <ClipboardCheck className="h-3 w-3 mr-1" />
          Show Compliance Checklist
        </Button>
      </div>
    );
  }

  return (
    <Card
      className={`mb-8 border-2 ${
        allPassed
          ? "border-green-200 bg-green-50/50"
          : completionPercent >= 70
            ? "border-amber-200 bg-amber-50/50"
            : "border-red-200 bg-red-50/50"
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <ClipboardCheck
              className={`h-6 w-6 ${
                allPassed
                  ? "text-green-600"
                  : completionPercent >= 70
                    ? "text-amber-600"
                    : "text-red-600"
              }`}
            />
            <div>
              <CardTitle className="text-lg">
                Compliance Readiness Checklist
              </CardTitle>
              <CardDescription>
                Tasks to complete for accurate end-of-financial-year compliance
                reporting
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                allPassed
                  ? "success"
                  : completionPercent >= 70
                    ? "warning"
                    : "destructive"
              }
            >
              {passedItems}/{totalItems} complete
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleDismiss}
              title="Dismiss for 24 hours"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="mt-3">
          <Progress value={completionPercent} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {completionPercent}% complete
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {categories.map((category) => {
          const catPassed = category.items.filter((i) => i.passed).length;
          const catTotal = category.items.length;
          const catComplete = catPassed === catTotal;
          const isExpanded = expandedCategories.has(category.id);

          return (
            <div
              key={category.id}
              className="rounded-lg border bg-background overflow-hidden"
            >
              <button
                className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                onClick={() => toggleCategory(category.id)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={
                      catComplete ? "text-green-600" : "text-muted-foreground"
                    }
                  >
                    {category.icon}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {category.title}
                      </span>
                      {catComplete ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          {catPassed}/{catTotal}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {category.description}
                    </p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {isExpanded && (
                <div className="border-t px-3 pb-3 pt-2 space-y-2">
                  {category.items.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-start gap-3 p-2 rounded-md ${
                        item.passed ? "bg-green-50" : "bg-red-50"
                      }`}
                    >
                      {item.passed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            item.passed
                              ? "text-green-800"
                              : "text-red-800"
                          }`}
                        >
                          {item.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.detail}
                        </p>
                      </div>
                      {!item.passed && item.actionHref && (
                        <Link href={item.actionHref}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs flex-shrink-0"
                          >
                            {item.actionLabel}
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Link to full compliance view */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Completing these tasks ensures your compliance reports are accurate
          </p>
          <Link href="/compliance/overview">
            <Button variant="outline" size="sm" className="text-xs">
              View Full Compliance Overview
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
