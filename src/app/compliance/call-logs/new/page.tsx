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
import { CalendarIcon, Phone, ArrowLeft, Home, Check, ChevronsUpDown, Send, MapPin, Loader2, CheckCircle, Clock, MessageSquare, AlertTriangle, Lock, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useOrganization } from '@clerk/nextjs';
import { useToast } from "@/hooks/use-toast";
import { useGoogleMaps } from '@/components/google-maps-provider';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import CarerMap from '@/components/carer-map';

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

interface PindropSession {
  id: string;
  status: 'PENDING' | 'SUBMITTED' | 'EXPIRED';
  callerName: string | null;
  callerEmail: string | null;
  callerPhone: string | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  photoUrls: string[];
  callerNotes: string | null;
  submittedAt: string | null;
}

/**
 * Validate an Australian mobile number.
 * Accepts: 04xxxxxxxx, +614xxxxxxxx, 614xxxxxxxx (with optional spaces/dashes)
 */
function isValidAuMobile(phone: string): boolean {
  const stripped = phone.replace(/[\s\-()]/g, '');
  return /^(\+?61|0)4\d{8}$/.test(stripped);
}

const MAPS_LIBRARIES: ('places')[] = ['places'];

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

  // SMS plan state
  const [smsPlan, setSmsPlan] = useState<{ enabled: boolean; tier: string } | null>(null);

  // Carer map dialog
  const [carerMapOpen, setCarerMapOpen] = useState(false);

  // Pindrop state
  const [pindropSession, setPindropSession] = useState<PindropSession | null>(null);
  const [pindropSending, setPindropSending] = useState(false);
  const [pindropDismissed, setPindropDismissed] = useState(false);

  // Refs to track current form values for safe polling callback access
  const callerNameRef = useRef(callerName);
  const callerEmailRef = useRef(callerEmail);
  const callerPhoneRef = useRef(callerPhone);
  const locationRef = useRef(location);
  callerNameRef.current = callerName;
  callerEmailRef.current = callerEmail;
  callerPhoneRef.current = callerPhone;
  locationRef.current = location;

  const { isLoaded: mapsLoaded } = useGoogleMaps();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';
  const { isLoaded: mapReady } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: MAPS_LIBRARIES,
  });

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
        const [animalsRes, lookupsRes, membersRes, speciesRes, smsRes] = await Promise.all([
          fetch(`/api/animals?orgId=${organization.id}`),
          fetch(`/api/call-log-lookups?orgId=${organization.id}`),
          organization.getMemberships(),
          fetch(`/api/species?orgId=${organization.id}`),
          fetch('/api/sms-status'),
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
        if (smsRes.ok) {
          const smsData = await smsRes.json();
          setSmsPlan(smsData);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    load();
  }, [organization]);

  // Poll pindrop session for updates
  const fetchPindropSession = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/pindrop/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setPindropSession(data);
        return data;
      }
    } catch { /* ignore */ }
    return null;
  }, []);

  useEffect(() => {
    if (!pindropSession || pindropSession.status !== 'PENDING') return;
    const sessionId = pindropSession.id;
    let cancelled = false;
    const timeoutRef = { current: undefined as ReturnType<typeof setTimeout> | undefined };

    async function poll() {
      if (cancelled) return;
      const updated = await fetchPindropSession(sessionId);
      if (cancelled) return;
      if (updated?.status === 'SUBMITTED') {
        if (updated.callerName && !callerNameRef.current.trim()) setCallerName(updated.callerName);
        if (updated.callerEmail && !callerEmailRef.current.trim()) setCallerEmail(updated.callerEmail);
        if (updated.callerPhone && !callerPhoneRef.current.trim()) setCallerPhone(updated.callerPhone);
        if (updated.address && !locationRef.current.trim()) setLocation(updated.address);
        toast({ title: 'Location Received', description: 'The caller has submitted their location and details.' });
        return; // stop polling
      }
      if (updated?.status === 'EXPIRED') return; // stop polling
      timeoutRef.current = setTimeout(poll, 5000);
    }

    timeoutRef.current = setTimeout(poll, 5000);
    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [pindropSession?.id, pindropSession?.status, fetchPindropSession, toast]);

  const handleSendPindrop = async () => {
    if (!isValidAuMobile(callerPhone)) {
      toast({ title: 'Invalid Phone', description: 'Please enter a valid Australian mobile number (e.g. 0412 345 678).', variant: 'destructive' });
      return;
    }
    setPindropSending(true);
    try {
      const res = await fetch('/api/pindrop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callerPhone }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send SMS');
      }
      const data = await res.json();
      toast({ title: 'SMS Sent', description: 'Location request sent to the caller\'s phone.' });
      await fetchPindropSession(data.id);
    } catch (error) {
      toast({
        title: 'Failed to Send',
        description: error instanceof Error ? error.message : 'Could not send SMS.',
        variant: 'destructive',
      });
    } finally {
      setPindropSending(false);
    }
  };

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
      // Build coordinates from pindrop if available
      const coordinates = pindropSession?.status === 'SUBMITTED' && pindropSession.lat != null && pindropSession.lng != null
        ? { lat: pindropSession.lat, lng: pindropSession.lng }
        : null;

      const payload = {
        dateTime: dateTime.toISOString(),
        callerName: callerName.trim(),
        callerPhone: callerPhone || null,
        callerEmail: callerEmail || null,
        species: species || null,
        location: location || null,
        coordinates,
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
        pindropSessionId: pindropSession?.id || null,
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

  const hasValidMobile = isValidAuMobile(callerPhone);
  const hasSmsplan = smsPlan?.enabled === true;
  const showPindropBanner = hasValidMobile && !pindropSession && !pindropDismissed && smsPlan !== null;
  const showPindropPanel = !!pindropSession;

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/compliance/call-logs">
          <Button variant="outline" size="icon" className="shrink-0" aria-label="Back to call logs">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <Link href="/">
          <Button variant="outline" size="icon" className="shrink-0" aria-label="Home">
            <Home className="h-4 w-4" />
          </Button>
        </Link>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold">New Call</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Record an incoming wildlife rescue call
          </p>
        </div>
      </div>

      {/* Pindrop SMS Banner — appears when valid AU mobile is entered */}
      {showPindropBanner && hasSmsplan && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/50 p-2 shrink-0">
              <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-blue-900 dark:text-blue-200 text-sm">Speed up this call with a Location Request</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-0.5">
                Send the caller an SMS link so they can share their exact GPS location, contact details, and photos of the animal directly from their phone. Their response will auto-fill this form.
              </p>
              <div className="flex items-center gap-3 mt-3">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSendPindrop}
                  disabled={pindropSending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {pindropSending ? (
                    <><Loader2 className="animate-spin h-4 w-4 mr-2" /> Sending...</>
                  ) : (
                    <><Send className="h-4 w-4 mr-2" /> Send Location Request SMS</>
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() => setPindropDismissed(true)}
                  className="text-xs text-blue-500 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SMS plan required banner — appears when valid AU mobile entered but no SMS plan */}
      {showPindropBanner && !hasSmsplan && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/30 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-2 shrink-0">
              <Lock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-gray-200 text-sm">SMS Location Requests Available</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                You can send callers an SMS link to instantly capture their GPS location, contact details, and photos — but your organisation needs an SMS plan to use this feature. Contact your administrator to enable one.
              </p>
              <button
                type="button"
                onClick={() => setPindropDismissed(true)}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mt-2"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pindrop Status Panel — shows after SMS is sent */}
      {showPindropPanel && (
        <Card className={
          pindropSession.status === 'SUBMITTED'
            ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20'
            : pindropSession.status === 'EXPIRED'
              ? 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20'
              : 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20'
        }>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" />
                Location Request
              </CardTitle>
              {pindropSession.status === 'PENDING' && (
                <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Waiting for response</Badge>
              )}
              {pindropSession.status === 'SUBMITTED' && (
                <Badge className="gap-1 bg-green-600"><CheckCircle className="h-3 w-3" /> Submitted</Badge>
              )}
              {pindropSession.status === 'EXPIRED' && (
                <Badge variant="outline" className="gap-1 border-amber-400 text-amber-700"><AlertTriangle className="h-3 w-3" /> Expired</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {pindropSession.status === 'PENDING' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="animate-spin h-4 w-4" />
                Waiting for the caller to open the link and submit their details...
              </div>
            )}

            {pindropSession.status === 'EXPIRED' && (
              <div className="space-y-3">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  The location request expired before the caller responded. You can send a new one.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setPindropSession(null);
                    setPindropDismissed(false);
                  }}
                >
                  <Send className="h-4 w-4 mr-2" /> Send New Request
                </Button>
              </div>
            )}

            {pindropSession.status === 'SUBMITTED' && (
              <div className="space-y-3">
                <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                  The caller has submitted their details. Form fields have been auto-populated.
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {pindropSession.callerName && (
                    <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{pindropSession.callerName}</span></div>
                  )}
                  {pindropSession.callerEmail && (
                    <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{pindropSession.callerEmail}</span></div>
                  )}
                  {pindropSession.callerPhone && (
                    <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{pindropSession.callerPhone}</span></div>
                  )}
                  {pindropSession.address && (
                    <div className="col-span-2"><span className="text-muted-foreground">Address:</span> <span className="font-medium">{pindropSession.address}</span></div>
                  )}
                </div>

                {pindropSession.lat != null && pindropSession.lng != null && apiKey && mapReady && (
                  <div className="rounded-lg overflow-hidden border">
                    <GoogleMap
                      mapContainerStyle={{ width: '100%', height: '180px' }}
                      center={{ lat: pindropSession.lat, lng: pindropSession.lng }}
                      zoom={15}
                      options={{ disableDefaultUI: true, zoomControl: true, draggable: true }}
                    >
                      <Marker position={{ lat: pindropSession.lat, lng: pindropSession.lng }} />
                    </GoogleMap>
                  </div>
                )}

                {pindropSession.callerNotes && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Caller notes:</span>{' '}
                    <span className="italic">{pindropSession.callerNotes}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
                    placeholder="e.g. 0412 345 678"
                    type="tel"
                  />
                  {callerPhone && !isValidAuMobile(callerPhone) && callerPhone.replace(/[\s\-()]/g, '').length >= 4 && (
                    <p className="text-xs text-muted-foreground">Enter a valid AU mobile (04xx) to enable SMS location request</p>
                  )}
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
                  <div className="flex gap-2">
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
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      title="Locate carer on map"
                      onClick={() => setCarerMapOpen(true)}
                    >
                      <Map className="h-4 w-4" />
                    </Button>
                  </div>
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

      {/* Carer Map Dialog */}
      <Dialog open={carerMapOpen} onOpenChange={setCarerMapOpen}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 flex flex-col">
          <DialogHeader className="p-4 pb-2 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Map className="h-5 w-5" />
              Locate Carer
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Click a marker then press Assign to assign the carer to this call
            </p>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4 pt-0">
            <CarerMap
              initialSpeciesFilter={species || undefined}
              onSelectCarer={(carer) => {
                setAssignedToUserId(carer.id);
                setAssignedToUserName(carer.name);
                setCarerMapOpen(false);
                toast({
                  title: 'Carer Assigned',
                  description: `${carer.name} has been assigned to this call.`,
                });
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
