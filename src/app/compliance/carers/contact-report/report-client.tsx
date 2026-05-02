"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Download, FileSpreadsheet, Home, Printer, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type ActiveFilter, getLicenceStatus, type LicenceFilter } from "@/lib/carer-report-utils";

export interface ContactReportCarer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  streetAddress: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  licenseNumber: string | null;
  licenseExpiry: string | null;
  specialties: string[];
  memberSince: string | null;
  active: boolean;
  hasProfile: boolean;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

function formatAddress(carer: ContactReportCarer) {
  return [carer.streetAddress, carer.suburb, carer.state, carer.postcode].filter(Boolean).join(", ") || "-";
}

function licenceStatusLabel(status: LicenceFilter) {
  const labels: Record<LicenceFilter, string> = {
    all: "All",
    valid: "Valid",
    expired: "Expired",
    "expiring-soon": "Expiring soon",
    missing: "Missing",
  };
  return labels[status];
}

function buildExportUrl(format: "csv" | "xlsx", active: ActiveFilter, specialty: string, licence: LicenceFilter) {
  const params = new URLSearchParams({ format, active, licence });
  if (specialty !== "all") params.set("specialty", specialty);
  return `/api/reports/carer-contacts?${params.toString()}`;
}

export default function CarerContactReportClient({ carers }: { carers: ContactReportCarer[] }) {
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("active");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [licenceFilter, setLicenceFilter] = useState<LicenceFilter>("all");

  const specialties = useMemo(
    () => [...new Set(carers.flatMap((carer) => carer.specialties).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [carers]
  );

  const filteredCarers = useMemo(() => {
    return carers
      .filter((carer) => {
        if (activeFilter === "active" && !carer.active) return false;
        if (activeFilter === "inactive" && carer.active) return false;
        if (specialtyFilter !== "all" && !carer.specialties.includes(specialtyFilter)) return false;
        if (licenceFilter !== "all" && getLicenceStatus(carer.licenseExpiry) !== licenceFilter) return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activeFilter, carers, licenceFilter, specialtyFilter]);

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #carer-contact-print,
          #carer-contact-print * {
            visibility: visible;
          }
          #carer-contact-print {
            position: absolute;
            inset: 0;
            width: 100%;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/compliance/carers">
            <Button variant="outline" size="icon" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" size="icon" className="shrink-0">
              <Home className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Carer Contact Details Report</h1>
            <p className="text-sm text-muted-foreground">Printable contact sheet and spreadsheet export for dispatch and compliance use.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={buildExportUrl("csv", activeFilter, specialtyFilter, licenceFilter)}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </a>
          </Button>
          <Button asChild size="sm">
            <a href={buildExportUrl("xlsx", activeFilter, specialtyFilter, licenceFilter)}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </a>
          </Button>
        </div>
      </div>

      <Card className="no-print">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>{filteredCarers.length} carers match the current filters.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={activeFilter} onValueChange={(value) => setActiveFilter(value as ActiveFilter)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="all">All carers</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Species specialty</Label>
            <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All specialties</SelectItem>
                {specialties.map((specialty) => (
                  <SelectItem key={specialty} value={specialty}>
                    {specialty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Licence status</Label>
            <Select value={licenceFilter} onValueChange={(value) => setLicenceFilter(value as LicenceFilter)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All licence statuses</SelectItem>
                <SelectItem value="valid">Valid</SelectItem>
                <SelectItem value="expiring-soon">Expiring soon</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="missing">Missing</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <section id="carer-contact-print" className="space-y-4">
        <div className="hidden print:block">
          <h1 className="text-2xl font-bold">Carer Contact Details Report</h1>
          <p className="text-sm text-muted-foreground">Generated {new Date().toLocaleDateString("en-AU")}</p>
        </div>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Contact Details</CardTitle>
                <CardDescription>{filteredCarers.length} carers shown</CardDescription>
              </div>
              <Badge variant="outline">{activeFilter === "all" ? "All statuses" : activeFilter}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Licence</TableHead>
                    <TableHead>Specialties</TableHead>
                    <TableHead>Member since</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCarers.map((carer) => {
                    const licenceStatus = getLicenceStatus(carer.licenseExpiry);
                    return (
                      <TableRow key={carer.id}>
                        <TableCell className="font-medium">
                          <div>{carer.name}</div>
                          {!carer.hasProfile && <div className="text-xs text-muted-foreground">Profile incomplete</div>}
                          {!carer.active && <Badge variant="secondary">Inactive</Badge>}
                        </TableCell>
                        <TableCell>{carer.phone || "-"}</TableCell>
                        <TableCell>{carer.email || "-"}</TableCell>
                        <TableCell className="min-w-48">{formatAddress(carer)}</TableCell>
                        <TableCell>
                          <div>{carer.licenseNumber || "-"}</div>
                          <div className="text-xs text-muted-foreground">{formatDate(carer.licenseExpiry)}</div>
                          <Badge variant={licenceStatus === "expired" ? "destructive" : "outline"} className="mt-1">
                            {licenceStatusLabel(licenceStatus)}
                          </Badge>
                        </TableCell>
                        <TableCell className="min-w-44">{carer.specialties.length ? carer.specialties.join(", ") : "-"}</TableCell>
                        <TableCell>{formatDate(carer.memberSince)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredCarers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No carers match these filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
