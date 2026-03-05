"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Phone, ArrowLeft, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useOrganization } from '@clerk/nextjs';
import { useToast } from "@/hooks/use-toast";

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

export default function EditCallLogPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [animals, setAnimals] = useState<any[]>([]);
  const [lookups, setLookups] = useState<Lookups>({ reason: [], referrer: [], action: [], outcome: [] });
  const [orgMembers, setOrgMembers] = useState<any[]>([]);

  // Form state
  const [dateTime, setDateTime] = useState<Date>(new Date());
  const [status, setStatus] = useState('OPEN');
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

  useEffect(() => {
    if (!organization) return;
    const load = async () => {
      try {
        const [callLogRes, animalsRes, lookupsRes, membersRes] = await Promise.all([
          fetch(`/api/call-logs/${id}`),
          fetch(`/api/animals?orgId=${organization.id}`),
          fetch(`/api/call-log-lookups?orgId=${organization.id}`),
          organization.getMemberships(),
        ]);

        if (!callLogRes.ok) throw new Error('Call log not found');

        const callLog = await callLogRes.json();
        const animalsData = await animalsRes.json();
        const lookupsData = await lookupsRes.json();

        setAnimals(animalsData);
        setLookups(lookupsData);
        const members = membersRes.data?.map((m: any) => ({
          userId: m.publicUserData?.userId,
          name: [m.publicUserData?.firstName, m.publicUserData?.lastName].filter(Boolean).join(' ') || m.publicUserData?.identifier || 'Unknown',
        })) || [];
        setOrgMembers(members);

        // Populate form
        setDateTime(new Date(callLog.dateTime));
        setStatus(callLog.status);
        setCallerName(callLog.callerName || '');
        setCallerPhone(callLog.callerPhone || '');
        setCallerEmail(callLog.callerEmail || '');
        setSpecies(callLog.species || '');
        setLocation(callLog.location || '');
        setSuburb(callLog.suburb || '');
        setPostcode(callLog.postcode || '');
        setReason(callLog.reason || '');
        setReferrer(callLog.referrer || '');
        setAction(callLog.action || '');
        setOutcome(callLog.outcome || '');
        setAssignedToUserId(callLog.assignedToUserId || '');
        setAssignedToUserName(callLog.assignedToUserName || '');
        setAnimalId(callLog.animalId || '');
        setNotes(callLog.notes || '');
      } catch (error) {
        console.error('Error loading call log:', error);
        toast({ title: "Error", description: "Failed to load call log", variant: "destructive" });
      } finally {
        setInitialLoading(false);
      }
    };
    load();
  }, [organization, id, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organization) {
      toast({ title: "Organization Not Found", description: "Please ensure you're logged in to an organization", variant: "destructive" });
      return;
    }

    if (!callerName.trim()) {
      toast({ title: "Missing Required Fields", description: "Caller name is required", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        dateTime: dateTime.toISOString(),
        status,
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
        assignedToUserName: (assignedToUserId && assignedToUserId !== 'none') ? assignedToUserName : null,
        animalId: (animalId && animalId !== 'none') ? animalId : null,
        notes: notes || null,
      };

      const response = await fetch(`/api/call-logs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        toast({ title: "Success", description: "Call log updated successfully" });
        router.push(`/compliance/call-logs/${id}`);
      } else {
        throw new Error(data.error || 'Failed to update call log');
      }
    } catch (error) {
      console.error('Error updating call log:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update call log",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const activeLookups = (items: LookupItem[]) => items.filter((i) => i.active);

  if (initialLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-muted-foreground py-12">Loading call log...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/compliance/call-logs/${id}`}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" size="icon">
              <Home className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Edit Call</h1>
            <p className="text-muted-foreground">Update call log details</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Status & Caller Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Caller Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Status */}
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPEN">Open</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
                  <Input value={callerName} onChange={(e) => setCallerName(e.target.value)} placeholder="Name of the caller" />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input value={callerPhone} onChange={(e) => setCallerPhone(e.target.value)} placeholder="Contact phone number" type="tel" />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={callerEmail} onChange={(e) => setCallerEmail(e.target.value)} placeholder="Contact email" type="email" />
                </div>

                {/* Referrer */}
                <div className="space-y-2">
                  <Label>How Call Came In</Label>
                  <Select value={referrer} onValueChange={setReferrer}>
                    <SelectTrigger><SelectValue placeholder="Select referrer source" /></SelectTrigger>
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
                  <Input value={species} onChange={(e) => setSpecies(e.target.value)} placeholder="Species involved" />
                </div>

                {/* Reason */}
                <div className="space-y-2">
                  <Label>Reason for Call</Label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
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
                    <SelectTrigger><SelectValue placeholder="Select action" /></SelectTrigger>
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
                    <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
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
                    <SelectTrigger><SelectValue placeholder="Assign to a carer/coordinator" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Unassigned —</SelectItem>
                      {orgMembers.map((member: any) => (
                        <SelectItem key={member.userId} value={member.userId}>{member.name}</SelectItem>
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
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2 md:col-span-3">
                  <Label>Address / Location Description</Label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Street address or location description" />
                </div>
                <div className="space-y-2">
                  <Label>Suburb</Label>
                  <Input value={suburb} onChange={(e) => setSuburb(e.target.value)} placeholder="Suburb" />
                </div>
                <div className="space-y-2">
                  <Label>Postcode</Label>
                  <Input value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="Postcode" />
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
                  <Label>Link to Animal Record</Label>
                  <Select value={animalId} onValueChange={setAnimalId}>
                    <SelectTrigger><SelectValue placeholder="Select animal if applicable" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {animals.map((animal: any) => (
                        <SelectItem key={animal.id} value={animal.id}>{animal.name} — {animal.species}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes / Comments</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes..." rows={4} className="resize-none" />
              </div>

              <div className="flex justify-end gap-4">
                <Link href={`/compliance/call-logs/${id}`}>
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
