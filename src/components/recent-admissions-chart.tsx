// src/components/recent-admissions-chart.tsx
"use client";

import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart"
import { Animal } from "@/lib/types"
import { subDays, format } from 'date-fns';
import { useRouter } from "next/navigation";

interface RecentAdmissionsChartProps {
  animals: Animal[];
}

const chartConfig = {
  admissions: {
    label: "Admissions",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export default function RecentAdmissionsChart({ animals }: RecentAdmissionsChartProps) {
  const router = useRouter();
  const thirtyDaysAgo = subDays(new Date(), 30);
  
  const recentAnimals = animals.filter(a => new Date(a.dateFound) >= thirtyDaysAgo);

  const data = Array.from({ length: 30 }).map((_, i) => {
    const date = subDays(new Date(), i);
    return {
      date: format(date, 'MMM d'),
      fullDate: format(date, 'yyyy-MM-dd'),
      admissions: 0,
    };
  }).reverse();
  
  recentAnimals.forEach(animal => {
    const dateStr = format(new Date(animal.dateFound), 'MMM d');
    const dayData = data.find(d => d.date === dateStr);
    if (dayData) {
      dayData.admissions += 1;
    }
  });

  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const { fullDate } = data.activePayload[0].payload;
      router.push(`/?admissionDate=${fullDate}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Admissions</CardTitle>
        <CardDescription>Admissions in the last 30 days. Click a bar to filter results.</CardDescription>
      </CardHeader>
      <CardContent>
         <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart 
            accessibilityLayer 
            data={data} 
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            onClick={handleBarClick}
          >
             <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              fontSize={12}
              interval="preserveStartEnd"
            />
            <YAxis allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="admissions" fill="var(--color-admissions)" radius={4} style={{ cursor: 'pointer' }} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
