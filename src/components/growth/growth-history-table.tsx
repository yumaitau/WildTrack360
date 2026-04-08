"use client";

import { useMemo } from "react";
import { format, differenceInDays } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  type GrowthReferencePoint,
  calculatePredictedWeight,
  getWFAStatus,
} from "@/lib/growth-utils";
import type { GrowthMeasurement } from "@prisma/client";

interface GrowthHistoryTableProps {
  measurements: GrowthMeasurement[];
  referenceData: GrowthReferencePoint[];
  dateOfBirth: Date | null;
  onDelete: (measurementId: string) => void;
}

const wfaColors = {
  normal: "text-green-700 dark:text-green-400",
  warning: "text-amber-700 dark:text-amber-400",
  danger: "text-red-700 dark:text-red-400",
};

export function GrowthHistoryTable({
  measurements,
  referenceData,
  dateOfBirth,
  onDelete,
}: GrowthHistoryTableProps) {
  const rows = useMemo(() => {
    return measurements.map((m) => {
      const dob = dateOfBirth ? new Date(dateOfBirth) : null;
      const ageDays = dob ? differenceInDays(new Date(m.date), dob) : null;
      const predicted =
        ageDays != null ? calculatePredictedWeight(referenceData, ageDays) : null;
      const wfa =
        m.weightGrams != null && predicted != null
          ? Math.round(m.weightGrams - predicted)
          : null;
      const wfaStatus =
        wfa != null && predicted != null ? getWFAStatus(wfa, predicted) : "normal";

      return { ...m, ageDays, predicted, wfa, wfaStatus };
    });
  }, [measurements, referenceData, dateOfBirth]);

  if (measurements.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No growth measurements recorded yet.
      </p>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Age</TableHead>
            <TableHead className="text-right">Weight (g)</TableHead>
            <TableHead className="text-right">WFA</TableHead>
            <TableHead className="text-right">Foot (mm)</TableHead>
            <TableHead className="text-right">Arm (mm)</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="whitespace-nowrap">
                {format(new Date(row.date), "dd MMM yyyy")}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {row.ageDays != null ? `${row.ageDays}d` : "—"}
              </TableCell>
              <TableCell className="text-right">
                {row.weightGrams != null ? Math.round(row.weightGrams) : "—"}
              </TableCell>
              <TableCell className={`text-right font-medium ${wfaColors[row.wfaStatus as keyof typeof wfaColors]}`}>
                {row.wfa != null
                  ? `${row.wfa > 0 ? "+" : ""}${row.wfa}g`
                  : "—"}
              </TableCell>
              <TableCell className="text-right">
                {row.footLengthMm ?? "—"}
              </TableCell>
              <TableCell className="text-right">
                {row.armLengthMm ?? "—"}
              </TableCell>
              <TableCell className="max-w-[200px] truncate">
                {row.notes || "—"}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onDelete(row.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
