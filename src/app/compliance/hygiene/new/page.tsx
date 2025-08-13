"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Calendar, Shield, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useOrganization } from '@clerk/nextjs';
import { getCurrentJurisdiction } from '@/lib/config';
import { getJurisdictionComplianceConfig } from '@/lib/compliance-rules';

export default function NewHygieneLogPage() {
  const router = useRouter();
  const { organization } = useOrganization();
  const jurisdiction = getCurrentJurisdiction();
  const complianceConfig = getJurisdictionComplianceConfig(jurisdiction);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state with validation
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [carerId, setCarerId] = useState<string>('');
  const [enclosureCleaned, setEnclosureCleaned] = useState<boolean>(false);
  const [ppeUsed, setPpeUsed] = useState<boolean>(false);
  const [handwashAvailable, setHandwashAvailable] = useState<boolean>(false);
  const [feedingBowlsDisinfected, setFeedingBowlsDisinfected] = useState<boolean>(false);
  const [quarantineSignsPresent, setQuarantineSignsPresent] = useState<boolean>(false);
  const [biosecurityProtocols, setBiosecurityProtocols] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');

  // Validation errors
  const [errors, setErrors] = useState<{
    date?: string;
    carerId?: string;
    enclosureCleaned?: string;
    ppeUsed?: string;
    handwashAvailable?: string;
    feedingBowlsDisinfected?: string;
    quarantineSignsPresent?: string;
    biosecurityProtocols?: string;
  }>({});

  useEffect(() => {
    const loadCarers = async () => {
      try {
        if (!organization) return;
        const res = await fetch(`/api/carers?orgId=${organization.id}`);
        const data = await res.json();
        setUsers(data);
      } catch (error) {
        console.error('Error loading carers:', error);
      } finally {
        setLoading(false);
      }
    };
    loadCarers();
  }, [organization]);

  const biosecurityOptions = [
    'Footbaths used at entry/exit',
    'Equipment sterilized between animals',
    'Clothing changed between enclosures',
    'Disinfectant solution properly mixed',
    'Waste disposed of in sealed containers',
    'Sick animals isolated immediately',
    'Cross-contamination prevention measures',
    'Regular handwashing protocols followed'
  ];

  const handleBiosecurityToggle = (protocol: string) => {
    setBiosecurityProtocols(prev => 
      prev.includes(protocol) 
        ? prev.filter(p => p !== protocol)
        : [...prev, protocol]
    );
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!date) {
      newErrors.date = 'Date is required';
    }

    if (!carerId) {
      newErrors.carerId = 'Please select a carer';
    }

    // Basic validation - all hygiene checks should be completed for compliance
    if (!enclosureCleaned) {
      newErrors.enclosureCleaned = 'Enclosure cleaning is required';
    }

    if (!ppeUsed) {
      newErrors.ppeUsed = 'PPE usage is required';
    }

    if (!handwashAvailable) {
      newErrors.handwashAvailable = 'Handwash availability is required';
    }

    if (!feedingBowlsDisinfected) {
      newErrors.feedingBowlsDisinfected = 'Bowl disinfection is required';
    }

    if (!quarantineSignsPresent) {
      newErrors.quarantineSignsPresent = 'Quarantine signs are required';
    }

    // Require at least 3 biosecurity protocols for good practice
    if (biosecurityProtocols.length < 3) {
      newErrors.biosecurityProtocols = 'At least 3 biosecurity protocols must be followed';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const payload = {
        date,
        carerId,
        enclosureCleaned,
        ppeUsed,
        handwashAvailable,
        feedingBowlsDisinfected,
        quarantineSignsPresent,
        photos: [],
        notes,
        clerkOrganizationId: organization?.id,
        type: 'DAILY',
        description: `Daily hygiene log (${jurisdiction})`,
        completed: true
      };
      const res = await fetch('/api/hygiene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      router.push('/compliance/hygiene');
    } catch (error) {
      console.error('Error saving hygiene log:', error);
      alert('Error saving hygiene log');
    } finally {
      setSaving(false);
    }
  };

  const getComplianceScore = () => {
    const checks = [
      enclosureCleaned,
      ppeUsed,
      handwashAvailable,
      feedingBowlsDisinfected,
      quarantineSignsPresent
    ];
    const passed = checks.filter(Boolean).length;
    return Math.round((passed / checks.length) * 100);
  };

  const getComplianceStatus = (score: number) => {
    if (score === 100) return 'compliant';
    if (score >= 80) return 'mostly-compliant';
    return 'non-compliant';
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading users...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/compliance/hygiene">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Hygiene Logs
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">New Hygiene Log Entry</h1>
            <p className="text-muted-foreground">
              Section 5.2.x - Daily cleaning and biosecurity protocols for {jurisdiction}
            </p>
          </div>
        </div>
        <Badge variant="outline">
          {jurisdiction} Jurisdiction
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Basic Information
            </CardTitle>
            <CardDescription>
              Date and carer information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              {errors.date && (
                <p className="text-sm text-red-600">{errors.date}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="carer">Carer *</Label>
              <Select value={carerId} onValueChange={setCarerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a carer" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.carerId && (
                <p className="text-sm text-red-600">{errors.carerId}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Compliance Score */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Compliance Score
            </CardTitle>
            <CardDescription>
              Real-time compliance tracking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">{getComplianceScore()}%</div>
              <Badge 
                variant={getComplianceStatus(getComplianceScore()) === 'compliant' ? 'default' : 
                        getComplianceStatus(getComplianceScore()) === 'mostly-compliant' ? 'secondary' : 'destructive'}
              >
                {getComplianceStatus(getComplianceScore()) === 'compliant' ? 'Compliant' :
                 getComplianceStatus(getComplianceScore()) === 'mostly-compliant' ? 'Mostly Compliant' : 'Non-Compliant'}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              Based on {jurisdiction} requirements
            </div>
          </CardContent>
        </Card>

        {/* Required Hygiene Checks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Required Hygiene Checks
            </CardTitle>
            <CardDescription>
              Essential daily hygiene protocols
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enclosureCleaned"
                  checked={enclosureCleaned}
                  onCheckedChange={(checked) => setEnclosureCleaned(checked as boolean)}
                />
                                 <Label htmlFor="enclosureCleaned" className="text-sm">
                   Enclosure cleaned and disinfected
                   <Badge variant="outline" className="ml-2">Required</Badge>
                 </Label>
              </div>
              {errors.enclosureCleaned && (
                <p className="text-sm text-red-600">{errors.enclosureCleaned}</p>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ppeUsed"
                  checked={ppeUsed}
                  onCheckedChange={(checked) => setPpeUsed(checked as boolean)}
                />
                                 <Label htmlFor="ppeUsed" className="text-sm">
                   Appropriate PPE used
                   <Badge variant="outline" className="ml-2">Required</Badge>
                 </Label>
              </div>
              {errors.ppeUsed && (
                <p className="text-sm text-red-600">{errors.ppeUsed}</p>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="handwashAvailable"
                  checked={handwashAvailable}
                  onCheckedChange={(checked) => setHandwashAvailable(checked as boolean)}
                />
                                 <Label htmlFor="handwashAvailable" className="text-sm">
                   Handwash facilities available and used
                   <Badge variant="outline" className="ml-2">Required</Badge>
                 </Label>
               </div>
               {errors.handwashAvailable && (
                 <p className="text-sm text-red-600">{errors.handwashAvailable}</p>
               )}

               <div className="flex items-center space-x-2">
                 <Checkbox
                   id="feedingBowlsDisinfected"
                   checked={feedingBowlsDisinfected}
                   onCheckedChange={(checked) => setFeedingBowlsDisinfected(checked as boolean)}
                 />
                 <Label htmlFor="feedingBowlsDisinfected" className="text-sm">
                   Feeding bowls disinfected
                   <Badge variant="outline" className="ml-2">Required</Badge>
                 </Label>
               </div>
               {errors.feedingBowlsDisinfected && (
                 <p className="text-sm text-red-600">{errors.feedingBowlsDisinfected}</p>
               )}

               <div className="flex items-center space-x-2">
                 <Checkbox
                   id="quarantineSignsPresent"
                   checked={quarantineSignsPresent}
                   onCheckedChange={(checked) => setQuarantineSignsPresent(checked as boolean)}
                 />
                 <Label htmlFor="quarantineSignsPresent" className="text-sm">
                   Quarantine signs present and visible
                   <Badge variant="outline" className="ml-2">Required</Badge>
                 </Label>
               </div>
               {errors.quarantineSignsPresent && (
                 <p className="text-sm text-red-600">{errors.quarantineSignsPresent}</p>
               )}
             </div>
           </CardContent>
         </Card>

         {/* Biosecurity Protocols */}
         <Card>
           <CardHeader>
             <CardTitle>Biosecurity Protocols</CardTitle>
             <CardDescription>
               Additional biosecurity measures implemented
               <div className="mt-1">
                 <Badge variant="outline">
                   Minimum 3 required
                 </Badge>
               </div>
             </CardDescription>
           </CardHeader>
          <CardContent className="space-y-3">
            {biosecurityOptions.map(option => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={option}
                  checked={biosecurityProtocols.includes(option)}
                  onCheckedChange={() => handleBiosecurityToggle(option)}
                />
                <Label htmlFor={option} className="text-sm">{option}</Label>
              </div>
            ))}
            {errors.biosecurityProtocols && (
              <p className="text-sm text-red-600">{errors.biosecurityProtocols}</p>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
            <CardDescription>
              Any additional observations or issues
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Enter any additional notes, observations, or issues..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <Button asChild variant="outline">
          <Link href="/compliance/hygiene">
            Cancel
          </Link>
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Hygiene Log'}
        </Button>
      </div>
    </div>
  );
} 