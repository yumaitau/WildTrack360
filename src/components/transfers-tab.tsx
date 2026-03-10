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
import { ArrowRightLeft, Plus, Trash2, AlertTriangle } from "lucide-react";
import type { AnimalTransfer } from "@/lib/types";
import { AddressAutocomplete, type AddressDetails } from "@/components/address-autocomplete";

interface TransfersTabProps {
  animalId: string;
  animalName: string;
  animalStatus: string;
  initialTransfers: AnimalTransfer[];
  canManageTransfers: boolean;
  onAnimalStatusChange?: (updatedAnimal: any) => void;
  onCountChange?: (count: number) => void;
}

const TRANSFER_TYPE_LABELS: Record<string, string> = {
  INTERNAL_CARER: "Internal Carer Transfer",
  INTER_ORGANISATION: "Inter-Organisation Transfer",
  VET_TRANSFER: "Vet Transfer",
  PERMANENT_CARE_PLACEMENT: "Permanent Care Placement",
  RELEASE_TRANSFER: "Release Transfer",
};

const TRANSFER_TYPE_COLORS: Record<string, string> = {
  INTERNAL_CARER: "bg-blue-100 text-blue-800 border-blue-300",
  INTER_ORGANISATION: "bg-purple-100 text-purple-800 border-purple-300",
  VET_TRANSFER: "bg-yellow-100 text-yellow-800 border-yellow-300",
  PERMANENT_CARE_PLACEMENT: "bg-orange-100 text-orange-800 border-orange-300",
  RELEASE_TRANSFER: "bg-green-100 text-green-800 border-green-300",
};

const ENTITY_TYPES = [
  { value: "organisation", label: "Organisation" },
  { value: "zoo", label: "Zoo / Animal Park" },
  { value: "vet", label: "Veterinary Clinic" },
  { value: "individual", label: "Individual Carer" },
  { value: "facility", label: "Facility" },
];

export function TransfersTab({
  animalId,
  animalName,
  animalStatus,
  initialTransfers,
  canManageTransfers,
  onAnimalStatusChange,
  onCountChange,
}: TransfersTabProps) {
  const isPermanentCare = animalStatus === "PERMANENT_CARE";
  const [transfers, setTransfers] = useState<AnimalTransfer[]>(initialTransfers);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    transferDate: new Date().toISOString().split("T")[0],
    transferType: "INTERNAL_CARER",
    reasonForTransfer: "",
    receivingEntity: "",
    receivingEntityType: "",
    receivingLicense: "",
    receivingContactName: "",
    receivingContactPhone: "",
    receivingContactEmail: "",
    receivingOrgAnimalId: "",
    receivingAddress: "",
    receivingSuburb: "",
    receivingState: "NSW",
    receivingPostcode: "",
    transferAuthorizedBy: "",
    transferNotes: "",
  });

  const resetForm = () => {
    setForm({
      transferDate: new Date().toISOString().split("T")[0],
      transferType: "INTERNAL_CARER",
      reasonForTransfer: "",
      receivingEntity: "",
      receivingEntityType: "",
      receivingLicense: "",
      receivingContactName: "",
      receivingContactPhone: "",
      receivingContactEmail: "",
      receivingOrgAnimalId: "",
      receivingAddress: "",
      receivingSuburb: "",
      receivingState: "NSW",
      receivingPostcode: "",
      transferAuthorizedBy: "",
      transferNotes: "",
    });
  };

  const requiresReceivingAuthority = ["INTER_ORGANISATION", "PERMANENT_CARE_PLACEMENT"].includes(form.transferType);

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ animalId, ...form }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create transfer");
      }
      const data = await res.json();
      setTransfers((prev) => {
        const updated = [data.transfer, ...prev];
        onCountChange?.(updated.length);
        return updated;
      });
      setIsCreateOpen(false);
      resetForm();

      // Update parent with new animal status
      if (data.updatedAnimal && onAnimalStatusChange) {
        onAnimalStatusChange(data.updatedAnimal);
      }

      const statusLabel = data.updatedAnimal?.status === "PERMANENT_CARE" ? "Permanent Care" : "Transferred";
      toast({ title: "Transfer Recorded", description: `${animalName} has been marked as ${statusLabel}.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: e instanceof Error ? e.message : "Failed to create transfer" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (transferId: string) => {
    try {
      const res = await fetch(`/api/transfers/${transferId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete transfer");
      setTransfers((prev) => {
        const updated = prev.filter((t) => t.id !== transferId);
        onCountChange?.(updated.length);
        return updated;
      });
      toast({ title: "Deleted", description: "Transfer record deleted." });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: e instanceof Error ? e.message : "Failed to delete" });
    }
  };

  return (
    <div className="space-y-4">
      {isPermanentCare && (
        <Alert variant="default" className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-sm">
            This animal is in NPWS-approved permanent care and cannot be transferred. If the placement needs to change, contact your coordinator or admin.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Transfer History</h3>
        {canManageTransfers && !isPermanentCare && (
          <Button onClick={() => setIsCreateOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Record Transfer
          </Button>
        )}
      </div>

      {transfers.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <ArrowRightLeft className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No transfer records for this animal.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {transfers.map((transfer) => (
            <Card key={transfer.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4" />
                    {new Date(transfer.transferDate).toLocaleDateString("en-AU")}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={TRANSFER_TYPE_COLORS[transfer.transferType] || ""}>
                      {TRANSFER_TYPE_LABELS[transfer.transferType] || transfer.transferType}
                    </Badge>
                    {canManageTransfers && (
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(transfer.id)} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-medium text-muted-foreground">To:</span>{" "}
                    {transfer.receivingEntity}
                    {transfer.receivingEntityType && (
                      <span className="text-muted-foreground"> ({transfer.receivingEntityType})</span>
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Reason:</span>{" "}
                    {transfer.reasonForTransfer}
                  </div>
                </div>

                {transfer.receivingLicense && (
                  <div>
                    <span className="font-medium text-muted-foreground">Licence:</span>{" "}
                    {transfer.receivingLicense}
                  </div>
                )}

                {transfer.receivingContactName && (
                  <div>
                    <span className="font-medium text-muted-foreground">Contact:</span>{" "}
                    {transfer.receivingContactName}
                    {transfer.receivingContactPhone && ` | ${transfer.receivingContactPhone}`}
                    {transfer.receivingContactEmail && ` | ${transfer.receivingContactEmail}`}
                  </div>
                )}

                {(transfer.receivingAddress || transfer.receivingSuburb) && (
                  <div>
                    <span className="font-medium text-muted-foreground">Address:</span>{" "}
                    {[transfer.receivingAddress, transfer.receivingSuburb, transfer.receivingState, transfer.receivingPostcode].filter(Boolean).join(", ")}
                  </div>
                )}

                {transfer.transferAuthorizedBy && (
                  <div>
                    <span className="font-medium text-muted-foreground">Authorised by:</span>{" "}
                    {transfer.transferAuthorizedBy}
                  </div>
                )}

                {transfer.transferNotes && (
                  <div>
                    <span className="font-medium text-muted-foreground">Notes:</span>{" "}
                    {transfer.transferNotes}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Transfer Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Transfer for {animalName}</DialogTitle>
            <DialogDescription>
              Record a transfer of this animal. All transfers require an authorised user and reason.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Transfer Date *</Label>
                <Input type="date" value={form.transferDate} onChange={(e) => setForm((p) => ({ ...p, transferDate: e.target.value }))} />
              </div>
              <div>
                <Label>Transfer Type *</Label>
                <Select value={form.transferType} onValueChange={(v) => setForm((p) => ({ ...p, transferType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INTERNAL_CARER">Internal Carer Transfer</SelectItem>
                    <SelectItem value="INTER_ORGANISATION">Inter-Organisation Transfer</SelectItem>
                    <SelectItem value="VET_TRANSFER">Vet Transfer</SelectItem>
                    <SelectItem value="PERMANENT_CARE_PLACEMENT">Permanent Care Placement</SelectItem>
                    <SelectItem value="RELEASE_TRANSFER">Release Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Reason for Transfer *</Label>
              <Textarea
                value={form.reasonForTransfer}
                onChange={(e) => setForm((p) => ({ ...p, reasonForTransfer: e.target.value }))}
                placeholder="Why is this animal being transferred?"
              />
            </div>

            <div>
              <Label>Authorised By *</Label>
              <Input
                value={form.transferAuthorizedBy}
                onChange={(e) => setForm((p) => ({ ...p, transferAuthorizedBy: e.target.value }))}
                placeholder="Name of person authorising this transfer"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Receiving Entity *</Label>
                <Input
                  value={form.receivingEntity}
                  onChange={(e) => setForm((p) => ({ ...p, receivingEntity: e.target.value }))}
                  placeholder="Name of receiving party"
                />
              </div>
              <div>
                <Label>Entity Type</Label>
                <Select value={form.receivingEntityType} onValueChange={(v) => setForm((p) => ({ ...p, receivingEntityType: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>
                  Receiving Authority / Licence Number
                  {requiresReceivingAuthority && <span className="text-red-500"> *</span>}
                </Label>
                <Input
                  value={form.receivingLicense}
                  onChange={(e) => setForm((p) => ({ ...p, receivingLicense: e.target.value }))}
                  placeholder="Licence or authority number"
                />
              </div>
              <div>
                <Label>Their Animal ID</Label>
                <Input
                  value={form.receivingOrgAnimalId}
                  onChange={(e) => setForm((p) => ({ ...p, receivingOrgAnimalId: e.target.value }))}
                  placeholder="Receiving org's animal ID"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Contact Name</Label>
                <Input value={form.receivingContactName} onChange={(e) => setForm((p) => ({ ...p, receivingContactName: e.target.value }))} autoComplete="off" />
              </div>
              <div>
                <Label>Contact Phone</Label>
                <Input value={form.receivingContactPhone} onChange={(e) => setForm((p) => ({ ...p, receivingContactPhone: e.target.value }))} autoComplete="off" />
              </div>
              <div>
                <Label>Contact Email</Label>
                <Input value={form.receivingContactEmail} onChange={(e) => setForm((p) => ({ ...p, receivingContactEmail: e.target.value }))} autoComplete="off" />
              </div>
            </div>

            <div>
              <Label>Receiving Address</Label>
              <AddressAutocomplete
                value={form.receivingAddress}
                onChange={(value) => setForm((p) => ({ ...p, receivingAddress: value }))}
                onSelect={(details: AddressDetails) => {
                  setForm((p) => ({
                    ...p,
                    receivingAddress: details.streetAddress || details.formattedAddress,
                    receivingSuburb: details.suburb,
                    receivingState: details.state,
                    receivingPostcode: details.postcode,
                  }));
                }}
                placeholder="Start typing an address..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Suburb</Label>
                <Input value={form.receivingSuburb} onChange={(e) => setForm((p) => ({ ...p, receivingSuburb: e.target.value }))} autoComplete="off" />
              </div>
              <div>
                <Label>State</Label>
                <Input value={form.receivingState} onChange={(e) => setForm((p) => ({ ...p, receivingState: e.target.value }))} autoComplete="off" />
              </div>
              <div>
                <Label>Postcode</Label>
                <Input value={form.receivingPostcode} onChange={(e) => setForm((p) => ({ ...p, receivingPostcode: e.target.value }))} autoComplete="off" />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={form.transferNotes}
                onChange={(e) => setForm((p) => ({ ...p, transferNotes: e.target.value }))}
                placeholder="Additional transfer notes..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={isSubmitting || !form.reasonForTransfer || !form.receivingEntity || !form.transferAuthorizedBy || (requiresReceivingAuthority && !form.receivingLicense)}
            >
              {isSubmitting ? "Saving..." : "Record Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
