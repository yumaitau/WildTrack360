"use client";

import { useState, useEffect } from 'react';
import { Animal } from '@prisma/client';
import type { EnrichedCarer } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';

// NSW annual reports run on the Australian financial year (1 July → 30 June).
// If today is on/after 1 July, the current reporting period starts that July
// and ends the next 30 June; otherwise we're still finalising last FY.
function currentNswFinancialYear(now: Date = new Date()): { start: Date; end: Date } {
  const currentYear = now.getFullYear();
  const afterJulyStart = now.getMonth() > 5 || (now.getMonth() === 6 && now.getDate() >= 1);
  const startYear = afterJulyStart ? currentYear : currentYear - 1;
  return {
    start: new Date(startYear, 6, 1), // 1 July
    end: new Date(startYear + 1, 5, 30, 23, 59, 59, 999), // 30 June 23:59:59
  };
}
import { CalendarIcon, Download, FileSpreadsheet, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { NSWReportGenerator, NSWReportData, TransferRecord, PermanentCareRecord, PreservedSpecimenRecord } from '@/lib/nsw-report-generator';
import { NSWDetailedReportGenerator, NSWDetailedReportData } from '@/lib/nsw-detailed-report-generator';
import { useOrganization, useUser } from '@clerk/nextjs';

interface NSWReportClientProps {
  initialAnimals: Animal[];
  initialCarers: EnrichedCarer[];
  organizationId: string;
}

export default function NSWReportClient({ initialAnimals, initialCarers, organizationId }: NSWReportClientProps) {
  const { toast } = useToast();
  const { organization } = useOrganization();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  
  // Report parameters — default to the current NSW financial year window
  // (1 July → 30 June) since that's what DCCEEW submissions are filed against.
  const [startDate, setStartDate] = useState<Date>(() => currentNswFinancialYear().start);
  const [endDate, setEndDate] = useState<Date>(() => currentNswFinancialYear().end);
  const [orgName, setOrgName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Pre-populate organization data when component mounts
  useEffect(() => {
    if (organization) {
      // Set organization name
      setOrgName(organization.name || '');
      
      // Try to get license number from public metadata if available
      const publicMetadata = organization.publicMetadata as any;
      if (publicMetadata?.licenseNumber) {
        setLicenseNumber(publicMetadata.licenseNumber);
      }
      
      // Pre-populate contact info from user if available
      if (user) {
        const fullName = user.fullName || 
                        `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
                        user.username || '';
        setContactName(fullName);
        
        // Set primary email
        const primaryEmail = user.primaryEmailAddress?.emailAddress || '';
        setContactEmail(primaryEmail);
        
        // Try to get phone from user metadata if available
        const userMetadata = user.publicMetadata as any;
        if (userMetadata?.phoneNumber) {
          setContactPhone(userMetadata.phoneNumber);
        } else if (user.primaryPhoneNumber?.phoneNumber) {
          setContactPhone(user.primaryPhoneNumber.phoneNumber);
        }
      }
    }
  }, [organization, user]);

  // Calculate report statistics
  const filteredAnimals = initialAnimals.filter(animal => {
    const dateFound = new Date(animal.dateFound);
    return dateFound >= startDate && dateFound <= endDate;
  });

  const transferredAnimals = filteredAnimals.filter(animal => 
    animal.status === 'TRANSFERRED' || 
    animal.fate === 'Transferred to other wildlife rehabilitation organisation'
  );

  const permanentCareAnimals = filteredAnimals.filter(animal => {
    const outcome = animal.outcome || '';
    return outcome.includes('Permanent care') || 
           outcome.includes('companion') || 
           outcome.includes('education') || 
           outcome.includes('research');
  });

  // Form validation state
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    // Organization validation
    if (!orgName || orgName.trim().length < 2) {
      newErrors.orgName = "Organization name is required (min 2 characters)";
    }
    
    if (!licenseNumber || !licenseNumber.match(/^[A-Z0-9]{6,}$/i)) {
      newErrors.licenseNumber = "Valid license number is required (min 6 alphanumeric characters)";
    }
    
    if (!contactName || contactName.trim().length < 2) {
      newErrors.contactName = "Contact name is required (min 2 characters)";
    }
    
    if (!contactEmail || !contactEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.contactEmail = "Valid email address is required";
    }
    
    if (contactPhone && (!contactPhone.match(/^[\d\s\-\+\(\)]+$/) || contactPhone.length < 8)) {
      newErrors.contactPhone = "Valid phone number format required";
    }
    
    // Date validation
    if (!startDate) {
      newErrors.startDate = "Start date is required";
    }
    
    if (!endDate) {
      newErrors.endDate = "End date is required";
    }
    
    if (startDate && endDate && startDate >= endDate) {
      newErrors.dateRange = "End date must be after start date";
    }
    
    // End date must land within or before the current NSW financial year end
    // (30 June); anything later is data that hasn't happened yet.
    const { end: currentFyEnd } = currentNswFinancialYear();
    if (endDate && endDate > currentFyEnd) {
      newErrors.endDate = "End date cannot be beyond the current NSW financial year (30 June).";
    }

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      // Show first error in toast
      const firstError = Object.values(newErrors)[0];
      toast({
        title: "Validation Error",
        description: firstError,
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };

  const generateDetailedReport = async () => {
    setErrors({});
    if (!validateForm()) return;

    setLoading(true);
    try {
      const rehabilitatorsByCarerId: Record<string, string> = {};
      for (const c of initialCarers) {
        rehabilitatorsByCarerId[c.id] = c.name;
      }

      const reportData: NSWDetailedReportData = {
        reportingPeriod: { startDate, endDate },
        organization: {
          name: orgName,
          licenseNumber,
          contactName,
        },
        animals: filteredAnimals,
        rehabilitatorsByCarerId,
      };

      const generator = new NSWDetailedReportGenerator(reportData);
      const buffer = await generator.getReportBuffer();

      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `NSW_Wildlife_Detailed_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Detailed Report Generated',
        description: `Datasheet contains ${filteredAnimals.length} encounter rows.`,
      });
    } catch (error) {
      console.error('Error generating detailed report:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to generate detailed report. Please try again.';
      toast({
        title: 'Error Generating Detailed Report',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    // Clear previous errors
    setErrors({});
    
    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      // Prepare transfer records using available animal data
      const transfers: TransferRecord[] = transferredAnimals.map((animal: any) => ({
        animalId: animal.id,
        species: animal.species,
        markBandMicrochip: [animal.tagBandColourNumber, animal.microchipNumber]
          .filter(Boolean)
          .join(' / '),
        dateOfTransfer: animal.outcomeDate || new Date(),
        reasonForTransfer: animal.notes || 'Care transfer',
        recipientName: '', // Would need transfer tracking table
        recipientLicense: '', // Would need transfer tracking table
        recipientAnimalId: '', // Would need transfer tracking table
        recipientAddress: '', // Would need transfer tracking table
        recipientSuburb: '', // Would need transfer tracking table
        recipientPostcode: '', // Would need transfer tracking table
      }));

      // Prepare permanent care records
      const permanentCare: PermanentCareRecord[] = permanentCareAnimals.map(animal => ({
        animalId: animal.id,
        species: animal.species,
        markBandMicrochip: [animal.tagBandColourNumber, animal.microchipNumber]
          .filter(Boolean)
          .join(' / '),
        facilityName: '', // Would need to be tracked
        licenseNumber: '', // Would need to be tracked
        address: '', // Would need to be tracked
        suburb: '', // Would need to be tracked
        postcode: '', // Would need to be tracked
        npwsApprovalDate: new Date(), // Would need to be tracked
        approvalNumber: '', // Would need to be tracked
        category: 'Education' as const, // Would need to be tracked
        status: animal.status === 'DECEASED' ? 'Dead' as const : 'Alive' as const,
      }));

      // Prepare report data
      const reportData: NSWReportData = {
        reportingPeriod: {
          startDate,
          endDate
        },
        organization: {
          name: orgName,
          licenseNumber,
          contactName,
          contactEmail,
          contactPhone
        },
        animals: filteredAnimals,
        carers: initialCarers,
        transfers,
        permanentCare,
        preservedSpecimens: [] // Would need to be tracked separately
      };

      // Generate report
      const generator = new NSWReportGenerator(reportData);
      const buffer = await generator.getReportBuffer();
      
      // Create download link
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `NSW_Wildlife_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Report Generated",
        description: "Your NSW compliance report has been downloaded.",
      });
    } catch (error) {
      console.error('Error generating report:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate report. Please try again.";
      toast({
        title: "Error Generating Report",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <Link href="/compliance">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Compliance
          </Button>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold">NSW Annual Report Generator</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Parameters</CardTitle>
          <CardDescription>
            Configure the reporting period and organization details for the NSW Wildlife Rehabilitation Combined Report
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Error Summary */}
          {Object.keys(errors).length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <h4 className="font-semibold text-red-900">Please correct the following errors:</h4>
              </div>
              <ul className="mt-2 list-disc list-inside space-y-1">
                {Object.entries(errors).map(([key, error]) => (
                  <li key={key} className="text-sm text-red-700">{error}</li>
                ))}
              </ul>
            </div>
          )}
          {/* Reporting Period */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className={errors.startDate ? "text-red-500" : ""}>Start Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground",
                      errors.startDate && "border-red-500"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      if (date) {
                        setStartDate(date);
                        if (errors.startDate) setErrors({...errors, startDate: ""});
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.startDate && <p className="text-sm text-red-500">{errors.startDate}</p>}
            </div>

            <div className="space-y-2">
              <Label className={errors.endDate || errors.dateRange ? "text-red-500" : ""}>End Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground",
                      (errors.endDate || errors.dateRange) && "border-red-500"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => {
                      if (date) {
                        setEndDate(date);
                        if (errors.endDate) setErrors({...errors, endDate: "", dateRange: ""});
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.endDate && <p className="text-sm text-red-500">{errors.endDate}</p>}
              {errors.dateRange && <p className="text-sm text-red-500">{errors.dateRange}</p>}
            </div>
          </div>

          {/* Organization Details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Organization Details</h3>
              {organization && (
                <span className="text-sm text-muted-foreground">
                  Auto-filled from organization profile
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="org-name" className={errors.orgName ? "text-red-500" : ""}>
                  Organization Name *
                </Label>
                <Input
                  id="org-name"
                  value={orgName}
                  onChange={(e) => {
                    setOrgName(e.target.value);
                    if (errors.orgName) setErrors({...errors, orgName: ""});
                  }}
                  placeholder={!organization ? "Loading..." : "e.g., Wildlife Rescue NSW"}
                  className={errors.orgName ? "border-red-500" : ""}
                  required
                />
                {errors.orgName && <p className="text-sm text-red-500">{errors.orgName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="license" className={errors.licenseNumber ? "text-red-500" : ""}>
                  License Number *
                </Label>
                <Input
                  id="license"
                  value={licenseNumber}
                  onChange={(e) => {
                    setLicenseNumber(e.target.value);
                    if (errors.licenseNumber) setErrors({...errors, licenseNumber: ""});
                  }}
                  placeholder="e.g., MWL000100088"
                  className={errors.licenseNumber ? "border-red-500" : ""}
                  required
                />
                {errors.licenseNumber && <p className="text-sm text-red-500">{errors.licenseNumber}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-name" className={errors.contactName ? "text-red-500" : ""}>
                  Contact Name * {user && <span className="text-xs font-normal text-muted-foreground">(from your profile)</span>}
                </Label>
                <Input
                  id="contact-name"
                  value={contactName}
                  onChange={(e) => {
                    setContactName(e.target.value);
                    if (errors.contactName) setErrors({...errors, contactName: ""});
                  }}
                  placeholder={!user ? "Loading..." : "e.g., John Smith"}
                  className={errors.contactName ? "border-red-500" : ""}
                  required
                />
                {errors.contactName && <p className="text-sm text-red-500">{errors.contactName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email" className={errors.contactEmail ? "text-red-500" : ""}>
                  Contact Email * {user && <span className="text-xs font-normal text-muted-foreground">(from your profile)</span>}
                </Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => {
                    setContactEmail(e.target.value);
                    if (errors.contactEmail) setErrors({...errors, contactEmail: ""});
                  }}
                  placeholder={!user ? "Loading..." : "e.g., contact@wildlife.org.au"}
                  className={errors.contactEmail ? "border-red-500" : ""}
                  required
                />
                {errors.contactEmail && <p className="text-sm text-red-500">{errors.contactEmail}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-phone" className={errors.contactPhone ? "text-red-500" : ""}>
                  Contact Phone
                </Label>
                <Input
                  id="contact-phone"
                  value={contactPhone}
                  onChange={(e) => {
                    setContactPhone(e.target.value);
                    if (errors.contactPhone) setErrors({...errors, contactPhone: ""});
                  }}
                  placeholder="e.g., 02 1234 5678"
                  className={errors.contactPhone ? "border-red-500" : ""}
                />
                {errors.contactPhone && <p className="text-sm text-red-500">{errors.contactPhone}</p>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Report Preview</CardTitle>
          <CardDescription>
            Summary of data to be included in the report for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Animals</p>
              <p className="text-2xl font-bold">{filteredAnimals.length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Transferred</p>
              <p className="text-2xl font-bold">{transferredAnimals.length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Permanent Care</p>
              <p className="text-2xl font-bold">{permanentCareAnimals.length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Active Carers</p>
              <p className="text-2xl font-bold">{initialCarers.filter(c => c.active).length}</p>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              {filteredAnimals.length === 0 ? (
                <>
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span>This will be submitted as a Nil Return (no animals in the selected period)</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Report contains data for {filteredAnimals.length} animals</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generate Buttons */}
      <div className="flex flex-col sm:flex-row justify-end gap-3">
        <Button
          size="lg"
          variant="outline"
          onClick={generateDetailedReport}
          disabled={loading}
        >
          <FileSpreadsheet className="mr-2 h-5 w-5" />
          {loading ? 'Generating...' : 'Generate NSW Detailed Report'}
        </Button>
        <Button
          size="lg"
          onClick={generateReport}
          disabled={loading}
        >
          <FileSpreadsheet className="mr-2 h-5 w-5" />
          {loading ? 'Generating...' : 'Generate NSW Combined Report'}
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Report Information</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 space-y-2">
          <p>NSW DCCEEW requires two workbooks submitted together each financial year. This page generates both.</p>
          <p className="mt-2"><strong>Detailed Report</strong> — one row per animal encounter on the Datasheet tab, plus reference tabs:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Datasheet (encounter records)</li>
            <li>Species list, Encounter type, Animal condition, Fate (reference picklists)</li>
            <li>Reference data (Sex, Life stage, Pouch condition, Weight unit)</li>
          </ul>
          <p className="mt-2"><strong>Combined Report</strong> — organisation-level registers:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Transferred Animal Register</li>
            <li>Permanent Care Register</li>
            <li>Preserved Specimen Register</li>
            <li>Register of Members</li>
            <li>Nil Return declaration (if applicable)</li>
          </ul>
          <p className="mt-4">
            <strong>Note:</strong> Some fields may be empty if the corresponding data has not been entered in the system.
            Reconcile species, suburb/postcode, encounter type, animal condition and fate picklists against the latest NSW template (drop-downs live in the official XLSX).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}