"use client";

import { useMemo } from "react";
import { Info } from "lucide-react";
import { colorLegend, defineChart, lineY } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type GrowthReferencePoint,
  calculatePredictedWeight,
} from "@/lib/growth-utils";
import type { GrowthMeasurement } from "@prisma/client";
import { differenceInDays } from "date-fns";

interface GrowthReferenceWithMeta extends GrowthReferencePoint {
  reference?: string | null;
}

interface GrowthChartProps {
  measurements: GrowthMeasurement[];
  referenceData: GrowthReferenceWithMeta[];
  dateOfBirth: Date | null;
}

interface SeriesPoint {
  ageDays: number;
  weight: number;
  series: "Actual Weight" | "Predicted Weight";
}

const SERIES_COLORS = {
  "Predicted Weight": "hsl(var(--chart-1, 221.2 83.2% 53.3%))",
  "Actual Weight": "hsl(var(--chart-2, 0 84.2% 60.2%))",
} as const;

export function GrowthChart({
  measurements,
  referenceData,
  dateOfBirth,
}: GrowthChartProps) {
  const referenceSource = useMemo(() => {
    const sources = new Set(
      referenceData
        .map((r) => (r as GrowthReferenceWithMeta).reference)
        .filter(Boolean)
    );
    return sources.size > 0 ? Array.from(sources).join("; ") : null;
  }, [referenceData]);

  const seriesRows = useMemo(() => {
    if (!dateOfBirth) return [] as SeriesPoint[];

    const dob = new Date(dateOfBirth);
    const predicted: SeriesPoint[] = [];
    const actual: SeriesPoint[] = [];
    const agesWithActual = new Set<number>();

    for (const m of measurements) {
      if (m.weightGrams == null) continue;
      const ageDays = differenceInDays(new Date(m.date), dob);
      if (ageDays < 0) continue;
      agesWithActual.add(ageDays);
      actual.push({
        ageDays,
        weight: m.weightGrams,
        series: "Actual Weight",
      });
    }

    for (const ref of referenceData) {
      if (ref.weightGrams == null) continue;
      predicted.push({
        ageDays: ref.ageDays,
        weight: ref.weightGrams,
        series: "Predicted Weight",
      });
    }

    // Fill predicted at actual measurement ages when missing from reference
    for (const ageDays of agesWithActual) {
      if (predicted.some((p) => p.ageDays === ageDays)) continue;
      const weight = calculatePredictedWeight(referenceData, ageDays);
      if (weight != null) {
        predicted.push({ ageDays, weight, series: "Predicted Weight" });
      }
    }

    predicted.sort((a, b) => a.ageDays - b.ageDays);
    actual.sort((a, b) => a.ageDays - b.ageDays);

    return [...predicted, ...actual];
  }, [measurements, referenceData, dateOfBirth]);

  const definition = useMemo(() => {
    if (seriesRows.length === 0) return null;

    return defineChart({
      marks: [
        lineY(seriesRows, {
          x: "ageDays",
          y: "weight",
          z: "series",
          color: "series",
          strokeWidth: 2,
          points: true,
          key: (d) => `${d.series}-${d.ageDays}`,
        }),
      ],
      x: {
        scale: scaleLinear,
        nice: true,
        grid: true,
        axis: { label: "Age (days)" },
      },
      y: {
        scale: scaleLinear,
        nice: true,
        grid: true,
        axis: { label: "Weight (g)" },
      },
      color: {
        domain: ["Predicted Weight", "Actual Weight"],
        range: [
          SERIES_COLORS["Predicted Weight"],
          SERIES_COLORS["Actual Weight"],
        ],
        legend: colorLegend({ label: "Series" }),
      },
      tooltip,
    });
  }, [seriesRows]);

  if (!dateOfBirth) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Growth Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            A date of birth is required to display the growth chart. Use the
            Birth Date Estimator below to estimate one.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (seriesRows.length === 0 || !definition) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Growth Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No weight measurements recorded yet. Add a growth measurement to see
            the chart.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Growth Chart</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <Chart
            definition={definition}
            height={350}
            ariaLabel="Growth chart comparing actual and predicted weight"
            className="h-full w-full"
          />
        </div>
        {referenceSource && (
          <div className="flex items-start gap-1.5 mt-3 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>Predicted growth curve source: {referenceSource}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
