/**
 * Growth calculator utility functions.
 *
 * Used by both API routes and client components for:
 * - Linear interpolation between reference data points
 * - Birth date estimation from measurements
 * - Weight-for-age (WFA) calculation
 */

export interface GrowthReferencePoint {
  ageDays: number;
  weightGrams: number | null;
  headLengthMm: number | null;
  earLengthMm: number | null;
  armLengthMm: number | null;
  legLengthMm: number | null;
  footLengthMm: number | null;
  tailLengthMm: number | null;
  bodyLengthMm: number | null;
  wingLengthMm: number | null;
}

export type MeasurementField =
  | 'weightGrams'
  | 'headLengthMm'
  | 'earLengthMm'
  | 'armLengthMm'
  | 'legLengthMm'
  | 'footLengthMm'
  | 'tailLengthMm'
  | 'bodyLengthMm'
  | 'wingLengthMm';

export const MEASUREMENT_LABELS: Record<MeasurementField, string> = {
  weightGrams: 'Weight (g)',
  headLengthMm: 'Head Length (mm)',
  earLengthMm: 'Ear Length (mm)',
  armLengthMm: 'Arm/Forearm (mm)',
  legLengthMm: 'Leg Length (mm)',
  footLengthMm: 'Foot Length (mm)',
  tailLengthMm: 'Tail Length (mm)',
  bodyLengthMm: 'Body Length (mm)',
  wingLengthMm: 'Wing Length (mm)',
};

/**
 * Interpolate age in days from a single measurement value, given sorted
 * reference data. Returns null if the measurement is outside the reference
 * range or no data exists for that field.
 */
export function interpolateAge(
  referenceData: GrowthReferencePoint[],
  field: MeasurementField,
  value: number
): number | null {
  // Filter to points that have data for this field
  const points = referenceData
    .filter((p) => p[field] != null)
    .sort((a, b) => a.ageDays - b.ageDays);

  if (points.length < 2) return null;

  const values = points.map((p) => p[field] as number);

  // Check if value is below the smallest reference point
  if (value <= values[0]) return points[0].ageDays;

  // Check if value is above the largest reference point
  if (value >= values[values.length - 1]) return points[points.length - 1].ageDays;

  // Find the two bracketing points and interpolate
  for (let i = 0; i < points.length - 1; i++) {
    const v1 = values[i];
    const v2 = values[i + 1];
    if (value >= v1 && value <= v2) {
      const fraction = (value - v1) / (v2 - v1);
      const age1 = points[i].ageDays;
      const age2 = points[i + 1].ageDays;
      return Math.round(age1 + fraction * (age2 - age1));
    }
  }

  return null;
}

/**
 * Calculate the predicted weight for a given age in days by interpolating
 * the reference data. Returns null if age is outside the reference range.
 */
export function calculatePredictedWeight(
  referenceData: GrowthReferencePoint[],
  ageDays: number
): number | null {
  return interpolateValue(referenceData, 'weightGrams', ageDays);
}

/**
 * Interpolate any measurement value for a given age in days.
 */
export function interpolateValue(
  referenceData: GrowthReferencePoint[],
  field: MeasurementField,
  ageDays: number
): number | null {
  const points = referenceData
    .filter((p) => p[field] != null)
    .sort((a, b) => a.ageDays - b.ageDays);

  if (points.length < 2) return null;

  if (ageDays <= points[0].ageDays) return points[0][field] as number;
  if (ageDays >= points[points.length - 1].ageDays)
    return points[points.length - 1][field] as number;

  for (let i = 0; i < points.length - 1; i++) {
    const age1 = points[i].ageDays;
    const age2 = points[i + 1].ageDays;
    if (ageDays >= age1 && ageDays <= age2) {
      const fraction = (ageDays - age1) / (age2 - age1);
      const v1 = points[i][field] as number;
      const v2 = points[i + 1][field] as number;
      return Math.round((v1 + fraction * (v2 - v1)) * 10) / 10;
    }
  }

  return null;
}

/**
 * Calculate Weight For Age: the difference between actual weight and
 * predicted weight at the animal's age in days. Positive = above predicted.
 */
export function calculateWFA(
  referenceData: GrowthReferencePoint[],
  ageDays: number,
  actualWeightGrams: number
): number | null {
  const predicted = calculatePredictedWeight(referenceData, ageDays);
  if (predicted == null) return null;
  return Math.round(actualWeightGrams - predicted);
}

export interface BirthDateEstimate {
  field: MeasurementField;
  label: string;
  value: number;
  estimatedAgeDays: number;
  estimatedBirthDate: Date;
}

export interface BirthDateEstimationResult {
  estimates: BirthDateEstimate[];
  medianEstimatedBirthDate: Date | null;
  medianEstimatedAgeDays: number | null;
}

/**
 * Estimate birth date from one or more measurements taken on a given date.
 * Each measurement independently estimates an age, then we take the median.
 */
export function estimateBirthDate(
  referenceData: GrowthReferencePoint[],
  measurements: Partial<Record<MeasurementField, number>>,
  measurementDate: Date
): BirthDateEstimationResult {
  const estimates: BirthDateEstimate[] = [];

  for (const [field, value] of Object.entries(measurements)) {
    if (value == null || value <= 0) continue;
    const mField = field as MeasurementField;
    const ageDays = interpolateAge(referenceData, mField, value);
    if (ageDays == null) continue;

    const estimatedBirthDate = new Date(measurementDate);
    estimatedBirthDate.setDate(estimatedBirthDate.getDate() - ageDays);

    estimates.push({
      field: mField,
      label: MEASUREMENT_LABELS[mField],
      value,
      estimatedAgeDays: ageDays,
      estimatedBirthDate,
    });
  }

  if (estimates.length === 0) {
    return { estimates, medianEstimatedBirthDate: null, medianEstimatedAgeDays: null };
  }

  // Take median of estimated ages
  const sortedAges = estimates.map((e) => e.estimatedAgeDays).sort((a, b) => a - b);
  const mid = Math.floor(sortedAges.length / 2);
  const medianAge =
    sortedAges.length % 2 === 0
      ? Math.round((sortedAges[mid - 1] + sortedAges[mid]) / 2)
      : sortedAges[mid];

  const medianBirthDate = new Date(measurementDate);
  medianBirthDate.setDate(medianBirthDate.getDate() - medianAge);

  return {
    estimates,
    medianEstimatedBirthDate: medianBirthDate,
    medianEstimatedAgeDays: medianAge,
  };
}

/**
 * Returns which measurement fields are relevant for a species based on its
 * subtype. Flying foxes use arm/wing; macropods use foot/tail/body.
 */
export function getRelevantFields(speciesSubtype?: string | null): MeasurementField[] {
  const base: MeasurementField[] = ['weightGrams'];

  if (speciesSubtype === 'Bat') {
    return [...base, 'armLengthMm', 'wingLengthMm'];
  }

  // Macropods and possums - body measurements
  return [
    ...base,
    'headLengthMm',
    'earLengthMm',
    'armLengthMm',
    'legLengthMm',
    'footLengthMm',
    'tailLengthMm',
    'bodyLengthMm',
  ];
}

/**
 * Determine WFA status for color coding.
 * Returns 'normal', 'warning', or 'danger'.
 */
export function getWFAStatus(
  wfa: number,
  predictedWeight: number
): 'normal' | 'warning' | 'danger' {
  if (predictedWeight <= 0) return 'normal';
  const percentBelow = (-wfa / predictedWeight) * 100;
  if (percentBelow > 20) return 'danger';
  if (percentBelow > 10) return 'warning';
  return 'normal';
}
