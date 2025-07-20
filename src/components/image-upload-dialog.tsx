"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useFormState, useFormStatus } from "react-dom";
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
import { getImageDescriptionAction } from "@/lib/actions";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Photo } from "@/lib/types";

interface ImageUploadDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onPhotoAdd: (photo: Photo) => void;
  animalId: string;
}

const initialState = {
  message: "",
  description: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Save Photo
    </Button>
  );
}

export default function ImageUploadDialog({
  isOpen,
  setIsOpen,
  onPhotoAdd,
  animalId,
}: ImageUploadDialogProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUri = reader.result as string;
      setPreview(dataUri);
      setIsGenerating(true);
      setDescription("Generating description...");

      const formData = new FormData();
      formData.append("photoDataUri", dataUri);

      try {
        const result = await getImageDescriptionAction(initialState, formData);
        if (result.message === "success") {
          setDescription(result.description);
        } else {
          setDescription(`Error: ${result.message}`);
        }
      } catch (error) {
        setDescription("An unexpected error occurred.");
      } finally {
        setIsGenerating(false);
      }
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
            date: new Date().toISOString(),
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
            Upload an image and the AI will automatically generate a description for you.
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
            <div className="relative">
              <Textarea
                placeholder="A brief description of the photo..."
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                required
              />
              {isGenerating && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}
            </div>
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
