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
import { ArrowLeft, Save, MapPin, Calendar, CheckCircle } from "lucide-react";
import Link from "next/link";
import { getAnimals } from '@/lib/data-store';
import { Animal } from '@/lib/types';
import { getCurrentJurisdiction } from '@/lib/config';
import { getJurisdictionComplianceConfig, isFormRequired } from '@/lib/compliance-rules';
import { LocationPicker } from '@/components/location-picker';

export default function NewReleaseChecklistPage() {
  const router = useRouter();
  const jurisdiction = getCurrentJurisdiction();
  const complianceConfig = getJurisdictionComplianceConfig(jurisdiction);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state with validation
  const [selectedAnimalId, setSelectedAnimalId] = useState<string>('');
  const [releaseDate, setReleaseDate] = useState<string>('');
  const [releaseLocation, setReleaseLocation] = useState<{
    lat: number;
    lng: number;
    address: string;
  } | null>(null);
  const [within10km, setWithin10km] = useState<boolean>(false);
  const [fitnessIndicators, setFitnessIndicators] = useState<string[]>([]);
  const [releaseType, setReleaseType] = useState<'Hard' | 'Soft' | 'Passive'>('Hard');
  const [vetSignOff, setVetSignOff] = useState<{
    name: string;
    signature: string;
    date: string;
  }>({
    name: '',
    signature: '',
    date: ''
  });
  const [notes, setNotes] = useState<string>('');

  // Validation errors
  const [errors, setErrors] = useState<{
    selectedAnimalId?: string;
    releaseDate?: string;
    releaseLocation?: string;
    fitnessIndicators?: string;
    vetSignOff?: {
      name?: string;
      signature?: string;
      date?: string;
    };
  }>({});

  useEffect(() => {
    const loadAnimals = async () => {
      try {
        const animalsData = await getAnimals();
        // Filter for animals that are in care and suitable for release
        const availableAnimals = animalsData.filter(animal => 
          animal.status === 'In Care' && 
          animal.species && 
          animal.name
        );
        setAnimals(availableAnimals);
      } catch (error) {
        console.error('Error loading animals:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnimals();
  }, []);

  const fitnessOptions = [
    'Good body condition',
    'Normal behavior',
    'Adequate weight',
    'No visible injuries',
    'Proper feeding response',
    'Good mobility',
    'Normal social behavior',
    'Appropriate fear response'
  ];

  const handleFitnessToggle = (indicator: string) => {
    setFitnessIndicators(prev => 
      prev.includes(indicator) 
        ? prev.filter(i => i !== indicator)
        : [...prev, indicator]
    );
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!selectedAnimalId) {
      newErrors.selectedAnimalId = 'Please select an animal';
    }

    if (!releaseDate) {
      newErrors.releaseDate = 'Release date is required';
    }

    if (!releaseLocation) {
      newErrors.releaseLocation = 'Release location is required';
    }

    if (fitnessIndicators.length === 0) {
      newErrors.fitnessIndicators = 'At least one fitness indicator must be selected';
    }

    if (complianceConfig.vetRequirements.signOffRequired) {
      if (!vetSignOff.name) {
        newErrors.vetSignOff = { ...newErrors.vetSignOff, name: 'Veterinarian name is required' };
      }
      if (!vetSignOff.signature) {
        newErrors.vetSignOff = { ...newErrors.vetSignOff, signature: 'Signature is required' };
      }
      if (!vetSignOff.date) {
        newErrors.vetSignOff = { ...newErrors.vetSignOff, date: 'Date is required' };
      }
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
      const releaseChecklist = {
        id: Date.now().toString(),
        animalId: selectedAnimalId,
        releaseDate,
        releaseLocation: releaseLocation!.address,
        releaseCoordinates: {
          lat: releaseLocation!.lat,
          lng: releaseLocation!.lng
        },
        within10km,
        fitnessIndicators,
        releaseType,
        vetSignOff: complianceConfig.vetRequirements.signOffRequired ? vetSignOff : null,
        notes,
        createdAt: new Date().toISOString()
      };

      console.log('Saving release checklist:', releaseChecklist);
      
      // TODO: Implement actual save to data store
      // await saveReleaseChecklist(releaseChecklist);
      
      // Redirect to the release checklist list
      router.push('/compliance/release-checklist');
    } catch (error) {
      console.error('Error saving release checklist:', error);
      alert('Error saving release checklist');
    } finally {
      setSaving(false);
    }
  };

  const selectedAnimal = animals.find(animal => animal.id === selectedAnimalId);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading animals...</div>
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
            <Link href="/compliance/release-checklist">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Release Checklists
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">New Release Checklist</h1>
            <p className="text-muted-foreground">
              Create a new release checklist for {jurisdiction}
            </p>
          </div>
        </div>
        <Badge variant="outline">
          {jurisdiction} Jurisdiction
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Animal Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Animal Selection
            </CardTitle>
            <CardDescription>
              Select the animal to be released
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="animal">Animal *</Label>
              <Select value={selectedAnimalId} onValueChange={setSelectedAnimalId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an animal" />
                </SelectTrigger>
                <SelectContent>
                  {animals.map(animal => (
                    <SelectItem key={animal.id} value={animal.id}>
                      {animal.name} ({animal.species})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.selectedAnimalId && (
                <p className="text-sm text-red-600">{errors.selectedAnimalId}</p>
              )}
            </div>

            {selectedAnimal && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Selected Animal Details</h4>
                <div className="space-y-1 text-sm">
                  <div><strong>Name:</strong> {selectedAnimal.name}</div>
                  <div><strong>Species:</strong> {selectedAnimal.species}</div>
                  <div><strong>Date Found:</strong> {selectedAnimal.dateFound}</div>
                  <div><strong>Carer:</strong> {selectedAnimal.carer}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Release Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Release Details
            </CardTitle>
            <CardDescription>
              Information about the release location and date
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="releaseDate">Release Date *</Label>
              <Input
                id="releaseDate"
                type="date"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
              />
              {errors.releaseDate && (
                <p className="text-sm text-red-600">{errors.releaseDate}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Release Location *</Label>
              <LocationPicker
                onLocationChange={setReleaseLocation}
                initialLocation={releaseLocation || undefined}
              />
              {errors.releaseLocation && (
                <p className="text-sm text-red-600">{errors.releaseLocation}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="releaseType">Release Type</Label>
              <Select value={releaseType} onValueChange={(value: 'Hard' | 'Soft' | 'Passive') => setReleaseType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hard">Hard Release</SelectItem>
                  <SelectItem value="Soft">Soft Release</SelectItem>
                  <SelectItem value="Passive">Passive Release</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {complianceConfig.distanceRequirements.enforced && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="within10km"
                  checked={within10km}
                  onCheckedChange={(checked) => setWithin10km(checked as boolean)}
                />
                <Label htmlFor="within10km">
                  Release site is at least {complianceConfig.distanceRequirements.releaseDistance}km from capture location
                </Label>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fitness Assessment */}
        <Card>
          <CardHeader>
            <CardTitle>Fitness Assessment</CardTitle>
            <CardDescription>
              Check all fitness indicators that apply
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {fitnessOptions.map(option => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={option}
                  checked={fitnessIndicators.includes(option)}
                  onCheckedChange={() => handleFitnessToggle(option)}
                />
                <Label htmlFor={option} className="text-sm">{option}</Label>
              </div>
            ))}
            {errors.fitnessIndicators && (
              <p className="text-sm text-red-600">{errors.fitnessIndicators}</p>
            )}
          </CardContent>
        </Card>

        {/* Veterinary Sign-off */}
        {complianceConfig.vetRequirements.signOffRequired && (
          <Card>
            <CardHeader>
              <CardTitle>Veterinary Sign-off</CardTitle>
              <CardDescription>
                Required for {jurisdiction} releases
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vetName">Veterinarian Name *</Label>
                <Input
                  id="vetName"
                  placeholder="Enter veterinarian name"
                  value={vetSignOff.name}
                  onChange={(e) => setVetSignOff(prev => ({ ...prev, name: e.target.value }))}
                />
                {errors.vetSignOff?.name && (
                  <p className="text-sm text-red-600">{errors.vetSignOff.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="vetSignature">Signature *</Label>
                <Input
                  id="vetSignature"
                  placeholder="Enter signature or initials"
                  value={vetSignOff.signature}
                  onChange={(e) => setVetSignOff(prev => ({ ...prev, signature: e.target.value }))}
                />
                {errors.vetSignOff?.signature && (
                  <p className="text-sm text-red-600">{errors.vetSignOff.signature}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="vetDate">Date *</Label>
                <Input
                  id="vetDate"
                  type="date"
                  value={vetSignOff.date}
                  onChange={(e) => setVetSignOff(prev => ({ ...prev, date: e.target.value }))}
                />
                {errors.vetSignOff?.date && (
                  <p className="text-sm text-red-600">{errors.vetSignOff.date}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
            <CardDescription>
              Any additional information about the release
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Enter any additional notes..."
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
          <Link href="/compliance/release-checklist">
            Cancel
          </Link>
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Release Checklist'}
        </Button>
      </div>
    </div>
  );
} 