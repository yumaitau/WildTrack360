"use client";

import { useMemo } from "react";
import { barY, colorLegend, defineChart, group } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { fold } from "@tanstack/charts/transform/fold";
import { tooltip } from "@tanstack/charts/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Animal } from "@prisma/client";

interface ReleasesVsAdmissionsChartProps {
  animals: Animal[];
}

const SERIES_COLORS = {
  Admissions: "#3b82f6",
  Releases: "#10b981",
} as const;

export default function ReleasesVsAdmissionsChart({
  animals,
}: ReleasesVsAdmissionsChartProps) {
  const chartData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    return months.map((month, index) => {
      const monthStart = new Date(currentYear, index, 1);
      const monthEnd = new Date(currentYear, index + 1, 0);

      const admissions = animals.filter((animal) => {
        const foundDate = new Date(animal.dateFound);
        return foundDate >= monthStart && foundDate <= monthEnd;
      }).length;

      const releases = animals.filter((animal) => {
        if (animal.status !== "RELEASED") return false;
        if (!animal.outcomeDate) return false;
        const releaseDate = new Date(animal.outcomeDate);
        return releaseDate >= monthStart && releaseDate <= monthEnd;
      }).length;

      return {
        month,
        Admissions: admissions,
        Releases: releases,
      };
    });
  }, [animals]);

  const definition = useMemo(() => {
    const rows = fold(chartData, {
      fields: ["Admissions", "Releases"] as const,
      as: { key: "series", value: "count" },
    });

    return defineChart({
      marks: [
        barY(rows, {
          x: "month",
          y: "count",
          color: "series",
          layout: group({ padding: 0.15 }),
          radius: 4,
          key: (d) => `${d.month}-${d.series}`,
        }),
      ],
      x: {
        scale: () =>
          scaleBand<string>()
            .domain(chartData.map((d) => d.month))
            .padding(0.2),
        axis: {
          tickLabels: { fontSize: 12 },
        },
      },
      y: {
        scale: scaleLinear,
        nice: true,
        grid: true,
        axis: {
          tickLabels: { fontSize: 12 },
        },
      },
      color: {
        domain: ["Admissions", "Releases"],
        range: [SERIES_COLORS.Admissions, SERIES_COLORS.Releases],
        legend: colorLegend({ label: "Metric" }),
      },
      tooltip,
    });
  }, [chartData]);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-primary">
          Releases vs Admissions
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Monthly comparison of animal admissions and releases
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <Chart
            definition={definition}
            height={300}
            ariaLabel="Monthly comparison of animal admissions and releases"
            className="h-full w-full"
          />
        </div>
      </CardContent>
    </Card>
  );
}
