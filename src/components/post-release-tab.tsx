"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Binoculars, Plus, Trash2, MapPin, Camera, X } from "lucide-react";
import type { PostReleaseMonitoring } from "@/lib/types";
import { getPhotoUrl } from "@/lib/photo-url";
import { LocationPicker } from "@/components/location-picker";

interface PostReleaseTabProps {
  animalId: string;
  animalName: string;
  initialRecords: PostReleaseMonitoring[];
  canManagePostRelease: boolean;
  onCountChange?: (count: number) => void;
}

const CONDITION_OPTIONS = [
  { value: "Healthy", label: "Healthy" },
  { value: "Injured", label: "Injured" },
  { value: "Distressed", label: "Distressed" },
  { value: "Unknown", label: "Unknown" },
];

const CONDITION_COLORS: Record<string, string> = {
  Healthy: "bg-green-100 text-green-800 border-green-300",
  Injured: "bg-red-100 text-red-800 border-red-300",
  Distressed: "bg-amber-100 text-amber-800 border-amber-300",
  Unknown: "bg-gray-100 text-gray-800 border-gray-300",
};

export function PostReleaseTab({
  animalId,
  animalName,
  initialRecords,
  canManagePostRelease,
  onCountChange,
}: PostReleaseTabProps) {
  const [records, setRecords] = useState<PostReleaseMonitoring[]>(initialRecords);

  // Sync count to parent via effect to avoid setState-during-render
  useEffect(() => {
    onCountChange?.(records.length);
  }, [records.length, onCountChange]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    time: "",
    location: "",
    latitude: "",
    longitude: "",
    animalCondition: "",
    notes: "",
  });

  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().split("T")[0],
      time: "",
      location: "",
      latitude: "",
      longitude: "",
      animalCondition: "",
      notes: "",
    });
    setPhotoFiles([]);
    setPhotoPreviews([]);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setPhotoFiles((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input so the same file can be selected again
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (): Promise<string[]> => {
    const keys: string[] = [];
    for (const file of photoFiles) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload/image", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Photo upload failed");
      const { url } = await res.json();
      keys.push(url);
    }
    return keys;
  };

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      let photoKeys: string[] = [];
      if (photoFiles.length > 0) {
        setIsUploadingPhotos(true);
        photoKeys = await uploadPhotos();
        setIsUploadingPhotos(false);
      }

      const coordinates =
        form.latitude && form.longitude
          ? { lat: parseFloat(form.latitude), lng: parseFloat(form.longitude) }
          : null;

      const res = await fetch("/api/post-release-monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          animalId,
          date: form.date,
          time: form.time || null,
          location: form.location || null,
          coordinates,
          animalCondition: form.animalCondition || null,
          notes: form.notes,
          photos: photoKeys.length > 0 ? photoKeys : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create record");
      }
      const data = await res.json();
      setRecords((prev) => [data, ...prev]);
      setIsCreateOpen(false);
      resetForm();
      toast({
        title: "Sighting Recorded",
        description: `Post-release observation for ${animalName} has been saved.`,
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to create record",
      });
    } finally {
      setIsSubmitting(false);
      setIsUploadingPhotos(false);
    }
  };

  const handleDelete = async (recordId: string) => {
    try {
      const res = await fetch(`/api/post-release-monitoring/${recordId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete record");
      setRecords((prev) => prev.filter((r) => r.id !== recordId));
      toast({ title: "Deleted", description: "Post-release record deleted." });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to delete",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Post-Release Monitoring</h3>
        {canManagePostRelease && (
          <Button onClick={() => setIsCreateOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Record Sighting
          </Button>
        )}
      </div>

      {records.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Binoculars className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No post-release sightings recorded for this animal.</p>
            {canManagePostRelease && (
              <p className="text-sm mt-1">Click &quot;Record Sighting&quot; to add the first observation.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {records.map((record) => {
            const coords = record.coordinates as { lat?: number; lng?: number } | null;
            const photos = (record.photos as string[] | null) || [];
            return (
              <Card key={record.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Binoculars className="h-4 w-4" />
                      {new Date(record.date).toLocaleDateString("en-AU")}
                      {record.time && (
                        <span className="text-sm font-normal text-muted-foreground">
                          at {record.time}
                        </span>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {record.animalCondition && (
                        <Badge
                          variant="outline"
                          className={CONDITION_COLORS[record.animalCondition] || ""}
                        >
                          {record.animalCondition}
                        </Badge>
                      )}
                      {canManagePostRelease && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(record.id)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {record.location && (
                    <div className="flex items-start gap-1">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
                      <span>{record.location}</span>
                    </div>
                  )}

                  {coords && typeof coords.lat === "number" && typeof coords.lng === "number" && (
                    <div className="text-xs text-muted-foreground">
                      GPS: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                    </div>
                  )}

                  <div>
                    <span className="font-medium text-muted-foreground">Notes:</span>{" "}
                    {record.notes}
                  </div>

                  {photos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {photos.map((photoKey, i) => (
                        <div key={i} className="relative w-20 h-20 rounded-md overflow-hidden border">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getPhotoUrl(photoKey) || ""}
                            alt={`Sighting photo ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Sighting Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Post-Release Sighting</DialogTitle>
            <DialogDescription>
              Record an observation of {animalName} after release. Include location and condition details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div>
                <Label>Time</Label>
                <Input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Sighting Location</Label>
              <LocationPicker
                onLocationChange={(loc) => {
                  setForm((p) => ({
                    ...p,
                    location: loc.address,
                    latitude: loc.lat.toString(),
                    longitude: loc.lng.toString(),
                  }));
                }}
                initialLocation={
                  form.latitude && form.longitude
                    ? {
                        lat: parseFloat(form.latitude),
                        lng: parseFloat(form.longitude),
                        address: form.location,
                      }
                    : undefined
                }
              />
            </div>

            <div>
              <Label>Animal Condition</Label>
              <Select
                value={form.animalCondition}
                onValueChange={(v) => setForm((p) => ({ ...p, animalCondition: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Observation Notes *</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Describe the sighting — animal behaviour, appearance, activity..."
                rows={4}
              />
            </div>

            {/* Photo Upload */}
            <div>
              <Label>Photos</Label>
              <div className="mt-1 space-y-2">
                {photoPreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {photoPreviews.map((preview, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-md overflow-hidden border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={preview}
                          alt={`Preview ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => photoInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4 mr-1" /> Add Photos
                </Button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isSubmitting || !form.date || !form.notes}
            >
              {isUploadingPhotos
                ? "Uploading photos..."
                : isSubmitting
                ? "Saving..."
                : "Record Sighting"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
