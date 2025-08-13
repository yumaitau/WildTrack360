
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, PlusCircle, Clock } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LocationPicker } from "@/components/location-picker";
import { recordTypes } from "@/lib/types";

const addRecordSchema = z.object({
  type: z.enum(recordTypes),
  date: z.date({ required_error: "Record date is required." }),
  time: z.string().min(1, "Record time is required."),
  notes: z.string().min(1, "Notes are required."),
  weight: z.string().optional(),
  height: z.string().optional(),
  medication: z.string().optional(),
  foodType: z.string().optional(),
  foodAmount: z.string().optional(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string(),
  }).optional(),
});

type AddRecordFormValues = z.infer<typeof addRecordSchema>;

interface AddRecordFormProps {
  animalId: string;
  onRecordAdd: (record: any) => Promise<void>;
}

export function AddRecordForm({ animalId, onRecordAdd }: AddRecordFormProps) {
  const { toast } = useToast();
  const [locationData, setLocationData] = React.useState<{
    lat: number;
    lng: number;
    address: string;
  }>({
    lat: -35.2809,
    lng: 149.1300,
    address: 'Canberra ACT, Australia'
  });
  
  const form = useForm<AddRecordFormValues>({
    resolver: zodResolver(addRecordSchema),
    defaultValues: {
      type: "General",
      date: new Date(),
      time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      notes: "",
    },
  });

  const recordType = form.watch("type");

  async function onSubmit(data: AddRecordFormValues) {
    const details: { [key: string]: string | number } = {};
    if (data.type === 'Growth') {
        if (data.weight) details.weight = data.weight;
        if (data.height) details.height = data.height;
    }
    if (data.type === 'Health Check' && data.medication) {
        details.medication = data.medication;
    }
    if (data.type === 'Feeding') {
        if (data.foodType) details.foodType = data.foodType;
        if (data.foodAmount) details.foodAmount = data.foodAmount;
    }

    // Create datetime string by combining date and time
    const dateStr = format(data.date, "yyyy-MM-dd");
    const datetimeStr = `${dateStr}T${data.time}:00`;

    // Map UI type to backend enum keys the API expects
    const typeMap: Record<string, string> = {
      'Health Check': 'MEDICAL',
      'Growth': 'WEIGHT',
      'Feeding': 'FEEDING',
      'Sighting': 'LOCATION',
      'Release': 'RELEASE',
      'General': 'OTHER',
    };

    const backendType = typeMap[data.type] || 'OTHER';

    const newRecord = {
      id: `rec-${Date.now()}`,
      animalId,
      type: backendType,
      date: dateStr,
      datetime: datetimeStr,
      notes: data.notes,
      details: Object.keys(details).length > 0 ? details : undefined,
      location: data.type === 'Release' ? locationData.address : undefined,
    };

    await onRecordAdd(newRecord);

    toast({
      title: "Record Added",
      description: `A new ${data.type} record has been added.`,
    });

    form.reset({
      type: "General",
      date: new Date(),
      time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      notes: "",
      weight: "",
      height: "",
      medication: "",
      foodType: "",
      foodAmount: "",
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Record</CardTitle>
        <CardDescription>Log a new care activity for this animal.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Record Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a record type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {recordTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
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
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {recordType === 'Growth' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Weight (e.g., 2.5kg)</FormLabel>
                        <FormControl>
                            <Input placeholder="Weight" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                <FormField
                    control={form.control}
                    name="height"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Height/Length (e.g., 50cm)</FormLabel>
                        <FormControl>
                            <Input placeholder="Height or Length" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
              </div>
            )}
            
            {recordType === 'Health Check' && (
                <FormField
                    control={form.control}
                    name="medication"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Medication Administered</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Mange Treatment, Pain Relief" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            )}

            {recordType === 'Feeding' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="foodType"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Type of Food</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Eucalyptus Leaves, Formula" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                <FormField
                    control={form.control}
                    name="foodAmount"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., 500g, 250ml" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
              </div>
            )}

            {recordType === 'Release' && (
              <LocationPicker
                onLocationChange={setLocationData}
                initialLocation={locationData}
              />
            )}


            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter detailed notes about the activity..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit">
                <PlusCircle className="mr-2" />
                Add Record
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
