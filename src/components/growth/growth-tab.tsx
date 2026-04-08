"use client";

import { useState, useCallback, useEffect } from "react";
import { GrowthMeasurementForm } from "./growth-measurement-form";
import { GrowthChart } from "./growth-chart";
import { GrowthHistoryTable } from "./growth-history-table";
import { BirthDateEstimator } from "./birth-date-estimator";
import type { GrowthReferencePoint } from "@/lib/growth-utils";
import type { GrowthMeasurement } from "@prisma/client";
import type { Animal } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface GrowthTabProps {
  animal: Animal;
  initialMeasurements: GrowthMeasurement[];
  speciesSubtype?: string | null;
  onAnimalUpdate?: (updated: Animal) => void;
}

export function GrowthTab({
  animal,
  initialMeasurements,
  speciesSubtype,
  onAnimalUpdate,
}: GrowthTabProps) {
  const [measurements, setMeasurements] =
    useState<GrowthMeasurement[]>(initialMeasurements);
  const [referenceData, setReferenceData] = useState<GrowthReferencePoint[]>([]);
  const [hasReferenceData, setHasReferenceData] = useState(false);
  const { toast } = useToast();

  // Fetch reference data for this species
  useEffect(() => {
    async function fetchReferenceData() {
      if (!animal.species) return;
      try {
        const sex = animal.sex || "Female";
        const res = await fetch(
          `/api/growth-references?speciesName=${encodeURIComponent(animal.species)}&sex=${encodeURIComponent(sex)}`
        );
        if (res.ok) {
          const data = await res.json();
          setReferenceData(data);
          setHasReferenceData(data.length > 0);
        }
      } catch {
        // Silently fail - reference data is optional
      }
    }
    fetchReferenceData();
  }, [animal.species, animal.sex]);

  const refreshMeasurements = useCallback(async () => {
    try {
      const res = await fetch(`/api/animals/${animal.id}/growth`);
      if (res.ok) {
        const data = await res.json();
        setMeasurements(data);
      }
    } catch {
      // Silent fail
    }
  }, [animal.id]);

  const handleDelete = useCallback(
    async (measurementId: string) => {
      try {
        const res = await fetch(
          `/api/animals/${animal.id}/growth/${measurementId}`,
          { method: "DELETE" }
        );
        if (!res.ok) throw new Error();
        setMeasurements((prev) => prev.filter((m) => m.id !== measurementId));
        toast({ title: "Deleted", description: "Measurement removed." });
      } catch {
        toast({
          title: "Error",
          description: "Failed to delete measurement.",
          variant: "destructive",
        });
      }
    },
    [animal.id, toast]
  );

  const dateOfBirth = animal.dateOfBirth ? new Date(animal.dateOfBirth) : null;

  return (
    <div className="space-y-6">
      {/* Birth date estimator - shown when DOB is unknown and species has reference data */}
      {!dateOfBirth && hasReferenceData && (
        <BirthDateEstimator
          animal={animal}
          referenceData={referenceData}
          onBirthDateSet={onAnimalUpdate}
        />
      )}

      {/* Growth chart */}
      <GrowthChart
        measurements={measurements}
        referenceData={referenceData}
        dateOfBirth={dateOfBirth}
      />

      {/* Growth history table */}
      <GrowthHistoryTable
        measurements={measurements}
        referenceData={referenceData}
        dateOfBirth={dateOfBirth}
        onDelete={handleDelete}
      />

      {/* Add measurement form */}
      <GrowthMeasurementForm
        animalId={animal.id}
        speciesSubtype={speciesSubtype}
        onMeasurementAdd={refreshMeasurements}
      />
    </div>
  );
}
