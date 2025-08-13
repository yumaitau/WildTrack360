// src/components/species-distribution-chart.tsx
"use client"

import * as React from "react"
import { Pie, PieChart, Cell } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { Animal } from "@prisma/client"

interface SpeciesDistributionChartProps {
  animals: Animal[];
}

const CHART_COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "#f59e0b", // amber-500
    "#10b981", // emerald-500
    "#3b82f6", // blue-500
];

export default function SpeciesDistributionChart({ animals }: SpeciesDistributionChartProps) {
  const chartData = React.useMemo(() => {
    const speciesCount = animals.reduce((acc, animal) => {
      acc[animal.species] = (acc[animal.species] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    return Object.entries(speciesCount).map(([species, count], index) => ({
      name: species,
      value: count,
      fill: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [animals]);
  
  const chartConfig = React.useMemo(() => {
      const config: ChartConfig = {};
      chartData.forEach((item) => {
          config[item.name] = {
              label: item.name,
              color: item.fill,
          }
      });
      return config;
  }, [chartData]);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Species Distribution</CardTitle>
        <CardDescription>Breakdown of animals by species</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
         {chartData.length > 0 ? (
            <ChartContainer
                config={chartConfig}
                className="mx-auto aspect-square max-h-[300px]"
            >
            <PieChart>
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    strokeWidth={5}
                >
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                     ))}
                </Pie>
                 <ChartLegend content={<ChartLegendContent nameKey="name" />} />
            </PieChart>
            </ChartContainer>
         ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
                No data to display.
            </div>
         )}
      </CardContent>
    </Card>
  )
}
