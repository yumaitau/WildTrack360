"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Plus, CheckCircle, XCircle, Send, Upload, AlertTriangle, ExternalLink, X } from "lucide-react";
import type { PermanentCareApplication } from "@/lib/types";
import { getPhotoUrl } from "@/lib/photo-url";
import { AddressAutocomplete, type AddressDetails } from "@/components/address-autocomplete";

interface PermanentCareTabProps {
  animalId: string;
  animalName: string;
  animalStatus: string;
  initialApplications: PermanentCareApplication[];
  canDraft: boolean;
  canSubmit: boolean;
  canApprove: boolean;
  onAnimalStatusChange?: (updatedAnimal: any) => void;
  onCountChange?: (count: number) => void;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800 border-gray-300",
  SUBMITTED: "bg-blue-100 text-blue-800 border-blue-300",
  APPROVED: "bg-green-100 text-green-800 border-green-300",
  REJECTED: "bg-red-100 text-red-800 border-red-300",
};

export function PermanentCareTab({
  animalId,
  animalName,
  animalStatus,
  initialApplications,
  canDraft,
  canSubmit,
  canApprove,
  onAnimalStatusChange,
  onCountChange,
}: PermanentCareTabProps) {
  const isTransferred = animalStatus === "TRANSFERRED";
  const [applications, setApplications] = useState<PermanentCareApplication[]>(initialApplications);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<PermanentCareApplication | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Create form state
  const [createForm, setCreateForm] = useState({
    nonReleasableReasons: "",
    euthanasiaJustification: "",
    vetName: "",
    vetClinic: "",
    vetContact: "",
    vetReportUrl: "",
    keeperName: "",
    facilityName: "",
    facilityAddress: "",
    facilitySuburb: "",
    facilityState: "NSW",
    facilityPostcode: "",
    category: "" as string,
    notes: "",
    submitNow: false,
  });

  // Approve form state
  const [approveForm, setApproveForm] = useState({
    npwsApprovalNumber: "",
    npwsApprovalDate: "",
    facilityName: "",
    keeperName: "",
    receivingLicense: "",
    category: "",
  });

  const [rejectionReason, setRejectionReason] = useState("");
  const [vetReportFileName, setVetReportFileName] = useState("");
  const [vetReportLocalPreviewUrl, setVetReportLocalPreviewUrl] = useState("");

  const resetCreateForm = () => {
    setCreateForm({
      nonReleasableReasons: "", euthanasiaJustification: "",
      vetName: "", vetClinic: "", vetContact: "", vetReportUrl: "",
      keeperName: "", facilityName: "", facilityAddress: "",
      facilitySuburb: "", facilityState: "NSW", facilityPostcode: "", category: "", notes: "",
      submitNow: false,
    });
    setVetReportFileName("");
    if (vetReportLocalPreviewUrl) {
      URL.revokeObjectURL(vetReportLocalPreviewUrl);
      setVetReportLocalPreviewUrl("");
    }
  };

  const handleCreate = async (submitNow: boolean) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/permanent-care-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ animalId, ...createForm, submitNow }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create application");
      }
      const created = await res.json();
      setApplications((prev) => {
        const updated = [created, ...prev];
        onCountChange?.(updated.length);
        return updated;
      });
      setIsCreateOpen(false);
      resetCreateForm();
      toast({ title: "Application Created", description: `Permanent care application for ${animalName} has been ${created.status === 'SUBMITTED' ? 'submitted' : 'saved as draft'}.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: e instanceof Error ? e.message : "Failed to create application" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (app: PermanentCareApplication) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/permanent-care-applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit");
      }
      const updated = await res.json();
      setApplications((prev) => prev.map((a) => (a.id === app.id ? updated : a)));
      toast({ title: "Submitted", description: "Application submitted for approval." });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: e instanceof Error ? e.message : "Failed to submit" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedApp) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/permanent-care-applications/${selectedApp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", ...approveForm }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to approve");
      }
      const data = await res.json();
      // Response contains { application, updatedAnimal }
      const updatedApp = data.application || data;
      setApplications((prev) => prev.map((a) => (a.id === selectedApp.id ? updatedApp : a)));
      setIsApproveOpen(false);
      setApproveForm({ npwsApprovalNumber: "", npwsApprovalDate: "", facilityName: "", keeperName: "", receivingLicense: "", category: "" });

      if (data.updatedAnimal && onAnimalStatusChange) {
        onAnimalStatusChange(data.updatedAnimal);
      }

      toast({ title: "Approved", description: `${animalName} has been approved for permanent care and status updated.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: e instanceof Error ? e.message : "Failed to approve" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/permanent-care-applications/${selectedApp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", rejectionReason }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to reject");
      }
      const updated = await res.json();
      setApplications((prev) => prev.map((a) => (a.id === selectedApp.id ? updated : a)));
      setIsRejectOpen(false);
      setRejectionReason("");
      toast({ title: "Rejected", description: "Application has been rejected." });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: e instanceof Error ? e.message : "Failed to reject" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const [isUploading, setIsUploading] = useState(false);

  const handleUploadVetReport = async (file: File, appId?: string) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast({ variant: "destructive", title: "Invalid file type", description: "Vet reports must be uploaded as PDF files." });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload/document", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }
      const data = await res.json();
      const s3Key = data.key;

      if (appId) {
        // Update existing draft application
        const updateRes = await fetch(`/api/permanent-care-applications/${appId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vetReportUrl: s3Key }),
        });
        if (updateRes.ok) {
          const updated = await updateRes.json();
          setApplications((prev) => prev.map((a) => (a.id === appId ? updated : a)));
          toast({ title: "Uploaded", description: "Vet report uploaded successfully." });
        }
      } else {
        // Set on create form
        setCreateForm((prev) => ({ ...prev, vetReportUrl: s3Key }));
        setVetReportFileName(file.name);
        // Create a local blob URL for instant preview inside the dialog
        if (vetReportLocalPreviewUrl) URL.revokeObjectURL(vetReportLocalPreviewUrl);
        setVetReportLocalPreviewUrl(URL.createObjectURL(file));
        toast({ title: "Uploaded", description: "Vet report uploaded. It will be attached when you save." });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Upload Failed", description: e instanceof Error ? e.message : "Failed to upload vet report." });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {isTransferred && (
        <Alert variant="default" className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-sm">
            This animal has been transferred and is no longer eligible for permanent care applications.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Permanent Care Applications</h3>
        {canDraft && !isTransferred && (
          <Button onClick={() => setIsCreateOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> New Application
          </Button>
        )}
      </div>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No permanent care applications for this animal.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <Card key={app.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Application {app.category ? `(${app.category})` : ""}
                  </CardTitle>
                  <Badge variant="outline" className={STATUS_COLORS[app.status] || ""}>
                    {app.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">Reason not releasable:</span>
                    <p className="mt-0.5">{app.nonReleasableReasons}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Justification:</span>
                    <p className="mt-0.5">{app.euthanasiaJustification}</p>
                  </div>
                </div>

                {app.vetName && (
                  <div className="text-sm">
                    <span className="font-medium text-muted-foreground">Vet:</span>{" "}
                    {app.vetName} {app.vetClinic ? `(${app.vetClinic})` : ""}
                  </div>
                )}

                {app.vetReportUrl && (
                  <div className="flex items-center gap-2 p-2 rounded border border-green-200 bg-green-50">
                    <FileText className="h-4 w-4 text-green-600 shrink-0" />
                    <span className="text-sm font-medium text-green-700 flex-1">Vet Report (PDF)</span>
                    <a
                      href={getPhotoUrl(app.vetReportUrl) || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button type="button" variant="outline" size="sm" className="h-6 text-xs gap-1">
                        <ExternalLink className="h-3 w-3" /> View PDF
                      </Button>
                    </a>
                  </div>
                )}

                {!app.vetReportUrl && app.status === "DRAFT" && canDraft && (
                  <div>
                    {isUploading ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1" /> Uploading...
                      </Badge>
                    ) : (
                      <>
                        <Label htmlFor={`vet-upload-${app.id}`} className="cursor-pointer">
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 cursor-pointer">
                            <Upload className="h-3 w-3 mr-1" /> Upload Vet Report — PDF only (required)
                          </Badge>
                        </Label>
                        <input
                          id={`vet-upload-${app.id}`}
                          type="file"
                          accept=".pdf,application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadVetReport(file, app.id);
                          }}
                        />
                      </>
                    )}
                  </div>
                )}

                {app.npwsApprovalNumber && (
                  <div className="p-2 bg-green-50 rounded border border-green-200 text-sm">
                    <span className="font-medium text-green-800">NPWS Approval:</span>{" "}
                    {app.npwsApprovalNumber} ({app.npwsApprovalDate ? new Date(app.npwsApprovalDate).toLocaleDateString("en-AU") : ""})
                  </div>
                )}

                {app.rejectionReason && (
                  <div className="p-2 bg-red-50 rounded border border-red-200 text-sm">
                    <span className="font-medium text-red-800">Rejected:</span>{" "}
                    {app.rejectionReason}
                  </div>
                )}

                {app.facilityName && (
                  <div className="text-sm">
                    <span className="font-medium text-muted-foreground">Facility:</span>{" "}
                    {app.facilityName}
                    {app.facilitySuburb && `, ${app.facilitySuburb}`}
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Created {new Date(app.createdAt).toLocaleDateString("en-AU")}
                  {app.submittedAt && ` | Submitted ${new Date(app.submittedAt).toLocaleDateString("en-AU")}`}
                  {app.reviewedAt && ` | Reviewed ${new Date(app.reviewedAt).toLocaleDateString("en-AU")}`}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-2">
                  {app.status === "DRAFT" && canSubmit && app.vetReportUrl && !isTransferred && (
                    <Button size="sm" variant="default" onClick={() => handleSubmit(app)} disabled={isSubmitting}>
                      <Send className="h-3 w-3 mr-1" /> Submit for Approval
                    </Button>
                  )}
                  {app.status === "SUBMITTED" && canApprove && !isTransferred && (
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => { setSelectedApp(app); setIsApproveOpen(true); }}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => { setSelectedApp(app); setIsRejectOpen(true); }}
                      >
                        <XCircle className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Application Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Permanent Care Application for {animalName}</DialogTitle>
            <DialogDescription>
              Create an application for this animal to be placed in permanent care. A vet report is required before submission.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Reason animal cannot be released *</Label>
              <Textarea
                value={createForm.nonReleasableReasons}
                onChange={(e) => setCreateForm((p) => ({ ...p, nonReleasableReasons: e.target.value }))}
                placeholder="Describe why this animal cannot be released back to the wild..."
              />
            </div>

            <div>
              <Label>Justification for permanent care (instead of euthanasia) *</Label>
              <Textarea
                value={createForm.euthanasiaJustification}
                onChange={(e) => setCreateForm((p) => ({ ...p, euthanasiaJustification: e.target.value }))}
                placeholder="Explain why permanent care is preferred over euthanasia..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vet Name</Label>
                <Input value={createForm.vetName} onChange={(e) => setCreateForm((p) => ({ ...p, vetName: e.target.value }))} />
              </div>
              <div>
                <Label>Vet Clinic</Label>
                <Input value={createForm.vetClinic} onChange={(e) => setCreateForm((p) => ({ ...p, vetClinic: e.target.value }))} />
              </div>
            </div>

            <div>
              <Label>Vet Contact</Label>
              <Input value={createForm.vetContact} onChange={(e) => setCreateForm((p) => ({ ...p, vetContact: e.target.value }))} />
            </div>

            <div>
              <Label>Vet Report (PDF only)</Label>
              {createForm.vetReportUrl ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 rounded-lg border border-green-200 bg-green-50">
                    <FileText className="h-5 w-5 text-green-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-green-800 truncate">{vetReportFileName || "Vet Report.pdf"}</p>
                      <p className="text-xs text-green-600">PDF uploaded successfully</p>
                    </div>
                    <a
                      href={getPhotoUrl(createForm.vetReportUrl) || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0"
                    >
                      <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1">
                        <ExternalLink className="h-3 w-3" /> Open
                      </Button>
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => {
                        setCreateForm((p) => ({ ...p, vetReportUrl: "" }));
                        setVetReportFileName("");
                        if (vetReportLocalPreviewUrl) {
                          URL.revokeObjectURL(vetReportLocalPreviewUrl);
                          setVetReportLocalPreviewUrl("");
                        }
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {vetReportLocalPreviewUrl && (
                    <div className="rounded-lg border overflow-hidden bg-white">
                      <iframe
                        src={vetReportLocalPreviewUrl}
                        title="Vet report preview"
                        className="w-full h-[300px]"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {isUploading ? (
                    <div className="border-2 border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mx-auto mb-1" />
                      Uploading PDF...
                    </div>
                  ) : (
                    <>
                      <Label htmlFor="vet-upload-create" className="cursor-pointer">
                        <div className="border-2 border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground hover:border-primary cursor-pointer">
                          <Upload className="h-5 w-5 mx-auto mb-1" />
                          Click to upload vet report (PDF only)
                        </div>
                      </Label>
                      <input
                        id="vet-upload-create"
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadVetReport(file);
                        }}
                      />
                    </>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label>Care Category</Label>
              <Select value={createForm.category} onValueChange={(v) => setCreateForm((p) => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EDUCATION">Education</SelectItem>
                  <SelectItem value="COMPANION">Companion</SelectItem>
                  <SelectItem value="RESEARCH">Research</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Keeper Name</Label>
                <Input value={createForm.keeperName} onChange={(e) => setCreateForm((p) => ({ ...p, keeperName: e.target.value }))} />
              </div>
              <div>
                <Label>Facility Name</Label>
                <Input value={createForm.facilityName} onChange={(e) => setCreateForm((p) => ({ ...p, facilityName: e.target.value }))} />
              </div>
            </div>

            <div>
              <Label>Facility Address</Label>
              <AddressAutocomplete
                value={createForm.facilityAddress}
                onChange={(value) => setCreateForm((p) => ({ ...p, facilityAddress: value }))}
                onSelect={(details: AddressDetails) => {
                  setCreateForm((p) => ({
                    ...p,
                    facilityAddress: details.streetAddress || details.formattedAddress,
                    facilitySuburb: details.suburb,
                    facilityState: details.state,
                    facilityPostcode: details.postcode,
                  }));
                }}
                placeholder="Start typing a facility address..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Suburb</Label>
                <Input value={createForm.facilitySuburb} onChange={(e) => setCreateForm((p) => ({ ...p, facilitySuburb: e.target.value }))} autoComplete="off" />
              </div>
              <div>
                <Label>State</Label>
                <Input value={createForm.facilityState} onChange={(e) => setCreateForm((p) => ({ ...p, facilityState: e.target.value }))} autoComplete="off" />
              </div>
              <div>
                <Label>Postcode</Label>
                <Input value={createForm.facilityPostcode} onChange={(e) => setCreateForm((p) => ({ ...p, facilityPostcode: e.target.value }))} autoComplete="off" />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={createForm.notes}
                onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => handleCreate(false)}
              disabled={isSubmitting || !createForm.nonReleasableReasons || !createForm.euthanasiaJustification}
            >
              Save as Draft
            </Button>
            {canSubmit && (
              <Button
                onClick={() => handleCreate(true)}
                disabled={isSubmitting || !createForm.nonReleasableReasons || !createForm.euthanasiaJustification || !createForm.vetReportUrl}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="h-3 w-3 mr-1" /> Save & Submit
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Permanent Care Application</DialogTitle>
            <DialogDescription>Record NPWS approval details. These are required fields.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>NPWS Approval Number *</Label>
              <Input value={approveForm.npwsApprovalNumber} onChange={(e) => setApproveForm((p) => ({ ...p, npwsApprovalNumber: e.target.value }))} placeholder="e.g., NPWS-2026-001" />
            </div>
            <div>
              <Label>Approval Date *</Label>
              <Input type="date" value={approveForm.npwsApprovalDate} onChange={(e) => setApproveForm((p) => ({ ...p, npwsApprovalDate: e.target.value }))} />
            </div>
            <div>
              <Label>Facility Name</Label>
              <Input value={approveForm.facilityName} onChange={(e) => setApproveForm((p) => ({ ...p, facilityName: e.target.value }))} />
            </div>
            <div>
              <Label>Keeper Name</Label>
              <Input value={approveForm.keeperName} onChange={(e) => setApproveForm((p) => ({ ...p, keeperName: e.target.value }))} />
            </div>
            <div>
              <Label>Receiving Licence Number</Label>
              <Input value={approveForm.receivingLicense} onChange={(e) => setApproveForm((p) => ({ ...p, receivingLicense: e.target.value }))} />
            </div>
            <div>
              <Label>Care Category</Label>
              <Select value={approveForm.category} onValueChange={(v) => setApproveForm((p) => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EDUCATION">Education</SelectItem>
                  <SelectItem value="COMPANION">Companion</SelectItem>
                  <SelectItem value="RESEARCH">Research</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveOpen(false)}>Cancel</Button>
            <Button
              onClick={handleApprove}
              disabled={isSubmitting || !approveForm.npwsApprovalNumber || !approveForm.npwsApprovalDate}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-1" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>Provide a reason for rejecting this application.</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Rejection Reason *</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={isSubmitting || !rejectionReason.trim()}>
              <XCircle className="h-4 w-4 mr-1" /> Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
