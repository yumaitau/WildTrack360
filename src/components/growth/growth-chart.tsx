"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type GrowthReferencePoint, calculatePredictedWeight } from "@/lib/growth-utils";
import type { GrowthMeasurement } from "@prisma/client";
import { differenceInDays } from "date-fns";

interface GrowthChartProps {
  measurements: GrowthMeasurement[];
  referenceData: GrowthReferencePoint[];
  dateOfBirth: Date | null;
}

interface ChartDataPoint {
  ageDays: number;
  actual?: number;
  predicted?: number;
}

export function GrowthChart({
  measurements,
  referenceData,
  dateOfBirth,
}: GrowthChartProps) {
  const chartData = useMemo(() => {
    if (!dateOfBirth) return [];

    const dob = new Date(dateOfBirth);
    const dataMap = new Map<number, ChartDataPoint>();

    // Add actual measurements
    for (const m of measurements) {
      if (m.weightGrams == null) continue;
      const ageDays = differenceInDays(new Date(m.date), dob);
      if (ageDays < 0) continue;
      dataMap.set(ageDays, {
        ageDays,
        actual: m.weightGrams,
        predicted: dataMap.get(ageDays)?.predicted,
      });
    }

    // Add predicted curve from reference data
    for (const ref of referenceData) {
      if (ref.weightGrams == null) continue;
      const existing = dataMap.get(ref.ageDays);
      dataMap.set(ref.ageDays, {
        ageDays: ref.ageDays,
        actual: existing?.actual,
        predicted: ref.weightGrams,
      });
    }

    // Also fill predicted values at actual measurement ages
    for (const m of measurements) {
      if (m.weightGrams == null) continue;
      const ageDays = differenceInDays(new Date(m.date), dob);
      if (ageDays < 0) continue;
      const point = dataMap.get(ageDays);
      if (point && point.predicted == null) {
        const predicted = calculatePredictedWeight(referenceData, ageDays);
        if (predicted != null) {
          point.predicted = predicted;
        }
      }
    }

    return Array.from(dataMap.values()).sort((a, b) => a.ageDays - b.ageDays);
  }, [measurements, referenceData, dateOfBirth]);

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

  if (chartData.length === 0) {
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
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="ageDays"
              label={{ value: "Age (days)", position: "insideBottomRight", offset: -5 }}
            />
            <YAxis
              label={{
                value: "Weight (g)",
                angle: -90,
                position: "insideLeft",
                offset: -5,
              }}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                `${Math.round(value)}g`,
                name === "actual" ? "Actual" : "Predicted",
              ]}
              labelFormatter={(label) => `Age: ${label} days`}
            />
            <Legend
              formatter={(value) =>
                value === "actual" ? "Actual Weight" : "Predicted Weight"
              }
            />
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="hsl(var(--chart-1, 221.2 83.2% 53.3%))"
              strokeWidth={2}
              dot={false}
              connectNulls
              name="predicted"
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="hsl(var(--chart-2, 0 84.2% 60.2%))"
              strokeWidth={2}
              dot={{ r: 4 }}
              connectNulls
              name="actual"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
