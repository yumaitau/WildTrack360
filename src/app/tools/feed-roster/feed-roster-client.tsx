"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, PlusCircle, RefreshCw, Utensils } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { FeedRosterItem } from "@/lib/feed-roster";

export type { FeedRosterItem };

type SortMode = "overdue" | "due";

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

function formatHours(value: number | null) {
  if (value === null) return "No feed recorded";
  const abs = Math.abs(value);
  if (abs < 1) return `${Math.round(abs * 60)}m`;
  return `${abs.toFixed(abs < 10 ? 1 : 0)}h`;
}

function localDateTimeValue() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

async function readErrorMessage(response: Response) {
  const body = await response.text();
  if (!body) return response.statusText || "No response body returned";
  try {
    const parsed = JSON.parse(body) as { error?: string; message?: string };
    return parsed.error || parsed.message || body;
  } catch {
    return body;
  }
}

function statusBadge(item: FeedRosterItem) {
  if (!item.lastFeedingAt) return <Badge variant="destructive">No feed recorded</Badge>;
  if (item.isOverdue) return <Badge variant="destructive">Overdue by {formatHours(item.hoursOverdue)}</Badge>;
  return <Badge variant="outline">Due in {formatHours(item.hoursOverdue)}</Badge>;
}

export default function FeedRosterClient({ initialItems }: { initialItems: FeedRosterItem[] }) {
  const [sortMode, setSortMode] = useState<SortMode>("overdue");
  const [selectedItem, setSelectedItem] = useState<FeedRosterItem | null>(null);
  const [fedAt, setFedAt] = useState(localDateTimeValue());
  const [foodType, setFoodType] = useState("");
  const [foodAmount, setFoodAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const sortedItems = useMemo(() => {
    return [...initialItems].sort((a, b) => {
      if (sortMode === "overdue") return b.hoursOverdue - a.hoursOverdue;
      return new Date(a.nextDueAt).getTime() - new Date(b.nextDueAt).getTime();
    });
  }, [initialItems, sortMode]);

  const overdueCount = initialItems.filter((item) => item.isOverdue).length;

  function openQuickAdd(item: FeedRosterItem) {
    setSelectedItem(item);
    setFedAt(localDateTimeValue());
    setFoodType("");
    setFoodAmount("");
    setNotes("");
  }

  async function submitFeedingRecord() {
    if (!selectedItem) return;
    setIsSaving(true);
    const description = ["Fed", foodAmount.trim(), foodType.trim()].filter(Boolean).join(" ");
    try {
      const response = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          animalId: selectedItem.id,
          type: "FEEDING",
          datetime: new Date(fedAt).toISOString(),
          description: description || "Feeding recorded",
          notes: notes.trim() || description || "Feeding recorded",
        }),
      });
      if (!response.ok) {
        const message = await readErrorMessage(response);
        if (response.status === 403) {
          throw new Error(`Forbidden: ${message}`);
        }
        throw new Error(`Failed to save feeding record (${response.status}): ${message}`);
      }
      toast({ title: "Feeding recorded", description: `${selectedItem.name} has a new feeding entry.` });
      setSelectedItem(null);
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to record feeding",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{initialItems.length}</div>
            <p className="text-sm text-muted-foreground">Animals in roster</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{overdueCount}</div>
            <p className="text-sm text-muted-foreground">Overdue or unrecorded</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{initialItems.length - overdueCount}</div>
            <p className="text-sm text-muted-foreground">Currently on schedule</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5" />
              Daily Schedule
            </CardTitle>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overdue">Most overdue</SelectItem>
                <SelectItem value="due">Next feed due</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => router.refresh()} aria-label="Refresh roster">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Animal</TableHead>
                  <TableHead>Last feed</TableHead>
                  <TableHead>Time since</TableHead>
                  <TableHead>Next due</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedItems.map((item) => (
                  <TableRow key={item.id} className={item.isOverdue ? "bg-red-50" : undefined}>
                    <TableCell>
                      <Link href={`/animals/${item.id}`} className="font-medium hover:underline">
                        {item.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {item.species} {item.age || item.ageClass ? `- ${[item.age, item.ageClass].filter(Boolean).join(", ")}` : ""}
                      </div>
                      <div className="text-xs text-muted-foreground">{item.carerName}</div>
                    </TableCell>
                    <TableCell>{formatDateTime(item.lastFeedingAt)}</TableCell>
                    <TableCell>{formatHours(item.hoursSinceLastFeed)}</TableCell>
                    <TableCell>
                      <div>{formatDateTime(item.nextDueAt)}</div>
                      <div className="mt-1">{statusBadge(item)}</div>
                    </TableCell>
                    <TableCell className="max-w-64 truncate">{item.lastFeedingNotes || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => openQuickAdd(item)}>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Log Feed
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 md:hidden">
            {sortedItems.map((item) => (
              <Card key={item.id} className={item.isOverdue ? "border-red-200 bg-red-50" : ""}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/animals/${item.id}`} className="font-semibold hover:underline">
                        {item.name}
                      </Link>
                      <div className="text-sm text-muted-foreground">{item.species}</div>
                      {(item.age || item.ageClass) && (
                        <div className="text-sm text-muted-foreground">{[item.age, item.ageClass].filter(Boolean).join(", ")}</div>
                      )}
                    </div>
                    {statusBadge(item)}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground">Last feed</div>
                      <div>{formatDateTime(item.lastFeedingAt)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Due</div>
                      <div>{formatDateTime(item.nextDueAt)}</div>
                    </div>
                  </div>
                  {item.lastFeedingNotes && <p className="text-sm">{item.lastFeedingNotes}</p>}
                  <Button size="sm" className="w-full" onClick={() => openQuickAdd(item)}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Log Feed
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {sortedItems.length === 0 && (
            <div className="py-10 text-center text-muted-foreground">
              <Clock className="h-10 w-10 mx-auto mb-3" />
              No in-care animals are visible for your role.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log feeding record</DialogTitle>
            <DialogDescription>{selectedItem ? `Record a feed for ${selectedItem.name}.` : ""}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="fedAt">Fed at</Label>
              <Input id="fedAt" type="datetime-local" value={fedAt} onChange={(event) => setFedAt(event.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="foodType">Food type</Label>
                <Input id="foodType" value={foodType} onChange={(event) => setFoodType(event.target.value)} placeholder="Formula, browse, insects" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="foodAmount">Amount</Label>
                <Input id="foodAmount" value={foodAmount} onChange={(event) => setFoodAmount(event.target.value)} placeholder="20ml, 15g" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Appetite, behaviour, leftovers" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedItem(null)}>
              Cancel
            </Button>
            <Button onClick={submitFeedingRecord} disabled={isSaving || !fedAt}>
              {isSaving ? "Saving..." : "Save feed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
