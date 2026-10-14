// src/components/species-distribution-chart.tsx
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

interface SpeciesDistributionChartProps {
  animals: Animal[];
}

export default function SpeciesDistributionChart({
  animals,
}: SpeciesDistributionChartProps) {
  const chartData = React.useMemo(() => {
    const speciesCount = animals.reduce(
      (acc, animal) => {
        acc[animal.species] = (acc[animal.species] || 0) + 1;
        return acc;
      },
      {} as { [key: string]: number }
    );

    return Object.entries(speciesCount).map(([species, count]) => ({
      name: species,
      value: count,
    }));
  }, [animals]);

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
        legend: colorLegend({ label: "Species" }),
      },
      tooltip,
    });
  }, [chartData]);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Species Distribution</CardTitle>
        <CardDescription>Breakdown of animals by species</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {chartData.length > 0 ? (
          <div className="mx-auto aspect-square max-h-[300px] w-full">
            <Chart
              definition={definition}
              height={280}
              ariaLabel="Species distribution"
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
