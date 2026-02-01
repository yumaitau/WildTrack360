"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, AlertTriangle, ArrowLeft, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useOrganization } from '@clerk/nextjs';
import { useToast } from "@/hooks/use-toast";

const incidentTypes = [
  'Escape',
  'Injury',
  'Disease Outbreak',
  'Death',
  'Equipment Failure',
  'Medication Error',
  'Public Contact',
  'Staff Injury',
  'Other'
];

export default function NewIncidentReportPage() {
  const router = useRouter();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [animals, setAnimals] = useState<any[]>([]);
  const [attempted, setAttempted] = useState(false);
  
  // Form state
  const [date, setDate] = useState<Date>(new Date());
  const [type, setType] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [severity, setSeverity] = useState<string>('');
  const [personInvolved, setPersonInvolved] = useState<string>('');
  const [reportedTo, setReportedTo] = useState<string>('');
  const [actionTaken, setActionTaken] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [animalId, setAnimalId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    const loadAnimals = async () => {
      if (!organization) return;
      try {
        const response = await fetch(`/api/animals?orgId=${organization.id}`);
        const data = await response.json();
        setAnimals(data);
      } catch (error) {
        console.error('Error loading animals:', error);
      }
    };
    loadAnimals();
  }, [organization]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    
    // Check if organization is loaded
    if (!organization) {
      toast({
        title: "Organization Not Found",
        description: "Please ensure you're logged in to an organization",
        variant: "destructive",
      });
      return;
    }
    
    // Detailed validation with specific error messages
    const missingFields = [];
    if (!type) missingFields.push('Incident Type');
    if (!description) missingFields.push('Description');
    if (!severity) missingFields.push('Severity');
    
    if (missingFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please fill in: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const payload = {
        date: date || new Date(),
        type,
        description,
        severity,
        personInvolved: personInvolved || null,
        reportedTo: reportedTo || null,
        actionTaken: actionTaken || null,
        location: location || null,
        animalId: (animalId && animalId !== 'none') ? animalId : null,
        notes: notes || null,
        resolved: false,
        clerkOrganizationId: organization?.id
      };
      
      const response = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Incident report created successfully",
        });
        router.push('/compliance/incidents');
      } else {
        throw new Error(data.error || 'Failed to create incident report');
      }
    } catch (error) {
      console.error('Error creating incident:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create incident report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/compliance/incidents">
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
            <h1 className="text-3xl font-bold">New Incident Report</h1>
            <p className="text-muted-foreground">
              Document and report incidents for compliance tracking
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Incident Details
            </CardTitle>
            <CardDescription>
              Provide complete information about the incident
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="date">Date of Incident *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => d && setDate(d)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label htmlFor="type">Incident Type *</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className={attempted && !type ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select incident type" />
                  </SelectTrigger>
                  <SelectContent>
                    {incidentTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {attempted && !type && (
                  <p className="text-sm text-red-500">Incident type is required</p>
                )}
              </div>

              {/* Severity */}
              <div className="space-y-2">
                <Label htmlFor="severity">Severity *</Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger className={attempted && !severity ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low - Minor issue, no immediate action needed</SelectItem>
                    <SelectItem value="MEDIUM">Medium - Requires attention within 24 hours</SelectItem>
                    <SelectItem value="HIGH">High - Requires immediate attention</SelectItem>
                    <SelectItem value="CRITICAL">Critical - Emergency, immediate action required</SelectItem>
                  </SelectContent>
                </Select>
                {attempted && !severity && (
                  <p className="text-sm text-red-500">Severity is required</p>
                )}
              </div>

              {/* Animal Involved */}
              <div className="space-y-2">
                <Label htmlFor="animal">Animal Involved (Optional)</Label>
                <Select value={animalId} onValueChange={setAnimalId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select animal if applicable" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {animals.map((animal) => (
                      <SelectItem key={animal.id} value={animal.id}>
                        {animal.name} - {animal.species}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Where did the incident occur?"
                />
              </div>

              {/* Person Involved */}
              <div className="space-y-2">
                <Label htmlFor="personInvolved">Person(s) Involved</Label>
                <Input
                  id="personInvolved"
                  value={personInvolved}
                  onChange={(e) => setPersonInvolved(e.target.value)}
                  placeholder="Names of people involved"
                />
              </div>

              {/* Reported To */}
              <div className="space-y-2">
                <Label htmlFor="reportedTo">Reported To</Label>
                <Input
                  id="reportedTo"
                  value={reportedTo}
                  onChange={(e) => setReportedTo(e.target.value)}
                  placeholder="Who was this reported to?"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a detailed description of the incident..."
                rows={4}
                className={`resize-none ${attempted && !description ? "border-red-500" : ""}`}
              />
              {attempted && !description && (
                <p className="text-sm text-red-500">Description is required</p>
              )}
            </div>

            {/* Action Taken */}
            <div className="space-y-2">
              <Label htmlFor="actionTaken">Action Taken</Label>
              <Textarea
                id="actionTaken"
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                placeholder="What immediate actions were taken?"
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional information..."
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="flex justify-end gap-4">
              <Link href="/compliance/incidents">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Report'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}