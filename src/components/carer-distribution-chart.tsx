// src/components/carer-distribution-chart.tsx
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
import { Animal } from "@/lib/types"

interface CarerDistributionChartProps {
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

export default function CarerDistributionChart({ animals }: CarerDistributionChartProps) {
  const chartData = React.useMemo(() => {
    const carerCount = animals
      .filter(a => a.status === 'In Care')
      .reduce((acc, animal) => {
          acc[animal.carer] = (acc[animal.carer] || 0) + 1;
          return acc;
        }, {} as { [key: string]: number });

    return Object.entries(carerCount).map(([carer, count], index) => ({
      name: carer,
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
        <CardTitle>Carer Workload</CardTitle>
        <CardDescription>Animals currently in care per carer</CardDescription>
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
