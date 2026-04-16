"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, Loader2, Settings } from "lucide-react";
import { toast } from "sonner";
import { renderAnimalIdTemplate } from "@/lib/animalId/template";

export function OrganisationSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgShortCode, setOrgShortCode] = useState("ORG");
  const [animalIdTemplate, setAnimalIdTemplate] = useState("{ORG_SHORT}-{YYYY}-{seq:4}");

  useEffect(() => {
    fetch("/api/admin/org-settings")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => {
        setOrgShortCode(data.orgShortCode ?? "ORG");
        setAnimalIdTemplate(data.animalIdTemplate ?? "{ORG_SHORT}-{YYYY}-{seq:4}");
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/org-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgShortCode, animalIdTemplate }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to save");
      toast.success("Organisation settings updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

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

          <Button onClick={handleSave} disabled={saving}>
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
