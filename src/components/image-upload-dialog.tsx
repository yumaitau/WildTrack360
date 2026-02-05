"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Photo } from "@prisma/client";

interface ImageUploadDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onPhotoAdd: (photo: { id: string; animalId: string; url: string; date: Date; description: string }) => void;
  animalId: string;
}

export default function ImageUploadDialog({
  isOpen,
  setIsOpen,
  onPhotoAdd,
  animalId,
}: ImageUploadDialogProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUri = reader.result as string;
      setPreview(dataUri);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // This is where you would normally handle the form submission to your backend
    // For this demo, we'll just add the photo to the client-side state
    if (preview && description) {
        onPhotoAdd({
            id: `photo-${Date.now()}`,
            animalId,
            url: preview,
            date: new Date(),
            description: description
        });
        toast({
            title: "Photo Added",
            description: "The new photo has been added to the gallery.",
        });
        setIsOpen(false);
        setPreview(null);
        setDescription("");
        formRef.current?.reset();
    } else {
        toast({
            title: "Incomplete Information",
            description: "Please select a photo and add a description.",
            variant: "destructive",
        })
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Photo</DialogTitle>
          <DialogDescription>
            Upload an image and add a description.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="picture">Picture</Label>
            <Input id="picture" type="file" accept="image/*" onChange={handleFileChange} required />
          </div>

          {preview && (
            <div className="relative w-full aspect-video rounded-md overflow-hidden border">
              <Image src={preview} alt="Image preview" fill className="object-cover" data-ai-hint="animal" />
            </div>
          )}

          <div className="grid w-full gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              placeholder="A brief description of the photo..."
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
            />
          </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button type="submit">Save Photo</Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
