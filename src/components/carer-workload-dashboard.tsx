// src/components/carer-workload-dashboard.tsx
"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Animal } from "@prisma/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, AlertTriangle, Users } from "lucide-react";

interface CarerWorkloadDashboardProps {
  animals: Animal[];
  carerMap?: Record<string, string>;
}

function daysInCare(dateFound: Date | string): number {
  return Math.floor(
    (Date.now() - new Date(dateFound).getTime()) / 86_400_000
  );
}

function workloadLevel(count: number) {
  if (count <= 3) return { label: "Light", color: "bg-green-100 text-green-800 border-green-300" };
  if (count <= 6) return { label: "Moderate", color: "bg-amber-100 text-amber-800 border-amber-300" };
  return { label: "Heavy", color: "bg-red-100 text-red-800 border-red-300" };
}

export default function CarerWorkloadDashboard({
  animals,
  carerMap = {},
}: CarerWorkloadDashboardProps) {
  const [expandedCarers, setExpandedCarers] = useState<Set<string>>(new Set());

  const inCareAnimals = useMemo(
    () => animals.filter((a) => a.status === "IN_CARE"),
    [animals]
  );

  const carerData = useMemo(() => {
    const grouped: Record<string, Animal[]> = {};
    const unassigned: Animal[] = [];

    for (const animal of inCareAnimals) {
      if (animal.carerId) {
        if (!grouped[animal.carerId]) grouped[animal.carerId] = [];
        grouped[animal.carerId].push(animal);
      } else {
        unassigned.push(animal);
      }
    }

    const carers = Object.entries(grouped)
      .map(([carerId, carerAnimals]) => {
        // Species breakdown
        const speciesCounts: Record<string, number> = {};
        let longestDays = 0;

        for (const a of carerAnimals) {
          speciesCounts[a.species] = (speciesCounts[a.species] || 0) + 1;
          const days = daysInCare(a.dateFound);
          if (days > longestDays) longestDays = days;
        }

        return {
          carerId,
          name: carerMap[carerId] || carerId,
          animals: carerAnimals.sort(
            (a, b) => daysInCare(b.dateFound) - daysInCare(a.dateFound)
          ),
          count: carerAnimals.length,
          speciesCounts,
          longestDays,
        };
      })
      .sort((a, b) => b.count - a.count);

    return { carers, unassigned };
  }, [inCareAnimals, carerMap]);

  const totalCarers = carerData.carers.length;
  const totalInCare = inCareAnimals.length;
  const avgPerCarer = totalCarers > 0 ? (totalInCare / totalCarers).toFixed(1) : "0";

  const toggleExpand = (carerId: string) => {
    setExpandedCarers((prev) => {
      const next = new Set(prev);
      if (next.has(carerId)) next.delete(carerId);
      else next.add(carerId);
      return next;
    });
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Carer Workload
        </CardTitle>
        <CardDescription>
          Detailed breakdown of animals in care per carer
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Bar */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2 rounded-md border px-3 py-2">
            <span className="text-muted-foreground">Active Carers</span>
            <span className="font-semibold">{totalCarers}</span>
          </div>
          <div className="flex items-center gap-2 rounded-md border px-3 py-2">
            <span className="text-muted-foreground">Animals in Care</span>
            <span className="font-semibold">{totalInCare}</span>
          </div>
          <div className="flex items-center gap-2 rounded-md border px-3 py-2">
            <span className="text-muted-foreground">Avg per Carer</span>
            <span className="font-semibold">{avgPerCarer}</span>
          </div>
        </div>

        {/* Carer Cards */}
        {carerData.carers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No carers currently have animals in care.
          </div>
        ) : (
          <div className="space-y-3">
            {carerData.carers.map((carer) => {
              const wl = workloadLevel(carer.count);
              const isExpanded = expandedCarers.has(carer.carerId);

              return (
                <div
                  key={carer.carerId}
                  className="rounded-lg border"
                >
                  {/* Carer header row */}
                  <button
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
                    onClick={() => toggleExpand(carer.carerId)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold truncate">
                          {carer.name}
                        </span>
                        <Badge variant="secondary">{carer.count} animal{carer.count !== 1 ? "s" : ""}</Badge>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${wl.color}`}>
                          {wl.label}
                        </span>
                      </div>

                      {/* Species badges */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {Object.entries(carer.speciesCounts).map(
                          ([species, count]) => (
                            <Badge
                              key={species}
                              variant="outline"
                              className="text-xs"
                            >
                              {species} &times;{count}
                            </Badge>
                          )
                        )}
                      </div>

                      {/* Longest in care */}
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Longest in care: {carer.longestDays} day{carer.longestDays !== 1 ? "s" : ""}
                      </p>
                    </div>

                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </button>

                  {/* Expandable detail table */}
                  {isExpanded && (
                    <div className="border-t px-4 pb-4">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm mt-3">
                          <thead>
                            <tr className="text-left text-muted-foreground border-b">
                              <th className="pb-2 pr-4 font-medium">Name</th>
                              <th className="pb-2 pr-4 font-medium">Species</th>
                              <th className="pb-2 pr-4 font-medium">Status</th>
                              <th className="pb-2 pr-4 font-medium">Date Found</th>
                              <th className="pb-2 font-medium text-right">Days in Care</th>
                            </tr>
                          </thead>
                          <tbody>
                            {carer.animals.map((animal) => (
                              <tr key={animal.id} className="border-b last:border-0">
                                <td className="py-2 pr-4">
                                  <Link
                                    href={`/animals/${animal.id}`}
                                    className="text-primary hover:underline font-medium"
                                  >
                                    {animal.name}
                                  </Link>
                                </td>
                                <td className="py-2 pr-4">{animal.species}</td>
                                <td className="py-2 pr-4">
                                  <Badge variant="outline" className="text-xs">
                                    {animal.status.replace(/_/g, " ")}
                                  </Badge>
                                </td>
                                <td className="py-2 pr-4">
                                  {new Date(animal.dateFound).toLocaleDateString()}
                                </td>
                                <td className="py-2 text-right font-mono">
                                  {daysInCare(animal.dateFound)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Unassigned Animals */}
        {carerData.unassigned.length > 0 && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="font-semibold text-orange-800">
                Unassigned Animals ({carerData.unassigned.length})
              </span>
            </div>
            <p className="text-sm text-orange-700 mb-3">
              These IN_CARE animals have no carer assigned.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {carerData.unassigned.map((animal) => (
                <div
                  key={animal.id}
                  className="flex items-center justify-between bg-white rounded-md border p-2"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{animal.name}</div>
                    <div className="text-xs text-muted-foreground">{animal.species}</div>
                  </div>
                  <Link href={`/animals/${animal.id}`}>
                    <Button variant="outline" size="sm" className="ml-2 text-xs">
                      Assign
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
