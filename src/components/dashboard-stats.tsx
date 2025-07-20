// src/components/dashboard-stats.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Animal } from "@/lib/types";
import { Users, CheckCircle, ArrowRightCircle } from "lucide-react";
import { subDays } from "date-fns";

interface DashboardStatsProps {
  animals: Animal[];
}

export default function DashboardStats({ animals }: DashboardStatsProps) {
  const inCareCount = animals.filter(a => a.status === 'In Care').length;
  const releasedCount = animals.filter(a => a.status === 'Released').length;

  const sevenDaysAgo = subDays(new Date(), 7);
  const newlyAdmittedCount = animals.filter(a => new Date(a.dateFound) >= sevenDaysAgo).length;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">In Care</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{inCareCount}</div>
          <p className="text-xs text-muted-foreground">Animals currently in care</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Released</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{releasedCount}</div>
          <p className="text-xs text-muted-foreground">Total animals released</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Newly Admitted</CardTitle>
          <ArrowRightCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">+{newlyAdmittedCount}</div>
          <p className="text-xs text-muted-foreground">in the last 7 days</p>
        </CardContent>
      </Card>
    </div>
  );
}
