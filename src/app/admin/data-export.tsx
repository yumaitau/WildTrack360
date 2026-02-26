"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileSpreadsheet, Loader2, CheckCircle2 } from "lucide-react";

const EXPORT_TABLES = [
  { name: "Animals", description: "All animal records with rescue/release details, conditions, and carer assignments" },
  { name: "Records", description: "Medical, feeding, behavioural, location, weight, and release records" },
  { name: "Photos", description: "Photo metadata linked to animals" },
  { name: "Species", description: "Species catalogue with scientific names and care requirements" },
  { name: "Carer Profiles", description: "Carer details including licenses, specialties, and NSW-specific fields" },
  { name: "Carer Training", description: "Training certificates, providers, expiry dates, and hours" },
  { name: "Hygiene Logs", description: "Hygiene compliance records with checklist items" },
  { name: "Incident Reports", description: "Safety incidents with severity levels and resolutions" },
  { name: "Release Checklists", description: "Pre-release verification with fitness indicators and vet sign-off" },
  { name: "Assets", description: "Equipment and resource tracking with maintenance history" },
  { name: "Animal Transfers", description: "Transfer records with receiving entity details" },
  { name: "Permanent Care", description: "NPWS permanent care approvals and status tracking" },
  { name: "Preserved Specimens", description: "Preserved specimen registry with storage details" },
  { name: "Organisation Members", description: "User roles and species group assignments" },
  { name: "Species Groups", description: "Configurable species groupings and coordinator assignments" },
  { name: "Audit Logs", description: "Immutable record of all create, update, and delete actions (up to 10,000 most recent)" },
];

export function DataExport() {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/admin/export");

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Export failed (${res.status})`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Extract filename from Content-Disposition header or use default
      const disposition = res.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      a.download = filenameMatch?.[1] || "wildtrack360-export.xlsx";

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Data Export
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Export all organisation data as an Excel workbook. Each database table
          is exported to a dedicated sheet. Data is scoped to your organisation
          only.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-sm font-medium mb-3">
            The following tables will be exported:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {EXPORT_TABLES.map((table) => (
              <div
                key={table.name}
                className="flex items-start gap-2 rounded-md border p-3"
              >
                <FileSpreadsheet className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium">{table.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {table.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button onClick={handleExport} disabled={exporting} size="lg">
            {exporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating export...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export All Data
              </>
            )}
          </Button>

          {success && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Export downloaded successfully
            </span>
          )}

          {error && (
            <span className="text-sm text-destructive">{error}</span>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          The export file is generated server-side and contains only data
          belonging to your organisation. This action is recorded in the audit
          log.
        </p>
      </CardContent>
    </Card>
  );
}
