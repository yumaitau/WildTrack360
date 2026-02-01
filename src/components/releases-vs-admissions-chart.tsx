"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Animal } from '@prisma/client';
import { useMemo } from 'react';

interface ReleasesVsAdmissionsChartProps {
  animals: Animal[];
}

export default function ReleasesVsAdmissionsChart({ animals }: ReleasesVsAdmissionsChartProps) {
  const chartData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const monthlyData = months.map((month, index) => {
      const monthStart = new Date(currentYear, index, 1);
      const monthEnd = new Date(currentYear, index + 1, 0);

      const admissions = animals.filter(animal => {
        const foundDate = new Date(animal.dateFound);
        return foundDate >= monthStart && foundDate <= monthEnd;
      }).length;

      const releases = animals.filter(animal => {
        if (animal.status !== 'RELEASED') return false;
        if (!animal.outcomeDate) return false;
        const releaseDate = new Date(animal.outcomeDate);
        return releaseDate >= monthStart && releaseDate <= monthEnd;
      }).length;

      return { month, admissions, releases };
    });

    const totalAdmissions = monthlyData.reduce((sum, month) => sum + month.admissions, 0);
    const totalReleases = monthlyData.reduce((sum, month) => sum + month.releases, 0);
    return monthlyData;
  }, [animals]);

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
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
            <Tooltip content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                    <p className="font-semibold text-foreground">{label}</p>
                    {payload.map((entry: any, index: number) => (
                      <p key={index} className="text-sm" style={{ color: entry.color }}>
                        {entry.name}: {entry.value}
                      </p>
                    ))}
                  </div>
                );
              }
              return null;
            }} />
            <Legend />
            <Bar dataKey="admissions" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Admissions" />
            <Bar dataKey="releases" fill="#10b981" radius={[4, 4, 0, 0]} name="Releases" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
} 