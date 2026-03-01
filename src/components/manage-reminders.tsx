"use client";

import { useState } from "react";
import { Bell, Plus, Trash2, AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { AnimalReminder } from "@/lib/types";

interface ManageRemindersProps {
  animalId: string;
  animalName: string;
  initialReminders: AnimalReminder[];
  currentUserId: string;
  isAdmin?: boolean;
}

export function ManageReminders({
  animalId,
  animalName,
  initialReminders,
  currentUserId,
  isAdmin = false,
}: ManageRemindersProps) {
  const [reminders, setReminders] = useState<AnimalReminder[]>(initialReminders);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!message.trim()) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/animals/${animalId}/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          expiresAt: expiresAt || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to create reminder" }));
        throw new Error(err.error);
      }

      const reminder = await res.json();
      setReminders((prev) => [reminder, ...prev]);
      setMessage("");
      setExpiresAt("");
      setIsAddOpen(false);
      toast({ title: "Reminder Created", description: `Reminder added to ${animalName}.` });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to create reminder",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (reminderId: string) => {
    setDeletingId(reminderId);
    try {
      const res = await fetch(`/api/animals/${animalId}/reminders/${reminderId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to delete reminder" }));
        throw new Error(err.error);
      }

      setReminders((prev) => prev.filter((r) => r.id !== reminderId));
      toast({ title: "Reminder Deleted", description: "The reminder has been removed." });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to delete reminder",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-destructive" />
            Reminders
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </CardHeader>
        <CardContent>
          {reminders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active reminders.</p>
          ) : (
            <div className="space-y-3">
              {reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="rounded-lg border border-destructive/30 bg-destructive/5 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium whitespace-pre-wrap flex-1">
                      {reminder.message}
                    </p>
                    {(reminder.createdByUserId === currentUserId || isAdmin) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => handleDelete(reminder.id)}
                        disabled={deletingId === reminder.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {reminder.createdByName && <span>By {reminder.createdByName}</span>}
                    <span>
                      {new Date(reminder.createdAt).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    {reminder.expiresAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Expires{" "}
                        {new Date(reminder.expiresAt).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Reminder Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Reminder for {animalName}</DialogTitle>
            <DialogDescription>
              This alert will pop up every time someone views this animal&apos;s profile.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reminder-message">Message *</Label>
              <Textarea
                id="reminder-message"
                placeholder='e.g., "THIS ANIMAL CANNOT BE FED TODAY"'
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reminder-expiry">Expiry Date (optional)</Label>
              <Input
                id="reminder-expiry"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>

            {!expiresAt && message.trim() && (
              <Alert variant="default" className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-sm">
                  Without an expiry date, this alert will show every time someone views this
                  animal until manually deleted.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isSubmitting || !message.trim()}
            >
              {isSubmitting ? "Creating..." : "Create Reminder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
