"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { format } from "date-fns";
import { CalendarIcon, Phone, ArrowLeft, Home, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useOrganization } from '@clerk/nextjs';
import { useToast } from "@/hooks/use-toast";
import { useGoogleMaps } from '@/components/google-maps-provider';

interface LookupItem {
  id: string;
  label: string;
  active: boolean;
}

interface Lookups {
  reason: LookupItem[];
  referrer: LookupItem[];
  action: LookupItem[];
  outcome: LookupItem[];
}

export default function NewCallLogPage() {
  const router = useRouter();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [animals, setAnimals] = useState<any[]>([]);
  const [lookups, setLookups] = useState<Lookups>({ reason: [], referrer: [], action: [], outcome: [] });
  const [orgMembers, setOrgMembers] = useState<any[]>([]);
  const [attempted, setAttempted] = useState(false);

  // Form state
  const [dateTime, setDateTime] = useState<Date>(new Date());
  const [callerName, setCallerName] = useState('');
  const [callerPhone, setCallerPhone] = useState('');
  const [callerEmail, setCallerEmail] = useState('');
  const [species, setSpecies] = useState('');
  const [location, setLocation] = useState('');
  const [suburb, setSuburb] = useState('');
  const [postcode, setPostcode] = useState('');
  const [reason, setReason] = useState('');
  const [referrer, setReferrer] = useState('');
  const [action, setAction] = useState('');
  const [outcome, setOutcome] = useState('');
  const [assignedToUserId, setAssignedToUserId] = useState('');
  const [assignedToUserName, setAssignedToUserName] = useState('');
  const [animalId, setAnimalId] = useState('');
  const [notes, setNotes] = useState('');
  const [speciesList, setSpeciesList] = useState<string[]>([]);
  const [speciesOpen, setSpeciesOpen] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [addressOpen, setAddressOpen] = useState(false);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const placesDiv = useRef<HTMLDivElement | null>(null);

  const { isLoaded: mapsLoaded } = useGoogleMaps();

  useEffect(() => {
    if (mapsLoaded && !autocompleteService.current) {
      autocompleteService.current = new google.maps.places.AutocompleteService();
      if (placesDiv.current) {
        placesService.current = new google.maps.places.PlacesService(placesDiv.current);
      }
    }
  }, [mapsLoaded]);

  const searchAddress = useCallback((input: string) => {
    if (!autocompleteService.current || input.length < 3) {
      setAddressSuggestions([]);
      return;
    }
    autocompleteService.current.getPlacePredictions(
      { input, componentRestrictions: { country: 'au' }, types: ['address'] },
      (predictions) => {
        setAddressSuggestions(predictions || []);
      }
    );
  }, []);

  const selectAddress = useCallback((placeId: string) => {
    if (!placesService.current) return;
    placesService.current.getDetails(
      { placeId, fields: ['address_components', 'formatted_address', 'geometry'] },
      (place) => {
        if (!place) return;
        setLocation(place.formatted_address || '');
        const components = place.address_components || [];
        const suburbComp = components.find(c => c.types.includes('locality'));
        const postcodeComp = components.find(c => c.types.includes('postal_code'));
        if (suburbComp) setSuburb(suburbComp.long_name);
        if (postcodeComp) setPostcode(postcodeComp.long_name);
        setAddressOpen(false);
        setAddressSuggestions([]);
      }
    );
  }, []);

  useEffect(() => {
    if (!organization) return;
    const load = async () => {
      try {
        const [animalsRes, lookupsRes, membersRes, speciesRes] = await Promise.all([
          fetch(`/api/animals?orgId=${organization.id}`),
          fetch(`/api/call-log-lookups?orgId=${organization.id}`),
          organization.getMemberships(),
          fetch(`/api/species?orgId=${organization.id}`),
        ]);
        if (!animalsRes.ok) throw new Error('Failed to load animals');
        if (!lookupsRes.ok) throw new Error('Failed to load lookups');
        if (!speciesRes.ok) throw new Error('Failed to load species');
        const animalsData = await animalsRes.json();
        const lookupsData = await lookupsRes.json();
        const speciesData = await speciesRes.json();
        setAnimals(animalsData);
        setLookups(lookupsData);
        setSpeciesList((speciesData || []).map((s: any) => s.name));
        const members = membersRes.data?.map((m: any) => ({
          userId: m.publicUserData?.userId,
          name: [m.publicUserData?.firstName, m.publicUserData?.lastName].filter(Boolean).join(' ') || m.publicUserData?.identifier || 'Unknown',
        })) || [];
        setOrgMembers(members);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    load();
  }, [organization]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);

    if (!organization) {
      toast({ title: "Organization Not Found", description: "Please ensure you're logged in to an organization", variant: "destructive" });
      return;
    }

    const missingFields = [];
    if (!callerName.trim()) missingFields.push('Caller Name');
    if (missingFields.length > 0) {
      toast({ title: "Missing Required Fields", description: `Please fill in: ${missingFields.join(', ')}`, variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        dateTime: dateTime.toISOString(),
        callerName: callerName.trim(),
        callerPhone: callerPhone || null,
        callerEmail: callerEmail || null,
        species: species || null,
        location: location || null,
        suburb: suburb || null,
        postcode: postcode || null,
        reason: (reason && reason !== 'none') ? reason : null,
        referrer: (referrer && referrer !== 'none') ? referrer : null,
        action: (action && action !== 'none') ? action : null,
        outcome: (outcome && outcome !== 'none') ? outcome : null,
        assignedToUserId: (assignedToUserId && assignedToUserId !== 'none') ? assignedToUserId : null,
        assignedToUserName: assignedToUserName || null,
        animalId: (animalId && animalId !== 'none') ? animalId : null,
        notes: notes || null,
        clerkOrganizationId: organization.id,
      };

      const response = await fetch('/api/call-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        toast({ title: "Success", description: "Call log created successfully" });
        router.push('/compliance/call-logs');
      } else {
        throw new Error(data.error || 'Failed to create call log');
      }
    } catch (error) {
      console.error('Error creating call log:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create call log",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const activeLookups = (items: LookupItem[]) => items.filter((i) => i.active);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/compliance/call-logs">
            <Button variant="outline" size="icon" aria-label="Back to call logs">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" size="icon" aria-label="Home">
              <Home className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">New Call</h1>
            <p className="text-muted-foreground">
              Record an incoming wildlife rescue call
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Caller & Call Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Caller Details
              </CardTitle>
              <CardDescription>Who is calling and how did the call come in?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Date/Time */}
                <div className="space-y-2">
                  <Label>Date/Time of Call *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal", !dateTime && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateTime ? format(dateTime, "PPP p") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={dateTime} onSelect={(d) => d && setDateTime(d)} initialFocus />
                      <div className="p-3 border-t">
                        <Label className="text-xs">Time</Label>
                        <Input
                          type="time"
                          value={format(dateTime, 'HH:mm')}
                          onChange={(e) => {
                            const [hours, minutes] = e.target.value.split(':');
                            const newDate = new Date(dateTime);
                            newDate.setHours(parseInt(hours), parseInt(minutes));
                            setDateTime(newDate);
                          }}
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Caller Name */}
                <div className="space-y-2">
                  <Label>Caller Name *</Label>
                  <Input
                    value={callerName}
                    onChange={(e) => setCallerName(e.target.value)}
                    placeholder="Name of the caller"
                    className={attempted && !callerName.trim() ? "border-red-500" : ""}
                  />
                  {attempted && !callerName.trim() && (
                    <p className="text-sm text-red-500">Caller name is required</p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    value={callerPhone}
                    onChange={(e) => setCallerPhone(e.target.value)}
                    placeholder="Contact phone number"
                    type="tel"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={callerEmail}
                    onChange={(e) => setCallerEmail(e.target.value)}
                    placeholder="Contact email"
                    type="email"
                  />
                </div>

                {/* Referrer */}
                <div className="space-y-2">
                  <Label>How Call Came In</Label>
                  <Select value={referrer} onValueChange={setReferrer}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select referrer source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {activeLookups(lookups.referrer).map((item) => (
                        <SelectItem key={item.id} value={item.label}>{item.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Species */}
                <div className="space-y-2">
                  <Label>Species</Label>
                  <Popover open={speciesOpen} onOpenChange={setSpeciesOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={speciesOpen}
                        className="w-full justify-between font-normal"
                      >
                        {species || "Select or type species..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Search species..."
                          value={species}
                          onValueChange={setSpecies}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {species ? (
                              <button
                                type="button"
                                className="w-full px-2 py-1.5 text-sm text-left hover:bg-accent rounded-sm"
                                onClick={() => setSpeciesOpen(false)}
                              >
                                Use &quot;{species}&quot;
                              </button>
                            ) : (
                              "Type to search species..."
                            )}
                          </CommandEmpty>
                          <CommandGroup>
                            {speciesList
                              .filter(s => s.toLowerCase().includes((species || '').toLowerCase()))
                              .map((s) => (
                                <CommandItem
                                  key={s}
                                  value={s}
                                  onSelect={(val) => {
                                    setSpecies(val);
                                    setSpeciesOpen(false);
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", species === s ? "opacity-100" : "opacity-0")} />
                                  {s}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reason & Action */}
          <Card>
            <CardHeader>
              <CardTitle>Call Details</CardTitle>
              <CardDescription>Why are they calling and what action was taken?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Reason */}
                <div className="space-y-2">
                  <Label>Reason for Call</Label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {activeLookups(lookups.reason).map((item) => (
                        <SelectItem key={item.id} value={item.label}>{item.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Action */}
                <div className="space-y-2">
                  <Label>Action Taken</Label>
                  <Select value={action} onValueChange={setAction}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {activeLookups(lookups.action).map((item) => (
                        <SelectItem key={item.id} value={item.label}>{item.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Outcome */}
                <div className="space-y-2">
                  <Label>Outcome</Label>
                  <Select value={outcome} onValueChange={setOutcome}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select outcome" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {activeLookups(lookups.outcome).map((item) => (
                        <SelectItem key={item.id} value={item.label}>{item.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Assigned To */}
                <div className="space-y-2">
                  <Label>Assign To</Label>
                  <Select
                    value={assignedToUserId}
                    onValueChange={(val) => {
                      setAssignedToUserId(val);
                      const member = orgMembers.find((m: any) => m.userId === val);
                      setAssignedToUserName(member?.name || '');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Assign to a carer/coordinator" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Unassigned —</SelectItem>
                      {orgMembers.map((member: any) => (
                        <SelectItem key={member.userId} value={member.userId}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle>Animal Location</CardTitle>
              <CardDescription>Where the animal was reported</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div ref={placesDiv} className="hidden" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2 md:col-span-3">
                  <Label>Address / Location Description</Label>
                  <Popover open={addressOpen} onOpenChange={setAddressOpen}>
                    <PopoverTrigger asChild>
                      <div>
                        <Input
                          value={location}
                          onChange={(e) => {
                            setLocation(e.target.value);
                            searchAddress(e.target.value);
                            setAddressOpen(e.target.value.length >= 3);
                          }}
                          onFocus={() => {
                            if (addressSuggestions.length > 0) setAddressOpen(true);
                          }}
                          placeholder="Start typing an address..."
                          autoComplete="nope"
                          name="call-log-location-search"
                        />
                      </div>
                    </PopoverTrigger>
                    {addressSuggestions.length > 0 && (
                      <PopoverContent
                        className="w-[var(--radix-popover-trigger-width)] p-0"
                        align="start"
                        onOpenAutoFocus={(e) => e.preventDefault()}
                      >
                        <div className="max-h-60 overflow-y-auto">
                          {addressSuggestions.map((prediction) => (
                            <button
                              key={prediction.place_id}
                              type="button"
                              className="w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors border-b last:border-b-0"
                              onClick={() => selectAddress(prediction.place_id)}
                            >
                              {prediction.description}
                            </button>
                          ))}
                        </div>
                        <div className="px-3 py-1 text-[10px] text-muted-foreground text-right border-t">
                          Powered by Google
                        </div>
                      </PopoverContent>
                    )}
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Suburb</Label>
                  <Input
                    value={suburb}
                    onChange={(e) => setSuburb(e.target.value)}
                    placeholder="Suburb"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Postcode</Label>
                  <Input
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    placeholder="Postcode"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Link to Animal & Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Link to Animal Record (Optional)</Label>
                  <Select value={animalId} onValueChange={setAnimalId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select animal if applicable" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {animals.map((animal: any) => (
                        <SelectItem key={animal.id} value={animal.id}>
                          {animal.name} — {animal.species}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes / Comments</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes about the call..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div className="flex justify-end gap-4">
                <Link href="/compliance/call-logs">
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Log Call'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
