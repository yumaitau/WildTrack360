// src/components/carer-distribution-chart.tsx
"use client";

import * as React from "react";
import { colorLegend, defineChart } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { pie, polar, radialArc } from "@tanstack/charts/polar";
import { tooltip } from "@tanstack/charts/tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CHART_COLORS } from "@/components/ui/chart";
import { Animal } from "@prisma/client";

interface CarerDistributionChartProps {
  animals: Animal[];
  carerMap?: Record<string, string>; // carerId → name
}

export default function CarerDistributionChart({
  animals,
  carerMap = {},
}: CarerDistributionChartProps) {
  const chartData = React.useMemo(() => {
    const carerCount = animals
      .filter((a) => a.status === "IN_CARE")
      .reduce(
        (acc, animal) => {
          if (animal.carerId) {
            acc[animal.carerId] = (acc[animal.carerId] || 0) + 1;
          }
          return acc;
        },
        {} as { [key: string]: number }
      );

    return Object.entries(carerCount).map(([carerId, count]) => ({
      name: carerMap[carerId] || "Carer email unavailable",
      value: count,
    }));
  }, [animals, carerMap]);

  const definition = React.useMemo(() => {
    const slices = pie(chartData, { value: "value", gapAngle: 0.02 });
    const names = chartData.map((d) => d.name);

    return defineChart({
      marks: [
        polar({
          inset: 8,
          radiusRatio: 0.9,
          marks: [
            radialArc(slices, {
              innerRadius: ({ radius }) => radius * 0.55,
              cornerRadius: 3,
              color: "name",
              key: "name",
            }),
          ],
        }),
      ],
      color: {
        domain: names,
        range: names.map(
          (_, i) => CHART_COLORS[i % CHART_COLORS.length]
        ),
        legend: colorLegend({ label: "Carer" }),
      },
      tooltip,
    });
  }, [chartData]);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Carer Workload</CardTitle>
        <CardDescription>Animals currently in care per carer</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {chartData.length > 0 ? (
          <div className="mx-auto aspect-square max-h-[300px] w-full">
            <Chart
              definition={definition}
              height={280}
              ariaLabel="Animals currently in care per carer"
              className="h-full w-full"
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            No data to display.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
