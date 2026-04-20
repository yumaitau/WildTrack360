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
import { CalendarIcon, ArrowLeft, Save, X, Plus, Home, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useOrganization } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";
import { use } from 'react';
import { AddressAutocomplete, type AddressDetails } from "@/components/address-autocomplete";
import { Checkbox } from "@/components/ui/checkbox";

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
  const [memberId, setMemberId] = useState("");

  // Address fields
  const [addressSearch, setAddressSearch] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [suburb, setSuburb] = useState("");
  const [state, setState] = useState("");
  const [postcode, setPostcode] = useState("");

  // NSW Species Endorsements (Member Register columns L-P)
  const [rehabilitatesKoala, setRehabilitatesKoala] = useState(false);
  const [rehabilitatesFlyingFox, setRehabilitatesFlyingFox] = useState(false);
  const [rehabilitatesBirdOfPrey, setRehabilitatesBirdOfPrey] = useState(false);
  const [rehabilitatesVenomousSnake, setRehabilitatesVenomousSnake] = useState(false);
  const [rehabilitatesMarineReptile, setRehabilitatesMarineReptile] = useState(false);

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
        setMemberId(data.memberId || "");

        // Address fields
        setStreetAddress(data.streetAddress || "");
        setSuburb(data.suburb || "");
        setState(data.state || "");
        setPostcode(data.postcode || "");

        // NSW Species Endorsements
        setRehabilitatesKoala(!!data.rehabilitatesKoala);
        setRehabilitatesFlyingFox(!!data.rehabilitatesFlyingFox);
        setRehabilitatesBirdOfPrey(!!data.rehabilitatesBirdOfPrey);
        setRehabilitatesVenomousSnake(!!data.rehabilitatesVenomousSnake);
        setRehabilitatesMarineReptile(!!data.rehabilitatesMarineReptile);
        // Pre-fill the search field with the formatted address
        const addressParts = [data.streetAddress, data.suburb, data.state, data.postcode].filter(Boolean);
        if (addressParts.length > 0) setAddressSearch(addressParts.join(", "));
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
          streetAddress: streetAddress || null,
          suburb: suburb || null,
          state: state || null,
          postcode: postcode || null,
          memberId: memberId || null,
          rehabilitatesKoala,
          rehabilitatesFlyingFox,
          rehabilitatesBirdOfPrey,
          rehabilitatesVenomousSnake,
          rehabilitatesMarineReptile,
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
    <div className="container mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="outline" size="icon" className="shrink-0">
            <Home className="h-4 w-4" />
          </Button>
        </Link>
        <Link href={`/compliance/carers/${id}`}>
          <Button variant="outline" size="icon" className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold">Edit Carer Profile</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Update profile information and compliance details
          </p>
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
              <div className="space-y-2">
                <Label htmlFor="memberId">Member ID</Label>
                <Input
                  id="memberId"
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  placeholder="e.g., M-0042"
                />
                <p className="text-xs text-muted-foreground">
                  Your organisation&apos;s internal identifier for this person. Used on regulatory reports.
                </p>
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

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Address
            </CardTitle>
            <CardDescription>
              Search for an address to auto-fill, or edit fields manually
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Address Lookup</Label>
              <AddressAutocomplete
                value={addressSearch}
                onChange={setAddressSearch}
                onSelect={(details: AddressDetails) => {
                  setStreetAddress(details.streetAddress);
                  setSuburb(details.suburb);
                  setState(details.state);
                  setPostcode(details.postcode);
                  setAddressSearch(details.formattedAddress);
                }}
                placeholder="Start typing an address..."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="streetAddress">Street Address</Label>
                <Input
                  id="streetAddress"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="e.g. 42 Wallaby Way"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="suburb">Suburb</Label>
                <Input
                  id="suburb"
                  value={suburb}
                  onChange={(e) => setSuburb(e.target.value)}
                  placeholder="e.g. Sydney"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. NSW"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode</Label>
                <Input
                  id="postcode"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  placeholder="e.g. 2000"
                />
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

        {/* NSW Species Endorsements */}
        {jurisdiction === "NSW" && (
          <Card>
            <CardHeader>
              <CardTitle>NSW Species Endorsements</CardTitle>
              <CardDescription>
                Required for the NSW DCCEEW Register of Members — tick each species this member is authorised to rehabilitate under the organisation&apos;s licence.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "Koala", value: rehabilitatesKoala, setValue: setRehabilitatesKoala },
                  { label: "Flying-Fox", value: rehabilitatesFlyingFox, setValue: setRehabilitatesFlyingFox },
                  { label: "Bird of Prey", value: rehabilitatesBirdOfPrey, setValue: setRehabilitatesBirdOfPrey },
                  { label: "Venomous Snake", value: rehabilitatesVenomousSnake, setValue: setRehabilitatesVenomousSnake },
                  { label: "Marine Reptiles", value: rehabilitatesMarineReptile, setValue: setRehabilitatesMarineReptile },
                ].map(({ label, value, setValue }) => (
                  <label key={label} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={value} onCheckedChange={(c) => setValue(c === true)} />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
