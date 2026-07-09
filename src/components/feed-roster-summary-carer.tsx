"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AlertTriangle, Clock, Utensils } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { FeedRosterItem } from "@/lib/feed-roster";

const DUE_SOON_HOURS = 2;

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

function statusBadge(item: FeedRosterItem) {
  if (!item.lastFeedingAt) return <Badge variant="destructive">No feed recorded</Badge>;
  if (item.isOverdue) return <Badge variant="destructive">Overdue {formatHours(item.hoursOverdue)}</Badge>;
  if (item.hoursOverdue > -DUE_SOON_HOURS) return <Badge variant="secondary">Due {formatHours(item.hoursOverdue)}</Badge>;
  return <Badge variant="outline">In {formatHours(item.hoursOverdue)}</Badge>;
}

export function FeedRosterSummaryCarer({ items, isOrgWide }: { items: FeedRosterItem[]; isOrgWide: boolean }) {
  const sorted = useMemo(
    () => [...items].sort((a, b) => b.hoursOverdue - a.hoursOverdue),
    [items],
  );
  const overdue = items.filter((i) => i.isOverdue);
  const dueSoon = items.filter((i) => !i.isOverdue && i.hoursOverdue > -DUE_SOON_HOURS);
  const onTrack = items.length - overdue.length - dueSoon.length;
  const top = sorted.slice(0, 5);

  if (items.length === 0) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Utensils className="h-4 w-4" />
            Feeding Schedule
          </CardTitle>
          <CardDescription>{isOrgWide ? "No animals currently in care." : "No animals currently assigned to you for feeding."}</CardDescription>
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
            {isOrgWide ? "Feeding Schedule (Organisation)" : "My Feeding Schedule"}
          </CardTitle>
          <CardDescription>
            {overdue.length > 0
              ? `${overdue.length} feed${overdue.length === 1 ? "" : "s"} overdue or unrecorded.`
              : dueSoon.length > 0
                ? `${dueSoon.length} feed${dueSoon.length === 1 ? "" : "s"} due in the next ${DUE_SOON_HOURS}h.`
                : "All animals on schedule."}
          </CardDescription>
        </div>
        <Link href="/tools/feed-roster">
          <Button size="sm" variant="outline">Open feed roster</Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
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

        <div className="divide-y rounded-md border">
          {top.map((item) => (
            <div key={item.id} className={`flex items-center justify-between gap-3 p-3 ${item.isOverdue ? "bg-red-50" : ""}`}>
              <div className="min-w-0 flex-1">
                <Link href={`/animals/${item.id}`} className="font-medium hover:underline">
                  {item.name}
                </Link>
                <div className="text-xs text-muted-foreground truncate">
                  {item.species}
                  {isOrgWide ? ` - ${item.carerName}` : ""}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <Clock className="h-3 w-3" />
                  Last fed: {formatDateTime(item.lastFeedingAt)}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {statusBadge(item)}
                <div className="text-xs text-muted-foreground">Due {formatDateTime(item.nextDueAt)}</div>
              </div>
            </div>
          ))}
        </div>

        {items.length > top.length && (
          <div className="text-center">
            <Link href="/tools/feed-roster">
              <Button variant="link" size="sm">
                View all {items.length} animals
              </Button>
            </Link>
          </div>
        )}

        {overdue.length > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>
              {overdue.length} animal{overdue.length === 1 ? " is" : "s are"} past due. Log feeds or escalate to your coordinator.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
