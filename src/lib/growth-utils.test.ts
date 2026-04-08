import { describe, it, expect } from 'vitest';
import {
  interpolateAge,
  calculatePredictedWeight,
  calculateWFA,
  estimateBirthDate,
  getWFAStatus,
  getRelevantFields,
  type GrowthReferencePoint,
} from './growth-utils';

// Minimal reference data for testing (Eastern Grey Kangaroo-like)
const referenceData: GrowthReferencePoint[] = [
  { ageDays: 0, weightGrams: 1, headLengthMm: null, earLengthMm: null, armLengthMm: null, legLengthMm: null, footLengthMm: 0, tailLengthMm: null, bodyLengthMm: null, wingLengthMm: null },
  { ageDays: 100, weightGrams: 100, headLengthMm: null, earLengthMm: null, armLengthMm: null, legLengthMm: null, footLengthMm: 22, tailLengthMm: null, bodyLengthMm: null, wingLengthMm: null },
  { ageDays: 200, weightGrams: 720, headLengthMm: null, earLengthMm: null, armLengthMm: null, legLengthMm: null, footLengthMm: 88, tailLengthMm: null, bodyLengthMm: null, wingLengthMm: null },
  { ageDays: 300, weightGrams: 3100, headLengthMm: null, earLengthMm: null, armLengthMm: null, legLengthMm: null, footLengthMm: 180, tailLengthMm: null, bodyLengthMm: null, wingLengthMm: null },
  { ageDays: 400, weightGrams: 6500, headLengthMm: null, earLengthMm: null, armLengthMm: null, legLengthMm: null, footLengthMm: 255, tailLengthMm: null, bodyLengthMm: null, wingLengthMm: null },
];

// Flying fox reference with arm length
const flyingFoxRef: GrowthReferencePoint[] = [
  { ageDays: 0, weightGrams: 25, headLengthMm: null, earLengthMm: null, armLengthMm: 55, legLengthMm: null, footLengthMm: null, tailLengthMm: null, bodyLengthMm: null, wingLengthMm: null },
  { ageDays: 30, weightGrams: 100, headLengthMm: null, earLengthMm: null, armLengthMm: 83, legLengthMm: null, footLengthMm: null, tailLengthMm: null, bodyLengthMm: null, wingLengthMm: null },
  { ageDays: 60, weightGrams: 220, headLengthMm: null, earLengthMm: null, armLengthMm: 112, legLengthMm: null, footLengthMm: null, tailLengthMm: null, bodyLengthMm: null, wingLengthMm: null },
  { ageDays: 120, weightGrams: 440, headLengthMm: null, earLengthMm: null, armLengthMm: 150, legLengthMm: null, footLengthMm: null, tailLengthMm: null, bodyLengthMm: null, wingLengthMm: null },
];

describe('interpolateAge', () => {
  it('returns exact age when measurement matches a reference point', () => {
    const age = interpolateAge(referenceData, 'weightGrams', 100);
    expect(age).toBe(100);
  });

  it('interpolates between two reference points', () => {
    // 410 is halfway between 100 (age 100) and 720 (age 200)
    const age = interpolateAge(referenceData, 'weightGrams', 410);
    expect(age).toBe(150);
  });

  it('returns first age when measurement is at or below minimum', () => {
    const age = interpolateAge(referenceData, 'weightGrams', 0.5);
    expect(age).toBe(0);
  });

  it('returns last age when measurement is at or above maximum', () => {
    const age = interpolateAge(referenceData, 'weightGrams', 9999);
    expect(age).toBe(400);
  });

  it('returns null when fewer than 2 data points exist for the field', () => {
    const sparse: GrowthReferencePoint[] = [
      { ageDays: 0, weightGrams: 1, headLengthMm: null, earLengthMm: null, armLengthMm: null, legLengthMm: null, footLengthMm: null, tailLengthMm: null, bodyLengthMm: null, wingLengthMm: null },
    ];
    const age = interpolateAge(sparse, 'weightGrams', 50);
    expect(age).toBeNull();
  });

  it('returns null for a field with no data', () => {
    const age = interpolateAge(referenceData, 'headLengthMm', 50);
    expect(age).toBeNull();
  });

  it('works with foot length data', () => {
    const age = interpolateAge(referenceData, 'footLengthMm', 55);
    // 55 is between 22 (age 100) and 88 (age 200), fraction = (55-22)/(88-22) = 0.5
    expect(age).toBe(150);
  });

  it('works with arm length for flying foxes', () => {
    // armLengthMm 97.5 is halfway between 83 (age 30) and 112 (age 60)
    const age = interpolateAge(flyingFoxRef, 'armLengthMm', 97.5);
    expect(age).toBe(45);
  });
});

describe('calculatePredictedWeight', () => {
  it('returns exact weight at a reference age', () => {
    expect(calculatePredictedWeight(referenceData, 200)).toBe(720);
  });

  it('interpolates weight between reference ages', () => {
    const weight = calculatePredictedWeight(referenceData, 150);
    // Halfway between 100g (age 100) and 720g (age 200) = 410
    expect(weight).toBe(410);
  });

  it('clamps to first weight when age is below range', () => {
    expect(calculatePredictedWeight(referenceData, -10)).toBe(1);
  });

  it('clamps to last weight when age is above range', () => {
    expect(calculatePredictedWeight(referenceData, 999)).toBe(6500);
  });
});

describe('calculateWFA', () => {
  it('returns positive value when animal is above predicted weight', () => {
    const wfa = calculateWFA(referenceData, 200, 900);
    // predicted = 720, actual = 900, difference = 180
    expect(wfa).toBe(180);
  });

  it('returns negative value when animal is below predicted weight', () => {
    const wfa = calculateWFA(referenceData, 200, 500);
    // predicted = 720, actual = 500, difference = -220
    expect(wfa).toBe(-220);
  });

  it('returns zero when actual matches predicted', () => {
    const wfa = calculateWFA(referenceData, 100, 100);
    expect(wfa).toBe(0);
  });

  it('returns null when no reference data for the field', () => {
    const wfa = calculateWFA([], 100, 500);
    expect(wfa).toBeNull();
  });
});

describe('getWFAStatus', () => {
  it('returns normal when within 10% of predicted', () => {
    // 5% below: wfa = -36, predicted = 720
    expect(getWFAStatus(-36, 720)).toBe('normal');
  });

  it('returns warning when 10-20% below predicted', () => {
    // 15% below: wfa = -108, predicted = 720
    expect(getWFAStatus(-108, 720)).toBe('warning');
  });

  it('returns danger when more than 20% below predicted', () => {
    // 25% below: wfa = -180, predicted = 720
    expect(getWFAStatus(-180, 720)).toBe('danger');
  });

  it('returns normal when above predicted (positive WFA)', () => {
    expect(getWFAStatus(100, 720)).toBe('normal');
  });
});

describe('estimateBirthDate', () => {
  const measurementDate = new Date('2024-06-15');

  it('estimates birth date from a single weight measurement', () => {
    const result = estimateBirthDate(referenceData, { weightGrams: 720 }, measurementDate);
    expect(result.estimates).toHaveLength(1);
    expect(result.medianEstimatedAgeDays).toBe(200);
    // 200 days before June 15 = November 28, 2023
    expect(result.medianEstimatedBirthDate).not.toBeNull();
    const dob = result.medianEstimatedBirthDate!;
    expect(dob.getFullYear()).toBe(2023);
    expect(dob.getMonth()).toBe(10); // November = 10
    expect(dob.getDate()).toBe(28);
  });

  it('takes median when multiple measurements are provided', () => {
    const result = estimateBirthDate(
      referenceData,
      { weightGrams: 720, footLengthMm: 88 },
      measurementDate
    );
    // Both point to age 200, so median is 200
    expect(result.estimates).toHaveLength(2);
    expect(result.medianEstimatedAgeDays).toBe(200);
  });

  it('returns null when no valid measurements provided', () => {
    const result = estimateBirthDate(referenceData, {}, measurementDate);
    expect(result.medianEstimatedBirthDate).toBeNull();
    expect(result.medianEstimatedAgeDays).toBeNull();
  });

  it('ignores zero and negative measurements', () => {
    const result = estimateBirthDate(
      referenceData,
      { weightGrams: 0, footLengthMm: -5 },
      measurementDate
    );
    expect(result.estimates).toHaveLength(0);
    expect(result.medianEstimatedBirthDate).toBeNull();
  });

  it('ignores fields with no reference data', () => {
    const result = estimateBirthDate(
      referenceData,
      { headLengthMm: 50 },
      measurementDate
    );
    expect(result.estimates).toHaveLength(0);
  });

  it('handles median correctly with odd number of estimates', () => {
    // Create ref data where weight and foot give different ages
    const skewedRef: GrowthReferencePoint[] = [
      { ageDays: 0, weightGrams: 1, headLengthMm: null, earLengthMm: null, armLengthMm: 10, legLengthMm: null, footLengthMm: 0, tailLengthMm: null, bodyLengthMm: null, wingLengthMm: null },
      { ageDays: 100, weightGrams: 100, headLengthMm: null, earLengthMm: null, armLengthMm: 50, legLengthMm: null, footLengthMm: 22, tailLengthMm: null, bodyLengthMm: null, wingLengthMm: null },
      { ageDays: 200, weightGrams: 720, headLengthMm: null, earLengthMm: null, armLengthMm: 100, legLengthMm: null, footLengthMm: 88, tailLengthMm: null, bodyLengthMm: null, wingLengthMm: null },
    ];
    // weight=100 → age 100, foot=88 → age 200, arm=50 → age 100
    const result = estimateBirthDate(
      skewedRef,
      { weightGrams: 100, footLengthMm: 88, armLengthMm: 50 },
      measurementDate
    );
    expect(result.estimates).toHaveLength(3);
    // Sorted ages: [100, 100, 200], median = 100
    expect(result.medianEstimatedAgeDays).toBe(100);
  });
});

describe('getRelevantFields', () => {
  it('returns arm and wing for Bat subtype', () => {
    const fields = getRelevantFields('Bat');
    expect(fields).toContain('weightGrams');
    expect(fields).toContain('armLengthMm');
    expect(fields).toContain('wingLengthMm');
    expect(fields).not.toContain('footLengthMm');
  });

  it('returns body measurements for non-bat species', () => {
    const fields = getRelevantFields('Macropod');
    expect(fields).toContain('weightGrams');
    expect(fields).toContain('footLengthMm');
    expect(fields).toContain('headLengthMm');
    expect(fields).not.toContain('wingLengthMm');
  });

  it('returns body measurements when subtype is null', () => {
    const fields = getRelevantFields(null);
    expect(fields).toContain('weightGrams');
    expect(fields).toContain('footLengthMm');
    expect(fields).not.toContain('wingLengthMm');
  });
});
