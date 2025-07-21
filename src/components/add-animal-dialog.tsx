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
import { Animal, AnimalStatus } from "@/lib/types"

const addAnimalSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  species: z.string().min(1, "Species is required."),
  dateFound: z.date({
    required_error: "Date found is required.",
  }),
  carer: z.string().min(1, "Carer is required."),
  status: z.enum(["In Care", "Released", "Deceased", "Transferred"]),
})

type AddAnimalFormValues = z.infer<typeof addAnimalSchema>

interface AddAnimalDialogProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  onAnimalAdd: (animal: Animal) => void
  animalToEdit?: Animal | null;
  speciesOptions: string[];
  carerOptions: string[];
}

export function AddAnimalDialog({
  isOpen,
  setIsOpen,
  onAnimalAdd,
  animalToEdit,
  speciesOptions,
  carerOptions
}: AddAnimalDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = React.useState(false)
  
  const isEditMode = !!animalToEdit;

  const form = useForm<AddAnimalFormValues>({
    resolver: zodResolver(addAnimalSchema),
    defaultValues: isEditMode ? {
      ...animalToEdit,
      dateFound: parse(animalToEdit.dateFound, "yyyy-MM-dd", new Date())
    } : {
      name: "",
      species: "",
      carer: "",
      status: "In Care",
    },
  })
  
  React.useEffect(() => {
    if (isOpen) {
      if (animalToEdit) {
          form.reset({
              ...animalToEdit,
              dateFound: parse(animalToEdit.dateFound, "yyyy-MM-dd", new Date())
          });
      } else {
          form.reset({
              name: "",
              species: "",
              carer: "",
              status: "In Care",
              dateFound: new Date(),
          });
      }
    }
  }, [animalToEdit, isOpen, form]);


  async function onSubmit(data: AddAnimalFormValues) {
    setIsLoading(true)
    
    // In a real app, you'd save this to a database.
    // Here, we'll simulate an async action and then update the UI.
    await new Promise(resolve => setTimeout(resolve, 500));

    const newAnimal: Animal = {
      id: isEditMode ? animalToEdit.id : `${data.species.toLowerCase()}-${data.name.toLowerCase().replace(/\s/g, '-')}-${Date.now()}`,
      animalId: isEditMode ? animalToEdit.animalId : `AN-${Date.now()}`,
      name: data.name,
      species: data.species,
      dateFound: format(data.dateFound, "yyyy-MM-dd"),
      carer: data.carer,
      status: data.status,
      photo: isEditMode ? animalToEdit.photo : `https://placehold.co/600x400.png`,
      sex: isEditMode ? animalToEdit.sex : "Unknown",
      ageClass: isEditMode ? animalToEdit.ageClass : "Unknown",
      rescueLocation: isEditMode ? animalToEdit.rescueLocation : "Unknown",
      rescueDate: isEditMode ? animalToEdit.rescueDate : format(data.dateFound, "yyyy-MM-dd"),
      reasonForAdmission: isEditMode ? animalToEdit.reasonForAdmission : "Unknown",
      carerId: isEditMode ? animalToEdit.carerId : data.carer,
      notes: isEditMode ? animalToEdit.notes : "",
    };

    onAnimalAdd(newAnimal)
    
    toast({
      title: isEditMode ? "Animal Updated" : "Animal Added",
      description: `${data.name} the ${data.species} has been ${isEditMode ? 'updated' : 'added'}.`,
    })
    
    setIsLoading(false)
    setIsOpen(false)
  }

  const statusOptions: AnimalStatus[] = ["In Care", "Released", "Deceased", "Transferred"];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[480px]">
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
                      {speciesOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
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
                      {carerOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
