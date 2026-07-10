"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, Loader2, Settings, Building2, ReceiptText } from "lucide-react";
import { toast } from '@/lib/toast';
import { renderAnimalIdTemplate } from "@/lib/animalId/template";

export function OrganisationSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgShortCode, setOrgShortCode] = useState("ORG");
  const [animalIdTemplate, setAnimalIdTemplate] = useState("{ORG_SHORT}-{YYYY}-{seq:4}");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [legalName, setLegalName] = useState("");
  const [abn, setAbn] = useState("");
  const [dgrEndorsed, setDgrEndorsed] = useState(false);
  const [donationThankYouMessage, setDonationThankYouMessage] = useState("");
  const [membershipThankYouMessage, setMembershipThankYouMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/org-settings")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => {
        setOrgShortCode(data.orgShortCode ?? "ORG");
        setAnimalIdTemplate(data.animalIdTemplate ?? "{ORG_SHORT}-{YYYY}-{seq:4}");
        setContactEmail(data.contactEmail ?? "");
        setContactPhone(data.contactPhone ?? "");
        setLicenseNumber(data.licenseNumber ?? "");
        setLegalName(data.legalName ?? "");
        setAbn(data.abn ?? "");
        setDgrEndorsed(Boolean(data.dgrEndorsed));
        setDonationThankYouMessage(data.donationThankYouMessage ?? "");
        setMembershipThankYouMessage(data.membershipThankYouMessage ?? "");
      })
      .catch(() => {
        toast.error("Failed to load organisation settings");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const preview = useMemo(
    () =>
      renderAnimalIdTemplate(animalIdTemplate, {
        orgShortCode,
        year: new Date().getFullYear(),
        seq: 42,
        species: "KANG",
      }),
    [animalIdTemplate, orgShortCode]
  );

  const patchSettings = async (payload: Record<string, string | boolean>) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/org-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to save");
      toast.success("Organisation settings updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const saveContactCard = () =>
    patchSettings({ contactEmail, contactPhone, licenseNumber });

  const saveBillingCard = () =>
    patchSettings({
      legalName,
      abn,
      dgrEndorsed,
      donationThankYouMessage,
      membershipThankYouMessage,
    });

  const saveAnimalIdCard = () =>
    patchSettings({ orgShortCode, animalIdTemplate });

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organisation Contact & Licence
          </CardTitle>
          <CardDescription>
            Contact details and licence number used for compliance reports and
            the readiness checklist on your home page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contactEmail">Contact email</Label>
            <Input
              id="contactEmail"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="admin@example.org"
              maxLength={254}
            />
            <p className="text-xs text-muted-foreground">
              Primary email for regulator correspondence about this
              organisation.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPhone">Contact phone</Label>
            <Input
              id="contactPhone"
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="e.g., 02 1234 5678"
              maxLength={30}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="licenseNumber">Licence number</Label>
            <Input
              id="licenseNumber"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="e.g., MWL000123"
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">
              Rehabilitation licence / authority number issued by your state
              regulator. Required for NSW DCCEEW and other compliance reports.
            </p>
          </div>

          <Button onClick={saveContactCard} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5" />
            Billing &amp; Receipts
          </CardTitle>
          <CardDescription>
            Your registered name and ABN appear on the payment receipts emailed
            to donors and members after they pay.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="legalName">Registered / legal name</Label>
            <Input
              id="legalName"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="e.g., Wildlife Rescue Inc."
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              The entity name shown as the issuer on receipts. Leave blank to use
              the default organisation name.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="abn">ABN</Label>
            <Input
              id="abn"
              value={abn}
              onChange={(e) => setAbn(e.target.value)}
              placeholder="e.g., 12 345 678 901"
              inputMode="numeric"
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground">
              11-digit Australian Business Number. Printed on every receipt.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={dgrEndorsed}
              onChange={(e) => setDgrEndorsed(e.target.checked)}
              className="h-4 w-4"
            />
            Endorsed Deductible Gift Recipient (DGR)
          </label>
          <p className="text-xs text-muted-foreground -mt-2">
            When endorsed, donation receipts carry the tax-deductible gift notice.
            Membership fees are never tax deductible.
          </p>

          <div className="space-y-2 border-t pt-4">
            <Label htmlFor="donationThankYou">Donation thank-you message</Label>
            <Textarea
              id="donationThankYou"
              rows={3}
              value={donationThankYouMessage}
              onChange={(e) => setDonationThankYouMessage(e.target.value)}
              placeholder="Thank you for your generous donation. Your support helps us care for injured wildlife."
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">
              Shown at the top of the receipt emailed after a donation. Use{" "}
              <code className="bg-muted px-1 rounded">{"{name}"}</code> to insert the
              donor&apos;s name. Leave blank for the default message.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="membershipThankYou">Membership thank-you message</Label>
            <Textarea
              id="membershipThankYou"
              rows={3}
              value={membershipThankYouMessage}
              onChange={(e) => setMembershipThankYouMessage(e.target.value)}
              placeholder="Thank you for joining as a member. Welcome to our community of wildlife supporters!"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">
              Shown on the receipt emailed after a membership signup or renewal.
              Supports <code className="bg-muted px-1 rounded">{"{name}"}</code>.
            </p>
          </div>

          <Button onClick={saveBillingCard} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Animal ID Format
          </CardTitle>
          <CardDescription>
            Configure how animal IDs are automatically generated for new animals.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orgShortCode">Organisation Short Code</Label>
            <Input
              id="orgShortCode"
              value={orgShortCode}
              onChange={(e) => setOrgShortCode(e.target.value.toUpperCase())}
              placeholder="e.g., WARC"
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground">
              A short abbreviation for your organisation, used in animal IDs.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="animalIdTemplate">ID Template</Label>
            <Input
              id="animalIdTemplate"
              value={animalIdTemplate}
              onChange={(e) => setAnimalIdTemplate(e.target.value)}
              placeholder="{ORG_SHORT}-{YYYY}-{seq:4}"
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              Available placeholders:{" "}
              <code className="bg-muted px-1 rounded">{"{ORG_SHORT}"}</code>{" "}
              <code className="bg-muted px-1 rounded">{"{YYYY}"}</code>{" "}
              <code className="bg-muted px-1 rounded">{"{YY}"}</code>{" "}
              <code className="bg-muted px-1 rounded">{"{seq}"}</code>{" "}
              <code className="bg-muted px-1 rounded">{"{seq:N}"}</code> (zero-padded to N digits){" "}
              <code className="bg-muted px-1 rounded">{"{SPECIES}"}</code>
            </p>
          </div>

          <div className="rounded-md bg-muted/50 border p-3">
            <p className="text-sm">
              <span className="font-medium">Preview:</span>{" "}
              <code className="bg-background px-2 py-0.5 rounded font-mono text-sm">
                {preview}
              </code>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Shown with sequence #42 and species &quot;KANG&quot; as examples.
            </p>
          </div>

          <Button onClick={saveAnimalIdCard} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
