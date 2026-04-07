"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  History,
  Stethoscope,
  Scale,
  Soup,
  Eye,
  MapPin,
  ClipboardList,
  Camera,
  ArrowRightLeft,
  Shield,
  Binoculars,
  AlertTriangle,
  Bell,
  Phone,
  HelpCircle,
  Rocket,
  Filter,
} from "lucide-react";
import type {
  Record as CareRecord,
  Photo,
  AnimalTransfer,
  PostReleaseMonitoring,
  PermanentCareApplication,
  IncidentReport,
  AnimalReminder,
  ReleaseChecklist,
} from "@/lib/types";

// A unified timeline event that all record types are mapped into
export interface TimelineEvent {
  id: string;
  date: Date;
  category: TimelineCategory;
  title: string;
  description?: string;
  notes?: string;
  icon: React.ReactNode;
  color: string; // tailwind border/bg color class
  metadata?: { [key: string]: string | undefined };
  link?: { href: string; label: string };
}

type TimelineCategory =
  | "care_record"
  | "photo"
  | "transfer"
  | "post_release"
  | "permanent_care"
  | "incident"
  | "reminder"
  | "release"
  | "call_log";

const CATEGORY_LABELS: { [K in TimelineCategory]: string } = {
  care_record: "Care Record",
  photo: "Photo",
  transfer: "Transfer",
  post_release: "Post-Release",
  permanent_care: "Permanent Care",
  incident: "Incident",
  reminder: "Reminder",
  release: "Release",
  call_log: "Call Log",
};

const CATEGORY_COLORS: { [K in TimelineCategory]: { border: string; bg: string; text: string } } = {
  care_record: { border: "border-blue-500", bg: "bg-blue-500", text: "text-blue-700" },
  photo: { border: "border-violet-500", bg: "bg-violet-500", text: "text-violet-700" },
  transfer: { border: "border-amber-500", bg: "bg-amber-500", text: "text-amber-700" },
  post_release: { border: "border-teal-500", bg: "bg-teal-500", text: "text-teal-700" },
  permanent_care: { border: "border-indigo-500", bg: "bg-indigo-500", text: "text-indigo-700" },
  incident: { border: "border-red-500", bg: "bg-red-500", text: "text-red-700" },
  reminder: { border: "border-yellow-500", bg: "bg-yellow-500", text: "text-yellow-700" },
  release: { border: "border-green-500", bg: "bg-green-500", text: "text-green-700" },
  call_log: { border: "border-cyan-500", bg: "bg-cyan-500", text: "text-cyan-700" },
};

const CALL_LOG_ID_PATTERN = /^\[CallLog:([^\]]+)\]\s*/;

function getRecordIcon(type: string) {
  const props = { className: "h-4 w-4" };
  switch (type) {
    case "MEDICAL":
      return <Stethoscope {...props} />;
    case "WEIGHT":
      return <Scale {...props} />;
    case "FEEDING":
      return <Soup {...props} />;
    case "BEHAVIOR":
      return <Eye {...props} />;
    case "LOCATION":
      return <MapPin {...props} />;
    case "RELEASE":
      return <Rocket {...props} />;
    case "OTHER":
      return <ClipboardList {...props} />;
    default:
      return <HelpCircle {...props} />;
  }
}

interface CombinedTimelineProps {
  records: CareRecord[];
  photos: Photo[];
  transfers: AnimalTransfer[];
  postReleaseRecords: PostReleaseMonitoring[];
  permanentCareApplications: PermanentCareApplication[];
  incidents: IncidentReport[];
  reminders: AnimalReminder[];
  releaseChecklist?: ReleaseChecklist | null;
  userMap?: { [clerkUserId: string]: string };
}

function mapRecords(records: CareRecord[], userMap: { [key: string]: string }): TimelineEvent[] {
  return records.map((r) => {
    // Check if this is a call log record
    const callLogMatch = r.description?.match(CALL_LOG_ID_PATTERN);
    const isCallLog = !!callLogMatch;
    const callLogId = callLogMatch?.[1];
    const cleanDescription = callLogMatch
      ? r.description?.replace(CALL_LOG_ID_PATTERN, "")
      : r.description;

    return {
      id: r.id,
      date: new Date(r.date),
      category: isCallLog ? "call_log" as TimelineCategory : "care_record" as TimelineCategory,
      title: isCallLog ? "Call Log" : r.type,
      description: cleanDescription || undefined,
      notes: r.notes || undefined,
      icon: isCallLog ? <Phone className="h-4 w-4" /> : getRecordIcon(r.type),
      color: isCallLog ? "cyan" : "blue",
      metadata: {
        "Recorded by": userMap[r.clerkUserId] || undefined,
        Location: typeof r.location === "string" ? r.location : undefined,
      },
      link: isCallLog && callLogId
        ? { href: `/compliance/call-logs/${callLogId}`, label: "View Call Log" }
        : undefined,
    };
  });
}

function mapPhotos(photos: Photo[]): TimelineEvent[] {
  return photos.map((p) => ({
    id: p.id,
    date: new Date(p.date || p.createdAt),
    category: "photo" as TimelineCategory,
    title: "Photo Added",
    description: p.description || undefined,
    icon: <Camera className="h-4 w-4" />,
    color: "violet",
  }));
}

function mapTransfers(transfers: AnimalTransfer[]): TimelineEvent[] {
  return transfers.map((t) => ({
    id: t.id,
    date: new Date(t.transferDate),
    category: "transfer" as TimelineCategory,
    title: `Transfer — ${(t.transferType || "").replace(/_/g, " ")}`,
    description: t.receivingEntity
      ? `To: ${t.receivingEntity}`
      : undefined,
    notes: t.transferNotes || undefined,
    icon: <ArrowRightLeft className="h-4 w-4" />,
    color: "amber",
    metadata: {
      "Transfer type": (t.transferType || "").replace(/_/g, " "),
    },
  }));
}

function mapPostRelease(records: PostReleaseMonitoring[]): TimelineEvent[] {
  return records.map((pr) => ({
    id: pr.id,
    date: new Date(pr.date),
    category: "post_release" as TimelineCategory,
    title: "Post-Release Observation",
    description: pr.notes || undefined,
    icon: <Binoculars className="h-4 w-4" />,
    color: "teal",
    metadata: {
      Condition: (pr as any).animalCondition || undefined,
      Location: (pr as any).location || undefined,
    },
  }));
}

function mapPermanentCare(apps: PermanentCareApplication[]): TimelineEvent[] {
  return apps.map((a) => ({
    id: a.id,
    date: new Date(a.createdAt),
    category: "permanent_care" as TimelineCategory,
    title: `Permanent Care — ${a.status}`,
    description: (a as any).nonReleasableReasons || undefined,
    icon: <Shield className="h-4 w-4" />,
    color: "indigo",
    metadata: {
      Status: a.status,
      Category: (a as any).category || undefined,
    },
  }));
}

function mapIncidents(incidents: IncidentReport[]): TimelineEvent[] {
  return incidents.map((i) => ({
    id: i.id,
    date: new Date(i.date),
    category: "incident" as TimelineCategory,
    title: `Incident — ${i.type}`,
    description: i.description,
    notes: i.notes || undefined,
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "red",
    metadata: {
      Severity: i.severity,
      Resolved: i.resolved ? "Yes" : "No",
      Location: i.location || undefined,
    },
  }));
}

function mapReminders(reminders: AnimalReminder[]): TimelineEvent[] {
  return reminders.map((r) => ({
    id: r.id,
    date: new Date(r.createdAt),
    category: "reminder" as TimelineCategory,
    title: "Reminder Created",
    description: r.message,
    icon: <Bell className="h-4 w-4" />,
    color: "yellow",
    metadata: {
      "Created by": r.createdByName || undefined,
      Expires: r.expiresAt ? new Date(r.expiresAt).toLocaleDateString("en-AU") : undefined,
    },
  }));
}

function mapReleaseChecklist(rc: ReleaseChecklist | null | undefined): TimelineEvent[] {
  if (!rc) return [];
  return [
    {
      id: rc.id,
      date: new Date(rc.releaseDate),
      category: "release" as TimelineCategory,
      title: "Release Checklist Completed",
      description: rc.notes || undefined,
      icon: <Rocket className="h-4 w-4" />,
      color: "green",
      metadata: {
        Location: rc.releaseLocation || undefined,
        "Release type": (rc as any).releaseType || undefined,
      },
      link: { href: `/compliance/release-checklist/${rc.id}`, label: "View Checklist" },
    },
  ];
}

export default function CombinedTimeline({
  records,
  photos,
  transfers,
  postReleaseRecords,
  permanentCareApplications,
  incidents,
  reminders,
  releaseChecklist,
  userMap = {},
}: CombinedTimelineProps) {
  const [activeFilters, setActiveFilters] = useState<Set<TimelineCategory>>(new Set());

  const allEvents = useMemo(() => {
    const events: TimelineEvent[] = [
      ...mapRecords(records, userMap),
      ...mapPhotos(photos),
      ...mapTransfers(transfers),
      ...mapPostRelease(postReleaseRecords),
      ...mapPermanentCare(permanentCareApplications),
      ...mapIncidents(incidents),
      ...mapReminders(reminders),
      ...mapReleaseChecklist(releaseChecklist),
    ];
    events.sort((a, b) => b.date.getTime() - a.date.getTime());
    return events;
  }, [records, photos, transfers, postReleaseRecords, permanentCareApplications, incidents, reminders, releaseChecklist, userMap]);

  // Get categories that actually have events
  const availableCategories = useMemo(() => {
    const cats = new Set<TimelineCategory>();
    allEvents.forEach((e) => cats.add(e.category));
    return cats;
  }, [allEvents]);

  const filteredEvents = useMemo(() => {
    if (activeFilters.size === 0) return allEvents;
    return allEvents.filter((e) => activeFilters.has(e.category));
  }, [allEvents, activeFilters]);

  const toggleFilter = (cat: TimelineCategory) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  // Count events by category for the filter badges
  const categoryCounts = useMemo(() => {
    const counts: { [K in TimelineCategory]?: number } = {};
    allEvents.forEach((e) => {
      counts[e.category] = (counts[e.category] || 0) + 1;
    });
    return counts;
  }, [allEvents]);

  return (
    <Card className="shadow-lg h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-6 w-6 text-primary" />
          Full Timeline
          <Badge variant="secondary" className="ml-2">{allEvents.length} events</Badge>
        </CardTitle>
        {availableCategories.size > 1 && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            <Filter className="h-4 w-4 text-muted-foreground mt-0.5" />
            {Array.from(availableCategories).map((cat) => {
              const isActive = activeFilters.has(cat);
              const colors = CATEGORY_COLORS[cat];
              return (
                <button
                  key={cat}
                  onClick={() => toggleFilter(cat)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors border ${
                    isActive || activeFilters.size === 0
                      ? `${colors.border} ${colors.text} bg-opacity-10`
                      : "border-muted text-muted-foreground opacity-40"
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                  <span className="text-[10px] opacity-70">({categoryCounts[cat] || 0})</span>
                </button>
              );
            })}
            {activeFilters.size > 0 && (
              <button
                onClick={() => setActiveFilters(new Set())}
                className="text-xs text-muted-foreground underline ml-1"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {filteredEvents.length > 0 ? (
          <ScrollArea className="h-[600px] pr-4">
            <div className="relative pl-6">
              <div className="absolute left-0 top-0 h-full w-0.5 bg-border rounded"></div>
              {filteredEvents.map((event) => {
                const colors = CATEGORY_COLORS[event.category];
                return (
                  <div key={`${event.category}-${event.id}`} className="relative mb-6">
                    <div
                      className={`absolute -left-[31px] top-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-background border-2 ${colors.border}`}
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${colors.bg} text-white`}
                      >
                        {event.icon}
                      </div>
                    </div>
                    <div className="ml-8">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">{event.title}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${colors.border} ${colors.text}`}
                        >
                          {CATEGORY_LABELS[event.category]}
                        </Badge>
                      </div>
                      <time className="text-sm text-muted-foreground">
                        {event.date.toLocaleString("en-AU", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>

                      {event.description && (
                        <p className="mt-1.5 text-sm text-foreground">{event.description}</p>
                      )}

                      {event.notes && (
                        <div className="mt-1.5 text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
                          <span className="font-medium">Notes:</span> {event.notes}
                        </div>
                      )}

                      {event.metadata && (
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-xs text-muted-foreground">
                          {Object.entries(event.metadata)
                            .filter((entry): entry is [string, string] => !!entry[1])
                            .map(([key, value]) => (
                              <span key={key}>
                                <span className="font-medium">{key}:</span> {value}
                              </span>
                            ))}
                        </div>
                      )}

                      {event.link && (
                        <Link href={event.link.href}>
                          <Button variant="outline" size="sm" className="mt-2">
                            {event.link.label}
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No timeline events found for this animal.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
