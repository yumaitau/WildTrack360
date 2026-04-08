"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  type GrowthReferencePoint,
  type MeasurementField,
  MEASUREMENT_LABELS,
  getRelevantFields,
  estimateBirthDate,
} from "@/lib/growth-utils";
import type { Animal } from "@/lib/types";

interface BirthDateEstimatorProps {
  animal: Animal;
  referenceData: GrowthReferencePoint[];
  onBirthDateSet?: (updated: Animal) => void;
}

export function BirthDateEstimator({
  animal,
  referenceData,
  onBirthDateSet,
}: BirthDateEstimatorProps) {
  const { toast } = useToast();
  const [measurementDate, setMeasurementDate] = useState<Date>(new Date());
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{
    estimates: { field: string; label: string; value: number; estimatedAgeDays: number; estimatedBirthDate: Date }[];
    medianBirthDate: Date | null;
    medianAge: number | null;
  } | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  // Determine species subtype from reference data to decide which fields to show
  const hasWingData = referenceData.some((r) => r.wingLengthMm != null);
  const speciesSubtype = hasWingData ? "Bat" : null;
  const relevantFields = getRelevantFields(speciesSubtype);

  function handleEstimate() {
    const measurements: Partial<Record<MeasurementField, number>> = {};
    for (const field of relevantFields) {
      const val = values[field];
      if (val && parseFloat(val) > 0) {
        measurements[field] = parseFloat(val);
      }
    }

    if (Object.keys(measurements).length === 0) {
      toast({
        title: "No measurements",
        description: "Enter at least one measurement to estimate birth date.",
        variant: "destructive",
      });
      return;
    }

    const estimation = estimateBirthDate(referenceData, measurements, measurementDate);

    if (!estimation.medianEstimatedBirthDate) {
      toast({
        title: "Cannot estimate",
        description: "The measurements are outside the reference data range for this species.",
        variant: "destructive",
      });
      return;
    }

    setResult({
      estimates: estimation.estimates.map((e) => ({
        field: e.field,
        label: e.label,
        value: e.value,
        estimatedAgeDays: e.estimatedAgeDays,
        estimatedBirthDate: e.estimatedBirthDate,
      })),
      medianBirthDate: estimation.medianEstimatedBirthDate,
      medianAge: estimation.medianEstimatedAgeDays,
    });
  }

  async function handleApply() {
    if (!result?.medianBirthDate) return;
    setIsApplying(true);
    try {
      const res = await fetch(`/api/animals/${animal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateOfBirth: result.medianBirthDate.toISOString(),
        }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      toast({
        title: "Birth date set",
        description: `Date of birth set to ${format(result.medianBirthDate, "dd MMM yyyy")}.`,
      });
      onBirthDateSet?.(updated);
    } catch {
      toast({
        title: "Error",
        description: "Failed to update birth date.",
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
          <Calculator className="h-5 w-5" />
          Birth Date Estimator
        </CardTitle>
        <CardDescription className="text-amber-700 dark:text-amber-300">
          This animal has no date of birth. Enter measurements to estimate it
          using {animal.species} growth reference data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Measurement Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] mt-1 pl-3 text-left font-normal",
                  !measurementDate && "text-muted-foreground"
                )}
              >
                {measurementDate
                  ? format(measurementDate, "PPP")
                  : "Pick a date"}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={measurementDate}
                onSelect={(d) => d && setMeasurementDate(d)}
                disabled={(date) => date > new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {relevantFields.map((field) => (
            <div key={field}>
              <Label>{MEASUREMENT_LABELS[field]}</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                placeholder="0"
                className="mt-1"
                value={values[field] || ""}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [field]: e.target.value }))
                }
              />
            </div>
          ))}
        </div>

        <Button onClick={handleEstimate} variant="secondary">
          <Calculator className="mr-2 h-4 w-4" />
          Estimate Birth Date
        </Button>

        {result && result.medianBirthDate && (
          <div className="rounded-md border border-amber-300 bg-white dark:bg-amber-950 p-4 space-y-3">
            <div className="text-lg font-semibold">
              Estimated Birth Date:{" "}
              <span className="text-amber-800 dark:text-amber-200">
                {format(result.medianBirthDate, "dd MMM yyyy")}
              </span>
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({result.medianAge} days old)
              </span>
            </div>

            {result.estimates.length > 1 && (
              <div className="text-sm space-y-1">
                <p className="font-medium text-muted-foreground">
                  Per-measurement estimates:
                </p>
                {result.estimates.map((e) => (
                  <p key={e.field} className="text-muted-foreground">
                    {e.label}: {e.value} → {e.estimatedAgeDays} days →{" "}
                    {format(e.estimatedBirthDate, "dd MMM yyyy")}
                  </p>
                ))}
              </div>
            )}

            <Button onClick={handleApply} disabled={isApplying}>
              {isApplying ? "Applying..." : "Apply Birth Date to Animal"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
