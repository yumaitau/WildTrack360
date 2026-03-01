"use client";

import { useState } from "react";
import { AlertTriangle, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { AnimalReminder } from "@/lib/types";

interface AnimalReminderAlertProps {
  reminders: AnimalReminder[];
  animalName: string;
}

export function AnimalReminderAlert({ reminders, animalName }: AnimalReminderAlertProps) {
  const [open, setOpen] = useState(reminders.length > 0);

  if (reminders.length === 0) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        // Prevent closing via click-outside or escape — must use the button
        if (!value) return;
      }}
    >
      <DialogContent
        className="sm:max-w-lg border-destructive"
        hideClose
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Alert for {animalName}
          </DialogTitle>
          <DialogDescription>
            {reminders.length === 1
              ? "There is an active reminder for this animal."
              : `There are ${reminders.length} active reminders for this animal.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-2 max-h-60 overflow-y-auto">
          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className="rounded-lg border border-destructive/30 bg-destructive/5 p-3"
            >
              <p className="font-medium text-sm whitespace-pre-wrap">{reminder.message}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {reminder.createdByName && (
                  <span>By {reminder.createdByName}</span>
                )}
                <span>
                  {new Date(reminder.createdAt).toLocaleString("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
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
                    })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            variant="destructive"
            onClick={() => {
              setOpen(false);
            }}
          >
            I understand, continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
