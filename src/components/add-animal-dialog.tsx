"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { format, parse } from "date-fns"
import { CalendarIcon, Loader2, Rocket } from "lucide-react"

import { useRouter } from "next/navigation"
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
  // Detailed rescue address fields
  rescueAddress?: string | null;
  rescueSuburb?: string | null;
  rescuePostcode?: string | null;
  // Release location fields
  releaseLocation?: string | null;
  releaseCoordinates?: { lat: number; lng: number } | null;
  releaseAddress?: string | null;
  releaseSuburb?: string | null;
  releasePostcode?: string | null;
  releaseNotes?: string | null;
  carerId: string | null;
  // NSW-specific fields
  encounterType?: string | null;
  initialWeightGrams?: number | null;
  animalCondition?: string | null;
  pouchCondition?: string | null;
  fate?: string | null;
};
import { LocationPicker } from "@/components/location-picker"
import { getCurrentJurisdiction } from '@/lib/config'
import { NSW_ENCOUNTER_TYPES, NSW_FATE_OPTIONS, NSW_POUCH_CONDITIONS, NSW_ANIMAL_CONDITIONS } from '@/lib/compliance-rules'

const addAnimalSchema = z.object({
  name: z.string().min(1, "Name is required").min(2, "Name must be at least 2 characters"),
  species: z.string().min(1, "Species is required"),
  sex: z.string().optional(),
  ageClass: z.string().optional(),
  age: z.string().optional(),
  dateOfBirth: z.date().optional().nullable(),
  dateFound: z.date({ required_error: "Date found is required" }),
  carer: z.string().optional(),
  status: z.enum(["ADMITTED","IN_CARE","READY_FOR_RELEASE","RELEASED","DECEASED","TRANSFERRED"], {
    required_error: "Status is required"
  }),
  rescueLocation: z.string().optional(),
  rescueCoordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
  // Detailed address fields
  rescueAddress: z.string().optional(),
  rescueSuburb: z.string().optional(),
  rescuePostcode: z.string().optional(),
  // NSW-specific fields
  encounterType: z.string().optional(),
  initialWeightGrams: z.number().min(0).optional(),
  animalCondition: z.string().optional(),
  pouchCondition: z.string().optional(),
  fate: z.string().optional(),
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
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)
  const [locationData, setLocationData] = React.useState<{
    lat: number;
    lng: number;
    address: string;
    streetAddress?: string;
    suburb?: string;
    postcode?: string;
    state?: string;
  }>({
    lat: -35.2809,
    lng: 149.1300,
    address: 'Canberra ACT, Australia'
  });
  
  const jurisdiction = getCurrentJurisdiction();
  const isNSW = jurisdiction === 'NSW';
  
  const isEditMode = !!animalToEdit;
  
  // Track previous open state to detect when dialog is opened
  const prevIsOpenRef = React.useRef(isOpen);
  const prevAnimalToEditRef = React.useRef(animalToEdit);

  const form = useForm<AddAnimalFormValues>({
    resolver: zodResolver(addAnimalSchema),
    defaultValues: isEditMode && animalToEdit ? {
      name: animalToEdit.name,
      species: animalToEdit.species || 'Other',
      sex: animalToEdit.sex || undefined,
      ageClass: animalToEdit.ageClass || undefined,
      age: animalToEdit.age || undefined,
      dateOfBirth: animalToEdit.dateOfBirth ? new Date(animalToEdit.dateOfBirth) : undefined,
      carer: animalToEdit.carerId || '',
      status: animalToEdit.status,
      dateFound: new Date(animalToEdit.dateFound),
      rescueLocation: animalToEdit.rescueLocation || 'Canberra ACT, Australia',
      rescueCoordinates: (animalToEdit.rescueCoordinates as { lat: number; lng: number }) || { lat: -35.2809, lng: 149.1300 },
      rescueAddress: animalToEdit.rescueAddress || '',
      rescueSuburb: animalToEdit.rescueSuburb || '',
      rescuePostcode: animalToEdit.rescuePostcode || '',
      // NSW-specific fields
      encounterType: animalToEdit.encounterType || undefined,
      initialWeightGrams: animalToEdit.initialWeightGrams || undefined,
      animalCondition: animalToEdit.animalCondition || undefined,
      pouchCondition: animalToEdit.pouchCondition || undefined,
      fate: animalToEdit.fate || undefined
    } : {
      name: "",
      species: "",
      sex: undefined,
      ageClass: undefined,
      age: undefined,
      dateOfBirth: undefined,
      carer: "",
      status: "ADMITTED",
      dateFound: new Date(),
      rescueLocation: "Canberra ACT, Australia",
      rescueCoordinates: { lat: -35.2809, lng: 149.1300 },
      rescueAddress: "",
      rescueSuburb: "",
      rescuePostcode: "",
      // NSW-specific fields
      encounterType: undefined,
      initialWeightGrams: undefined,
      animalCondition: undefined,
      pouchCondition: undefined,
      fate: undefined
    }
  })

  const watchedStatus = form.watch('status')

  // Only reset form when dialog transitions from closed to open, or when animalToEdit changes
  React.useEffect(() => {
    // Check if dialog just opened (was closed, now open)
    const justOpened = !prevIsOpenRef.current && isOpen;
    // Check if animalToEdit changed while dialog is open
    const animalChanged = isOpen && prevAnimalToEditRef.current !== animalToEdit;
    
    // Update refs for next render
    prevIsOpenRef.current = isOpen;
    prevAnimalToEditRef.current = animalToEdit;
    
    // Only reset if dialog just opened or animal changed while open
    if (!justOpened && !animalChanged) return;
    
    if (animalToEdit) {
        // Ensure we have valid values for all fields
        const carerValue = animalToEdit.carerId || '';
        const speciesValue = animalToEdit.species || '';
        
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
            rescueCoordinates: (animalToEdit.rescueCoordinates as { lat: number; lng: number }) || { lat: -35.2809, lng: 149.1300 },
            rescueAddress: animalToEdit.rescueAddress || '',
            rescueSuburb: animalToEdit.rescueSuburb || '',
            rescuePostcode: animalToEdit.rescuePostcode || '',
            // NSW-specific fields
            encounterType: animalToEdit.encounterType || undefined,
            initialWeightGrams: animalToEdit.initialWeightGrams || undefined,
            animalCondition: animalToEdit.animalCondition || undefined,
            pouchCondition: animalToEdit.pouchCondition || undefined,
            fate: animalToEdit.fate || undefined
        });
        const coords = animalToEdit.rescueCoordinates as { lat?: number; lng?: number } | null;
        setLocationData({
          lat: coords?.lat ?? -35.2809,
          lng: coords?.lng ?? 149.1300,
          address: animalToEdit.rescueLocation || 'Canberra ACT, Australia'
        });
    } else {
        form.reset({
            name: "",
            species: "",
            sex: undefined,
            ageClass: undefined,
            age: undefined,
            dateOfBirth: undefined,
            carer: "",
            status: "ADMITTED",
            dateFound: new Date(),
            rescueLocation: "Canberra ACT, Australia",
            rescueCoordinates: { lat: -35.2809, lng: 149.1300 },
            rescueAddress: "",
            rescueSuburb: "",
            rescuePostcode: "",
            // NSW-specific fields
            encounterType: undefined,
            initialWeightGrams: undefined,
            animalCondition: undefined,
            pouchCondition: undefined,
            fate: undefined
        });
        setLocationData({
          lat: -35.2809,
          lng: 149.1300,
          address: 'Canberra ACT, Australia'
        });
    }
  }, [isOpen, animalToEdit, form]);

  // Auto-populate address fields when location changes
  React.useEffect(() => {
    if (locationData.streetAddress !== undefined || locationData.suburb !== undefined || locationData.postcode !== undefined) {
      // Only update if we have structured address data from the map
      if (locationData.streetAddress !== undefined) {
        form.setValue('rescueAddress', locationData.streetAddress);
      }
      if (locationData.suburb !== undefined) {
        form.setValue('rescueSuburb', locationData.suburb);
      }
      if (locationData.postcode !== undefined) {
        form.setValue('rescuePostcode', locationData.postcode);
      }
      form.setValue('rescueLocation', locationData.address);
      form.setValue('rescueCoordinates', { lat: locationData.lat, lng: locationData.lng });
    }
  }, [locationData, form]);


  async function onSubmit(data: AddAnimalFormValues) {
    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 200));

    // Check if status is RELEASED to handle release location data
    const isReleased = data.status === 'RELEASED';
    
    const payload: CreateAnimalData = {
      name: data.name,
      species: data.species,
      sex: data.sex || null,
      ageClass: data.ageClass || null,
      age: data.age || null,
      dateOfBirth: data.dateOfBirth || null,
      status: data.status,
      dateFound: data.dateFound,
      dateReleased: isReleased ? new Date() : null,
      outcomeDate: isReleased ? new Date() : null,
      outcome: isReleased ? 'Successfully released' : null,
      photo: null,
      notes: null,
      rescueLocation: data.rescueLocation || locationData.address || null,
      rescueCoordinates: data.rescueCoordinates || (locationData ? { lat: locationData.lat, lng: locationData.lng } : null),
      // Detailed address fields - these are now auto-populated from map selection
      rescueAddress: data.rescueAddress || null,
      rescueSuburb: data.rescueSuburb || null,
      rescuePostcode: data.rescuePostcode || null,
      carerId: data.carer || null,
      // NSW-specific fields
      encounterType: data.encounterType || null,
      initialWeightGrams: data.initialWeightGrams || null,
      animalCondition: data.animalCondition || null,
      pouchCondition: data.pouchCondition || null,
      fate: data.fate || null,
      // Release location fields when status is RELEASED - use same location data
      ...(isReleased && {
        releaseLocation: locationData.address || null,
        releaseCoordinates: locationData ? { lat: locationData.lat, lng: locationData.lng } : null,
        releaseAddress: locationData.streetAddress || null,
        releaseSuburb: locationData.suburb || null,
        releasePostcode: locationData.postcode || null,
        releaseNotes: 'Animal released'
      })
    };

    await onAnimalAdd(payload)

    toast({
      title: isEditMode ? "Animal Updated" : "Animal Added",
      description: `${data.name} the ${data.species} has been ${isEditMode ? 'updated' : 'added'}.`,
    })

    setIsLoading(false)
    setIsOpen(false)
  }

  const statusOptions = [
    { value: "ADMITTED", label: "Admitted" },
    { value: "IN_CARE", label: "In Care" },
    { value: "READY_FOR_RELEASE", label: "Ready for Release" },
    { value: "RELEASED", label: "Released" },
    { value: "DECEASED", label: "Deceased" },
    { value: "TRANSFERRED", label: "Transferred" }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
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
                  <Popover modal>
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
                  <Popover modal>
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
                      {statusOptions.map(s => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* NSW-specific fields */}
            {isNSW && (
              <>
                <FormField
                  control={form.control}
                  name="encounterType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Encounter Type (Required for NSW)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select encounter type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(NSW_ENCOUNTER_TYPES).map(([category, types]) => (
                            <div key={category}>
                              <div className="px-2 py-1 text-sm font-semibold text-muted-foreground">
                                {category}
                              </div>
                              {types.map(type => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="initialWeightGrams"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Weight (grams)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="e.g., 250" 
                          {...field}
                          value={field.value ?? ''}
                          onChange={e => {
                            const value = e.target.value;
                            field.onChange(value === '' ? undefined : Number(value));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="animalCondition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Animal Condition</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {NSW_ANIMAL_CONDITIONS.map(condition => (
                            <SelectItem key={condition} value={condition}>
                              {condition}
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
                  name="pouchCondition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pouch Condition (Marsupials only)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select pouch condition" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {NSW_POUCH_CONDITIONS.map(condition => (
                            <SelectItem key={condition} value={condition}>
                              {condition}
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
                  name="fate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fate/Outcome (NSW)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select fate/outcome" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {NSW_FATE_OPTIONS.map(fate => (
                            <SelectItem key={fate} value={fate}>
                              {fate}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            
            {/* Rescue Address Details */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Rescue Location Details</h4>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="rescueAddress"
                  render={({ field }) => (
                    <FormItem className="col-span-3">
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 123 Main Street" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rescueSuburb"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Suburb/Town</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Sydney" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rescuePostcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postcode</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 2000" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
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
            
            {/* Show release location fields when status is RELEASED */}
            {watchedStatus === 'RELEASED' && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-green-700">Release Location Details</h4>
                <p className="text-xs text-muted-foreground">
                  When marking an animal as released, the rescue location above will be used as the release location by default. 
                  You can adjust the map pin to set a different release location if needed.
                </p>
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">
                    Release location will be automatically captured from the map selection above.
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              {isEditMode && animalToEdit && (watchedStatus === 'IN_CARE' || watchedStatus === 'READY_FOR_RELEASE') && (
                <Button
                  type="button"
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                  disabled={isLoading}
                  onClick={() => {
                    form.handleSubmit(async (data) => {
                      await onSubmit(data);
                      router.push(`/compliance/release-checklist/new?animalId=${animalToEdit.id}`);
                    })();
                  }}
                >
                  <Rocket className="mr-2 h-4 w-4" />
                  Release Animal
                </Button>
              )}
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
