"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AlertTriangle, Utensils } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { FeedRosterItem } from "@/lib/feed-roster";

const DUE_SOON_HOURS = 2;
const UNASSIGNED_KEY = "__unassigned__";

function formatHours(value: number) {
  const abs = Math.abs(value);
  if (abs < 1) return `${Math.round(abs * 60)}m`;
  return `${abs.toFixed(abs < 10 ? 1 : 0)}h`;
}

function formatDateTime(value: string | null) {
  if (!value) return "Not recorded";
  return new Date(value).toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface CarerBucket {
  key: string;
  carerId: string | null;
  carerName: string;
  total: number;
  overdue: number;
  dueSoon: number;
  worstHours: number;
}

export function FeedRosterSummaryOrg({ items }: { items: FeedRosterItem[] }) {
  const overdue = items.filter((i) => i.isOverdue);
  const dueSoon = items.filter((i) => !i.isOverdue && i.hoursOverdue > -DUE_SOON_HOURS);
  const onTrack = items.length - overdue.length - dueSoon.length;

  const buckets = useMemo(() => {
    const map = new Map<string, CarerBucket>();
    for (const item of items) {
      const key = item.carerId ?? UNASSIGNED_KEY;
      const existing = map.get(key);
      if (existing) {
        existing.total += 1;
        if (item.isOverdue) existing.overdue += 1;
        else if (item.hoursOverdue > -DUE_SOON_HOURS) existing.dueSoon += 1;
        if (item.hoursOverdue > existing.worstHours) existing.worstHours = item.hoursOverdue;
      } else {
        map.set(key, {
          key,
          carerId: item.carerId,
          carerName: item.carerName,
          total: 1,
          overdue: item.isOverdue ? 1 : 0,
          dueSoon: !item.isOverdue && item.hoursOverdue > -DUE_SOON_HOURS ? 1 : 0,
          worstHours: item.hoursOverdue,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      if (b.overdue !== a.overdue) return b.overdue - a.overdue;
      if (b.dueSoon !== a.dueSoon) return b.dueSoon - a.dueSoon;
      return b.total - a.total;
    });
  }, [items]);

  const topOverdue = useMemo(
    () => [...items].filter((i) => i.isOverdue).sort((a, b) => b.hoursOverdue - a.hoursOverdue).slice(0, 5),
    [items],
  );

  if (items.length === 0) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Utensils className="h-4 w-4" />
            Feeding Roster Overview
          </CardTitle>
          <CardDescription>No animals currently in care.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={`mb-8 ${overdue.length > 0 ? "border-red-200" : ""}`}>
      <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Utensils className="h-4 w-4" />
            Feeding Roster Overview
          </CardTitle>
          <CardDescription>
            {overdue.length > 0
              ? `${overdue.length} of ${items.length} animals across the organisation are overdue or unrecorded.`
              : `All ${items.length} in-care animals are on schedule.`}
          </CardDescription>
        </div>
        <Link href="/tools/feed-roster">
          <Button size="sm" variant="outline">Open feed roster</Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-md border p-3">
            <div className="text-2xl font-bold">{items.length}</div>
            <div className="text-xs text-muted-foreground">In-care animals</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-2xl font-bold text-red-600">{overdue.length}</div>
            <div className="text-xs text-muted-foreground">Overdue</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-2xl font-bold text-amber-600">{dueSoon.length}</div>
            <div className="text-xs text-muted-foreground">Due soon</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-2xl font-bold text-emerald-600">{onTrack}</div>
            <div className="text-xs text-muted-foreground">On track</div>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Carer breakdown</h3>
            <span className="text-xs text-muted-foreground">{buckets.length} carer{buckets.length === 1 ? "" : "s"}</span>
          </div>
          <div className="divide-y rounded-md border">
            {buckets.map((bucket) => (
              <div key={bucket.key} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">
                    {bucket.carerId === null ? (
                      <span className="text-orange-700">Unassigned</span>
                    ) : (
                      bucket.carerName
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {bucket.total} animal{bucket.total === 1 ? "" : "s"} in care
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {bucket.overdue > 0 && (
                    <Badge variant="destructive">{bucket.overdue} overdue</Badge>
                  )}
                  {bucket.dueSoon > 0 && (
                    <Badge variant="secondary">{bucket.dueSoon} due soon</Badge>
                  )}
                  {bucket.overdue === 0 && bucket.dueSoon === 0 && (
                    <Badge variant="outline">On track</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {topOverdue.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold">Most overdue animals</h3>
            <div className="divide-y rounded-md border">
              {topOverdue.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 p-3 bg-red-50">
                  <div className="min-w-0 flex-1">
                    <Link href={`/animals/${item.id}`} className="font-medium hover:underline">
                      {item.name}
                    </Link>
                    <div className="text-xs text-muted-foreground truncate">
                      {item.species} - {item.carerName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Last fed: {formatDateTime(item.lastFeedingAt)}
                    </div>
                  </div>
                  <Badge variant="destructive">
                    {item.lastFeedingAt ? `Overdue ${formatHours(item.hoursOverdue)}` : "No feed recorded"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {overdue.length > topOverdue.length && (
          <div className="text-center">
            <Link href="/tools/feed-roster">
              <Button variant="link" size="sm">
                View all {overdue.length} overdue animals
              </Button>
            </Link>
          </div>
        )}

        {overdue.length > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>Follow up with carers above to confirm feeds were given but not logged, or to reassign animals.</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
