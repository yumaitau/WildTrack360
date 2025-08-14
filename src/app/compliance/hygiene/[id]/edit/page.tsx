"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Shield, ArrowLeft, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useOrganization } from '@clerk/nextjs';
import { useToast } from "@/hooks/use-toast";
import { use } from 'react';

interface EditHygieneLogPageProps {
  params: Promise<{ id: string }>;
}

export default function EditHygieneLogPage({ params }: EditHygieneLogPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [date, setDate] = useState<Date>(new Date());
  const [enclosureCleaned, setEnclosureCleaned] = useState(false);
  const [ppeUsed, setPpeUsed] = useState(false);
  const [handwashAvailable, setHandwashAvailable] = useState(false);
  const [feedingBowlsDisinfected, setFeedingBowlsDisinfected] = useState(false);
  const [quarantineSignsPresent, setQuarantineSignsPresent] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const loadHygieneLog = async () => {
      try {
        const response = await fetch(`/api/hygiene/${id}`);
        if (!response.ok) throw new Error('Failed to load hygiene log');
        const data = await response.json();
        
        setDate(new Date(data.date));
        setEnclosureCleaned(data.enclosureCleaned || false);
        setPpeUsed(data.ppeUsed || false);
        setHandwashAvailable(data.handwashAvailable || false);
        setFeedingBowlsDisinfected(data.feedingBowlsDisinfected || false);
        setQuarantineSignsPresent(data.quarantineSignsPresent || false);
        setNotes(data.notes || '');
      } catch (error) {
        console.error('Error loading hygiene log:', error);
        toast({
          title: "Error",
          description: "Failed to load hygiene log",
          variant: "destructive",
        });
      }
    };
    loadHygieneLog();
  }, [id, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    
    try {
      const response = await fetch(`/api/hygiene/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          enclosureCleaned,
          ppeUsed,
          handwashAvailable,
          feedingBowlsDisinfected,
          quarantineSignsPresent,
          notes: notes || null,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Hygiene log updated successfully",
        });
        router.push(`/compliance/hygiene/${id}`);
      } else {
        throw new Error('Failed to update hygiene log');
      }
    } catch (error) {
      console.error('Error updating hygiene log:', error);
      toast({
        title: "Error",
        description: "Failed to update hygiene log",
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
          <Link href={`/compliance/hygiene/${id}`}>
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
            <h1 className="text-3xl font-bold">Edit Hygiene Log</h1>
            <p className="text-muted-foreground">
              Update the hygiene log details
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Hygiene Checklist
            </CardTitle>
            <CardDescription>
              Update the daily cleaning and biosecurity protocols
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full md:w-[280px] justify-start text-left font-normal",
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

            {/* Checklist Items */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="enclosureCleaned"
                  checked={enclosureCleaned}
                  onCheckedChange={(checked) => setEnclosureCleaned(checked as boolean)}
                />
                <Label 
                  htmlFor="enclosureCleaned" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Enclosure cleaned and disinfected
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="ppeUsed"
                  checked={ppeUsed}
                  onCheckedChange={(checked) => setPpeUsed(checked as boolean)}
                />
                <Label 
                  htmlFor="ppeUsed" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  PPE used for zoonotic prevention
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="handwashAvailable"
                  checked={handwashAvailable}
                  onCheckedChange={(checked) => setHandwashAvailable(checked as boolean)}
                />
                <Label 
                  htmlFor="handwashAvailable" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Handwash facilities available and stocked
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="feedingBowlsDisinfected"
                  checked={feedingBowlsDisinfected}
                  onCheckedChange={(checked) => setFeedingBowlsDisinfected(checked as boolean)}
                />
                <Label 
                  htmlFor="feedingBowlsDisinfected" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Feeding bowls/equipment disinfected
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="quarantineSignsPresent"
                  checked={quarantineSignsPresent}
                  onCheckedChange={(checked) => setQuarantineSignsPresent(checked as boolean)}
                />
                <Label 
                  htmlFor="quarantineSignsPresent" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Quarantine signs present where required
                </Label>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="flex justify-end gap-4">
              <Link href={`/compliance/hygiene/${id}`}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Log'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}