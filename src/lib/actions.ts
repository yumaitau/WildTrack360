"use server";

import { generateImageDescription } from "@/ai/flows/generate-image-description";
import { z } from "zod";

const imageSchema = z.object({
  photoDataUri: z.string().refine(val => val.startsWith('data:image/'), {
    message: "Must be a valid data URI for an image",
  }),
});

export async function getImageDescriptionAction(prevState: any, formData: FormData) {
  const photoDataUri = formData.get("photoDataUri") as string;
  const validatedFields = imageSchema.safeParse({ photoDataUri });

  if (!validatedFields.success) {
    return {
      message: "Invalid image data.",
      description: "",
    };
  }

  try {
    const result = await generateImageDescription({ photoDataUri });
    return {
      message: "success",
      description: result.description,
    };
  } catch (error) {
    console.error(error);
    return {
      message: "Failed to generate description.",
      description: "",
    };
  }
}
