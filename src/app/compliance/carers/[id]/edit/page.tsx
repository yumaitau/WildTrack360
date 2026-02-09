"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, ArrowLeft, Save, X, Plus, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useOrganization } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";
import { use } from 'react';

interface EditCarerPageProps {
  params: Promise<{ id: string }>;
}

export default function EditCarerPage({ params }: EditCarerPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Read-only identity fields (from Clerk)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Editable profile fields
  const [phone, setPhone] = useState("");
  const [jurisdiction, setJurisdiction] = useState("ACT");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseExpiry, setLicenseExpiry] = useState<Date | undefined>(undefined);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [active, setActive] = useState(true);
  const [newSpecialty, setNewSpecialty] = useState("");

  useEffect(() => {
    const loadCarer = async () => {
      try {
        const response = await fetch(`/api/carers/${id}`);
        if (!response.ok) throw new Error("Failed to load carer");
        const data = await response.json();

        // Read-only from Clerk
        setName(data.name || "");
        setEmail(data.email || "");

        // Editable profile fields
        setPhone(data.phone || "");
        setJurisdiction(data.jurisdiction || "ACT");
        setLicenseNumber(data.licenseNumber || "");
        setLicenseExpiry(data.licenseExpiry ? new Date(data.licenseExpiry) : undefined);
        setSpecialties(data.specialties || []);
        setNotes(data.notes || "");
        setActive(data.active !== false);
      } catch (error) {
        console.error("Error loading carer:", error);
        toast({
          title: "Error",
          description: "Failed to load carer details",
          variant: "destructive",
        });
      }
    };
    loadCarer();
  }, [id, toast]);

  const handleAddSpecialty = () => {
    if (newSpecialty && !specialties.includes(newSpecialty)) {
      setSpecialties([...specialties, newSpecialty]);
      setNewSpecialty("");
    }
  };

  const handleRemoveSpecialty = (specialty: string) => {
    setSpecialties(specialties.filter(s => s !== specialty));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    try {
      const response = await fetch(`/api/carers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone || null,
          jurisdiction: jurisdiction || null,
          licenseNumber: licenseNumber || null,
          licenseExpiry: licenseExpiry || null,
          specialties,
          notes: notes || null,
          active,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Carer profile updated successfully",
        });
        router.push(`/compliance/carers/${id}`);
      } else {
        throw new Error("Failed to update carer profile");
      }
    } catch (error) {
      console.error("Error updating carer:", error);
      toast({
        title: "Error",
        description: "Failed to update carer profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <Link href="/">
              <Button variant="outline" size="icon">
                <Home className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/compliance/carers/${id}`}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div>
            <h1 className="text-3xl font-bold">Edit Carer Profile</h1>
            <p className="text-muted-foreground">
              Update profile information and compliance details
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Identity (read-only from Clerk) */}
        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
            <CardDescription>
              Name and email are managed via your organization&apos;s user settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={name} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={email} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jurisdiction">Jurisdiction</Label>
                <Select value={jurisdiction} onValueChange={setJurisdiction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select jurisdiction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACT">ACT</SelectItem>
                    <SelectItem value="NSW">NSW</SelectItem>
                    <SelectItem value="VIC">VIC</SelectItem>
                    <SelectItem value="QLD">QLD</SelectItem>
                    <SelectItem value="WA">WA</SelectItem>
                    <SelectItem value="SA">SA</SelectItem>
                    <SelectItem value="TAS">TAS</SelectItem>
                    <SelectItem value="NT">NT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Licence Information */}
        <Card>
          <CardHeader>
            <CardTitle>Licence Information</CardTitle>
            <CardDescription>
              Update licence details and expiry information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">Licence Number</Label>
                <Input
                  id="licenseNumber"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="Enter licence number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licenseExpiry">Licence Expiry</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !licenseExpiry && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {licenseExpiry ? format(licenseExpiry, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={licenseExpiry}
                      onSelect={setLicenseExpiry}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Specialties */}
        <Card>
          <CardHeader>
            <CardTitle>Specialties</CardTitle>
            <CardDescription>
              Manage carer specialties (e.g., Koala, Kangaroo, Birds)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Select value={newSpecialty} onValueChange={setNewSpecialty}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Add specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Koala">Koala</SelectItem>
                    <SelectItem value="Kangaroo">Kangaroo</SelectItem>
                    <SelectItem value="Wombat">Wombat</SelectItem>
                    <SelectItem value="Echidna">Echidna</SelectItem>
                    <SelectItem value="Possum">Possum</SelectItem>
                    <SelectItem value="Birds">Birds</SelectItem>
                    <SelectItem value="Raptors">Raptors</SelectItem>
                    <SelectItem value="Reptiles">Reptiles</SelectItem>
                    <SelectItem value="Bats">Bats</SelectItem>
                    <SelectItem value="Marsupials">Marsupials</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={handleAddSpecialty}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {specialties.map((sp, index) => (
                  <Badge key={index} variant="secondary" className="text-sm pr-1">
                    {sp}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-1 hover:bg-red-100"
                      onClick={() => handleRemoveSpecialty(sp)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
            <CardDescription>
              Any additional information about the carer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter any additional notes about the carer..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Active Status */}
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="active"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="active">Active Carer</Label>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Link href={`/compliance/carers/${id}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
