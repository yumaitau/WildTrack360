"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, PlusCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { type MeasurementField, MEASUREMENT_LABELS, getRelevantFields } from "@/lib/growth-utils";

const formSchema = z.object({
  date: z.date({ required_error: "Date is required." }),
  weightGrams: z.string().optional(),
  headLengthMm: z.string().optional(),
  earLengthMm: z.string().optional(),
  armLengthMm: z.string().optional(),
  legLengthMm: z.string().optional(),
  footLengthMm: z.string().optional(),
  tailLengthMm: z.string().optional(),
  bodyLengthMm: z.string().optional(),
  wingLengthMm: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface GrowthMeasurementFormProps {
  animalId: string;
  speciesSubtype?: string | null;
  onMeasurementAdd: () => void;
}

export function GrowthMeasurementForm({
  animalId,
  speciesSubtype,
  onMeasurementAdd,
}: GrowthMeasurementFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const relevantFields = getRelevantFields(speciesSubtype);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      weightGrams: "",
      headLengthMm: "",
      earLengthMm: "",
      armLengthMm: "",
      legLengthMm: "",
      footLengthMm: "",
      tailLengthMm: "",
      bodyLengthMm: "",
      wingLengthMm: "",
      notes: "",
    },
  });

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        date: data.date.toISOString(),
        notes: data.notes || null,
      };

      // Convert string fields to numbers
      for (const field of relevantFields) {
        const val = data[field as keyof FormValues] as string;
        if (val && val.trim() !== "") {
          body[field] = parseFloat(val);
        }
      }

      const res = await fetch(`/api/animals/${animalId}/growth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to save measurement");

      toast({
        title: "Measurement Added",
        description: "Growth measurement has been recorded.",
      });

      form.reset({
        date: new Date(),
        weightGrams: "",
        headLengthMm: "",
        earLengthMm: "",
        armLengthMm: "",
        legLengthMm: "",
        footLengthMm: "",
        tailLengthMm: "",
        bodyLengthMm: "",
        wingLengthMm: "",
        notes: "",
      });

      onMeasurementAdd();
    } catch {
      toast({
        title: "Error",
        description: "Failed to save growth measurement.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Growth Measurement</CardTitle>
        <CardDescription>
          Record weight in grams, body measurements in millimetres.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-[240px] pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? format(field.value, "PPP")
                            : "Pick a date"}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {relevantFields.map((field) => (
                <FormField
                  key={field}
                  control={form.control}
                  name={field as keyof FormValues}
                  render={({ field: formField }) => (
                    <FormItem>
                      <FormLabel>{MEASUREMENT_LABELS[field as MeasurementField]}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder="0"
                          {...formField}
                          value={formField.value as string}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional notes about this measurement..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                <PlusCircle className="mr-2 h-4 w-4" />
                {isSubmitting ? "Saving..." : "Add Measurement"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
