// src/components/recent-admissions-chart.tsx
"use client";

import { useMemo } from "react";
import { barY, defineChart } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { chartColor } from "@/components/ui/chart";
import { Animal } from "@prisma/client";
import { subDays, format } from "date-fns";
import { useRouter } from "next/navigation";

interface RecentAdmissionsChartProps {
  animals: Animal[];
  /** Trend window in weeks. Defaults to ~30 days when not provided. */
  weeks?: number;
}

interface AdmissionDay {
  date: string;
  fullDate: string;
  admissions: number;
}

export default function RecentAdmissionsChart({
  animals,
  weeks,
}: RecentAdmissionsChartProps) {
  const router = useRouter();
  const days = weeks && weeks > 0 ? weeks * 7 : 30;

  const data = useMemo(() => {
    const windowStart = subDays(new Date(), days);
    const recentAnimals = animals.filter(
      (a) => new Date(a.dateFound) >= windowStart
    );

    const rows: AdmissionDay[] = Array.from({ length: days })
      .map((_, i) => {
        const date = subDays(new Date(), i);
        return {
          date: format(date, "MMM d"),
          fullDate: format(date, "yyyy-MM-dd"),
          admissions: 0,
        };
      })
      .reverse();

    recentAnimals.forEach((animal) => {
      const dateStr = format(new Date(animal.dateFound), "MMM d");
      const dayData = rows.find((d) => d.date === dateStr);
      if (dayData) {
        dayData.admissions += 1;
      }
    });

    return rows;
  }, [animals, days]);

  const definition = useMemo(
    () =>
      defineChart({
        marks: [
          barY(data, {
            x: "date",
            y: "admissions",
            fill: chartColor(0),
            radius: 4,
            inset: 1,
            key: "fullDate",
          }),
        ],
        x: {
          scale: () =>
            scaleBand<string>()
              .domain(data.map((d) => d.date))
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
            ticks: {
              format: (value) => String(Math.round(Number(value))),
            },
          },
        },
        tooltip,
      }),
    [data]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Admissions</CardTitle>
        <CardDescription>
          Admissions in the last {days} days. Click a bar to filter results.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <Chart
            definition={definition}
            height={300}
            ariaLabel={`Admissions in the last ${days} days`}
            className="h-full w-full cursor-pointer"
            onSelect={(point) => {
              if (!point) return;
              const fullDate = (point.datum as AdmissionDay).fullDate;
              if (fullDate) {
                router.push(`/?admissionDate=${fullDate}`);
              }
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
