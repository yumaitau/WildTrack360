"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { format, parse } from "date-fns"
import { CalendarIcon, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Animal } from '@prisma/client';

type CreateAnimalData = {
  name: string;
  species: string;
  sex?: string | null;
  ageClass?: string | null;
  age?: string | null;
  dateOfBirth?: Date | null;
  status: 'ADMITTED' | 'IN_CARE' | 'READY_FOR_RELEASE' | 'RELEASED' | 'DECEASED' | 'TRANSFERRED';
  dateFound: Date;
  dateReleased: Date | null;
  outcomeDate: Date | null;
  outcome: string | null;
  photo: string | null;
  notes: string | null;
  rescueLocation: string | null;
  rescueCoordinates: { lat: number; lng: number } | null;
  carerId: string;
};
import { LocationPicker } from "@/components/location-picker"

const addAnimalSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  species: z.string().min(1, "Species is required."),
  sex: z.string().optional(),
  ageClass: z.string().optional(),
  age: z.string().optional(),
  dateOfBirth: z.date().optional().nullable(),
  dateFound: z.date({ required_error: "Date found is required." }),
  carer: z.string().optional().default("default-carer"),
  status: z.enum(["ADMITTED","IN_CARE","READY_FOR_RELEASE","RELEASED","DECEASED","TRANSFERRED"]),
  rescueLocation: z.string().optional().default("Unknown location"),
  rescueCoordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
})

type AddAnimalFormValues = z.infer<typeof addAnimalSchema>

interface AddAnimalDialogProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  onAnimalAdd: (animalData: CreateAnimalData) => Promise<void>
  animalToEdit?: Animal | null;
  species?: any[];
  carers?: any[];
}

export function AddAnimalDialog({
  isOpen,
  setIsOpen,
  onAnimalAdd,
  animalToEdit,
  species,
  carers
}: AddAnimalDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = React.useState(false)
  const [locationData, setLocationData] = React.useState<{
    lat: number;
    lng: number;
    address: string;
  }>({
    lat: -35.2809,
    lng: 149.1300,
    address: 'Canberra ACT, Australia'
  });
  
  const isEditMode = !!animalToEdit;

  const form = useForm<AddAnimalFormValues>({
    resolver: zodResolver(addAnimalSchema),
    defaultValues: isEditMode && animalToEdit ? {
      name: animalToEdit.name,
      species: animalToEdit.species || 'Other',
      sex: animalToEdit.sex || undefined,
      ageClass: animalToEdit.ageClass || undefined,
      age: animalToEdit.age || undefined,
      dateOfBirth: animalToEdit.dateOfBirth ? new Date(animalToEdit.dateOfBirth) : undefined,
      carer: animalToEdit.carerId || 'default-carer',
      status: animalToEdit.status,
      dateFound: new Date(animalToEdit.dateFound),
      rescueLocation: animalToEdit.rescueLocation || 'Canberra ACT, Australia',
      rescueCoordinates: (animalToEdit.rescueCoordinates as { lat: number; lng: number }) || { lat: -35.2809, lng: 149.1300 }
    } : {
      name: "",
      species: "",
      sex: undefined,
      ageClass: undefined,
      age: undefined,
      dateOfBirth: undefined,
      carer: "",
      status: "IN_CARE",
      dateFound: new Date(),
      rescueLocation: "Canberra ACT, Australia",
      rescueCoordinates: { lat: -35.2809, lng: 149.1300 }
    }
  })
  
  React.useEffect(() => {
    if (isOpen) {
      if (animalToEdit) {
          // Ensure we have valid values for all fields
          const carerValue = animalToEdit.carerId || (carers && carers.length > 0 ? carers[0].value : 'default-carer');
          const speciesValue = animalToEdit.species || (species && species.length > 0 ? species[0].value : 'Other');
          
          form.reset({
              name: animalToEdit.name,
              species: speciesValue,
              sex: animalToEdit.sex || undefined,
              ageClass: animalToEdit.ageClass || undefined,
              age: animalToEdit.age || undefined,
              dateOfBirth: animalToEdit.dateOfBirth ? new Date(animalToEdit.dateOfBirth) : undefined,
              carer: carerValue,
              status: animalToEdit.status,
              dateFound: new Date(animalToEdit.dateFound),
              rescueLocation: animalToEdit.rescueLocation || 'Canberra ACT, Australia',
              rescueCoordinates: (animalToEdit.rescueCoordinates as { lat: number; lng: number }) || { lat: -35.2809, lng: 149.1300 }
          });
          const coords = animalToEdit.rescueCoordinates as { lat?: number; lng?: number } | null;
          setLocationData({
            lat: coords?.lat ?? -35.2809,
            lng: coords?.lng ?? 149.1300,
            address: animalToEdit.rescueLocation || 'Canberra ACT, Australia'
          });
      } else {
          const defaultCarer = carers && carers.length > 0 ? carers[0].value : '';
          const defaultSpecies = species && species.length > 0 ? species[0].value : '';
          
          form.reset({
              name: "",
              species: defaultSpecies,
              sex: undefined,
              ageClass: undefined,
              age: undefined,
              dateOfBirth: undefined,
              carer: defaultCarer,
              status: "IN_CARE",
              dateFound: new Date(),
              rescueLocation: "Canberra ACT, Australia",
              rescueCoordinates: { lat: -35.2809, lng: 149.1300 }
          });
          setLocationData({
            lat: -35.2809,
            lng: 149.1300,
            address: 'Canberra ACT, Australia'
          });
      }
    }
  }, [animalToEdit, isOpen, form, species, carers]);


  async function onSubmit(data: AddAnimalFormValues) {
    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 200));

    const payload: CreateAnimalData = {
      name: data.name,
      species: data.species,
      sex: data.sex || null,
      ageClass: data.ageClass || null,
      age: data.age || null,
      dateOfBirth: data.dateOfBirth || null,
      status: data.status,
      dateFound: data.dateFound,
      dateReleased: null,
      outcomeDate: null,
      outcome: null,
      photo: null,
      notes: null,
      rescueLocation: locationData.address,
      rescueCoordinates: { lat: locationData.lat, lng: locationData.lng },
      carerId: data.carer || 'default-carer',
    };

    await onAnimalAdd(payload)

    toast({
      title: isEditMode ? "Animal Updated" : "Animal Added",
      description: `${data.name} the ${data.species} has been ${isEditMode ? 'updated' : 'added'}.`,
    })

    setIsLoading(false)
    setIsOpen(false)
  }

  const statusOptions: ("ADMITTED"|"IN_CARE"|"READY_FOR_RELEASE"|"RELEASED"|"DECEASED"|"TRANSFERRED")[] = [
    "ADMITTED","IN_CARE","READY_FOR_RELEASE","RELEASED","DECEASED","TRANSFERRED"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Animal' : 'Add New Animal'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the details for this animal.' : "Enter the details for the new animal. Click save when you're done."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Kylie" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="species"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Species</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a species" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {species && species.length > 0 ? (
                        species.map(s => (
                          <SelectItem key={s.value || s} value={s.value || s}>
                            {s.label || s.value || s}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="Other">Other</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Sex Field */}
            <FormField
              control={form.control}
              name="sex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sex</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sex" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Age Class Field */}
            <FormField
              control={form.control}
              name="ageClass"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Age Class</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select age class" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Neonate">Neonate</SelectItem>
                      <SelectItem value="Juvenile">Juvenile</SelectItem>
                      <SelectItem value="Adult">Adult</SelectItem>
                      <SelectItem value="Geriatric">Geriatric</SelectItem>
                      <SelectItem value="Unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Age Field */}
            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Age (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 6 months, 2 years" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Date of Birth Field */}
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date of Birth (optional)</FormLabel>
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
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
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
              name="carer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Carer</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a carer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {carers && carers.length > 0 ? (
                        carers.map(c => (
                          <SelectItem key={c.value || 'default'} value={c.value || 'default'}>
                            {c.label || c.value || 'Default Carer'}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="default">Default Carer</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dateFound"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date Found</FormLabel>
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
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
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
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                   <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <LocationPicker
              onLocationChange={setLocationData}
              initialLocation={isEditMode ? (() => {
                const rc = animalToEdit?.rescueCoordinates as { lat?: number; lng?: number } | null;
                return {
                  lat: rc?.lat ?? -35.2809,
                  lng: rc?.lng ?? 149.1300,
                  address: animalToEdit?.rescueLocation || 'Canberra ACT, Australia'
                }
              })() : undefined}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? 'Save Changes' : 'Save Animal'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
