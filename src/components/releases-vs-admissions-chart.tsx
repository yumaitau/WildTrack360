"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Animal } from '@/lib/types';
import { useMemo } from 'react';

interface ReleasesVsAdmissionsChartProps {
  animals: Animal[];
}

export default function ReleasesVsAdmissionsChart({ animals }: ReleasesVsAdmissionsChartProps) {
  // Debug: Log the animals data to see what we're working with
  console.log('ReleasesVsAdmissionsChart - animals data:', {
    totalAnimals: animals.length,
    releasedAnimals: animals.filter(a => a.status === 'Released').length,
    animalsWithOutcomeDate: animals.filter(a => a.outcomeDate).length,
    releasedAnimalsWithDates: animals.filter(a => a.status === 'Released' && a.outcomeDate).map(a => ({
      name: a.name,
      outcomeDate: a.outcomeDate,
      status: a.status
    })),
    releasedWithoutOutcomeDate: animals.filter(a => a.status === 'Released' && !a.outcomeDate).map(a => ({
      name: a.name,
      outcomeDate: a.outcomeDate,
      status: a.status
    }))
  });

  const chartData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const monthlyData = months.map((month, index) => {
      const monthNumber = index + 1;
      const monthStart = new Date(currentYear, index, 1);
      const monthEnd = new Date(currentYear, index + 1, 0);

      // Count admissions (dateFound) for this month
      const admissions = animals.filter(animal => {
        const foundDate = new Date(animal.dateFound);
        return foundDate >= monthStart && foundDate <= monthEnd;
      }).length;

      // Count releases (status is Released) for this month
      // Use outcomeDate if available, otherwise use the last record date or current date
      const releases = animals.filter(animal => {
        if (animal.status !== 'Released') return false;
        
        let releaseDate: Date;
        if (animal.outcomeDate) {
          releaseDate = new Date(animal.outcomeDate);
        } else {
          // If no outcomeDate, we can't determine the release month, so skip
          return false;
        }
        
        return releaseDate >= monthStart && releaseDate <= monthEnd;
      }).length;

      return {
        month,
        admissions,
        releases,
      };
    });

    // Calculate totals for comparison with dashboard stats
    const totalAdmissions = monthlyData.reduce((sum, month) => sum + month.admissions, 0);
    const totalReleases = monthlyData.reduce((sum, month) => sum + month.releases, 0);
    
    console.log('ReleasesVsAdmissionsChart - chart data:', monthlyData);
    console.log('ReleasesVsAdmissionsChart - totals:', {
      totalAdmissions,
      totalReleases,
      totalReleasedAnimals: animals.filter(a => a.status === 'Released').length
    });
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
            <XAxis 
              dataKey="month" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              content={({ active, payload, label }) => {
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
              }}
            />
            <Legend />
            <Bar 
              dataKey="admissions" 
              fill="#3b82f6" 
              radius={[4, 4, 0, 0]}
              name="Admissions"
            />
            <Bar 
              dataKey="releases" 
              fill="#10b981" 
              radius={[4, 4, 0, 0]}
              name="Releases"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
} 