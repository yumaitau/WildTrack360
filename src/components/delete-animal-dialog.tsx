"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";

interface DeleteAnimalDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  animalName: string;
  onConfirm: () => Promise<void>;
}

export function DeleteAnimalDialog({
  isOpen,
  setIsOpen,
  animalName,
  onConfirm,
}: DeleteAnimalDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      setIsOpen(false);
    } catch (error) {
      console.error("Error deleting animal:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Animal Record
          </DialogTitle>
          <DialogDescription className="pt-3">
            <div className="space-y-3">
              <p className="font-semibold text-foreground">
                Are you sure you want to delete {animalName}?
              </p>
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm text-destructive font-medium">
                  Warning: This action cannot be reversed!
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  All associated records, photos, and data for this animal will be permanently deleted.
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                This will remove:
              </p>
              <ul className="text-sm text-muted-foreground ml-4 space-y-1">
                <li>• Animal profile and basic information</li>
                <li>• All care records and medical history</li>
                <li>• All photos and documents</li>
                <li>• Release checklists and compliance data</li>
                <li>• Incident reports involving this animal</li>
              </ul>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>Delete {animalName}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}