export type MacropodSpecies =
  | "eastern-grey-kangaroo"
  | "red-necked-wallaby"
  | "swamp-wallaby"
  | "common-wallaroo";

export type WombarooStage = "impact" | "0.4" | "0.6" | "0.8" | ">0.8";

interface SpeciesStageThresholds {
  // Weight (g) at which the joey enters each Wombaroo stage
  enters04: number;
  enters06: number;
  enters08: number;
  entersAbove08: number;
  // Approximate body weight at which a joey becomes fully weaned /
  // no longer needs formula
  fullyWeaned: number;
}

const SPECIES_THRESHOLDS: Record<MacropodSpecies, SpeciesStageThresholds> = {
  "eastern-grey-kangaroo": {
    enters04: 50,
    enters06: 1000,
    enters08: 2500,
    entersAbove08: 4500,
    fullyWeaned: 9000,
  },
  "red-necked-wallaby": {
    enters04: 50,
    enters06: 500,
    enters08: 1500,
    entersAbove08: 2800,
    fullyWeaned: 5000,
  },
  "swamp-wallaby": {
    enters04: 50,
    enters06: 500,
    enters08: 1400,
    entersAbove08: 2600,
    fullyWeaned: 4500,
  },
  "common-wallaroo": {
    enters04: 50,
    enters06: 700,
    enters08: 1800,
    entersAbove08: 3500,
    fullyWeaned: 7000,
  },
};

// Upper bound (inclusive, in days) during which a joey is still treated as
// receiving Wombaroo Impact colostrum substitute rather than the <0.4
// milk replacer.
const IMPACT_AGE_CUTOFF = 2;

// Approximate age-to-weight midpoints for a given stage. Used only when
// the user supplies age without weight. The 0.4 range starts the day
// after the Impact cutoff so that stageByAge and STAGE_AGE_RANGES agree.
const STAGE_AGE_RANGES: Record<
  Exclude<WombarooStage, "impact">,
  { ageDaysMin: number; ageDaysMax: number; weightFraction: [number, number] }
> = {
  "0.4": {
    ageDaysMin: IMPACT_AGE_CUTOFF + 1,
    ageDaysMax: 120,
    weightFraction: [0.002, 0.04],
  },
  "0.6": {
    ageDaysMin: 121,
    ageDaysMax: 210,
    weightFraction: [0.04, 0.12],
  },
  "0.8": {
    ageDaysMin: 211,
    ageDaysMax: 300,
    weightFraction: [0.12, 0.22],
  },
  ">0.8": {
    ageDaysMin: 301,
    ageDaysMax: 540,
    weightFraction: [0.22, 0.55],
  },
};

export interface MacropodCalcInput {
  species: MacropodSpecies;
  ageDays?: number;
  weightGrams?: number;
}

export interface MacropodCalcResult {
  stage: WombarooStage;
  stageLabel: string;
  effectiveWeightGrams: number;
  dailyFeedMl: number;
  feedsPerDay: number;
  perFeedMl: number;
  dailyIntakePercent: number;
  transitionNote: string | null;
  guidance: string;
  warnings: string[];
}

function stageByWeight(
  t: SpeciesStageThresholds,
  weightGrams: number
): WombarooStage {
  if (weightGrams < t.enters06) return "0.4";
  if (weightGrams < t.enters08) return "0.6";
  if (weightGrams < t.entersAbove08) return "0.8";
  return ">0.8";
}

function stageByAge(ageDays: number): WombarooStage {
  if (ageDays <= IMPACT_AGE_CUTOFF) return "impact";
  if (ageDays <= STAGE_AGE_RANGES["0.4"].ageDaysMax) return "0.4";
  if (ageDays <= STAGE_AGE_RANGES["0.6"].ageDaysMax) return "0.6";
  if (ageDays <= STAGE_AGE_RANGES["0.8"].ageDaysMax) return "0.8";
  return ">0.8";
}

function stageLabelFor(stage: WombarooStage): string {
  switch (stage) {
    case "impact":
      return "Wombaroo Impact (colostrum substitute)";
    case "0.4":
      return "Wombaroo Roo Milk Replacer <0.4";
    case "0.6":
      return "Wombaroo Roo Milk Replacer <0.6";
    case "0.8":
      return "Wombaroo Roo Milk Replacer <0.8";
    case ">0.8":
      return "Wombaroo Roo Milk Replacer >0.8";
  }
}

// Younger joeys consume a greater % of bodyweight per day than older ones.
function dailyIntakePercentFor(stage: WombarooStage): number {
  switch (stage) {
    case "impact":
      return 0.10;
    case "0.4":
      return 0.20;
    case "0.6":
      return 0.18;
    case "0.8":
      return 0.15;
    case ">0.8":
      return 0.12;
  }
}

function feedsPerDayFor(stage: WombarooStage): number {
  switch (stage) {
    case "impact":
      return 6;
    case "0.4":
      return 6;
    case "0.6":
      return 5;
    case "0.8":
      return 4;
    case ">0.8":
      return 3;
  }
}

function estimateWeightForAge(
  species: MacropodSpecies,
  ageDays: number
): number {
  const t = SPECIES_THRESHOLDS[species];
  const stage = stageByAge(ageDays);
  if (stage === "impact") {
    return Math.round(t.enters04);
  }
  const range = STAGE_AGE_RANGES[stage];
  // Linear interpolation between the stage entry and the next stage entry
  const weightEntry = {
    "0.4": t.enters04,
    "0.6": t.enters06,
    "0.8": t.enters08,
    ">0.8": t.entersAbove08,
  }[stage];
  const weightExit = {
    "0.4": t.enters06,
    "0.6": t.enters08,
    "0.8": t.entersAbove08,
    ">0.8": t.fullyWeaned,
  }[stage];
  const rangeSpan = Math.max(1, range.ageDaysMax - range.ageDaysMin);
  const progress = Math.min(
    1,
    Math.max(0, (ageDays - range.ageDaysMin) / rangeSpan)
  );
  return Math.round(weightEntry + progress * (weightExit - weightEntry));
}

function transitionNoteFor(
  t: SpeciesStageThresholds,
  stage: WombarooStage,
  weightGrams: number
): string | null {
  // If within 10% of the next threshold, flag an upcoming transition
  const next = {
    "0.4": t.enters06,
    "0.6": t.enters08,
    "0.8": t.entersAbove08,
    ">0.8": t.fullyWeaned,
    impact: t.enters04,
  }[stage];
  const nextStageLabel = {
    impact: "<0.4",
    "0.4": "<0.6",
    "0.6": "<0.8",
    "0.8": ">0.8",
    ">0.8": "weaning onto solids and browse",
  }[stage];
  if (weightGrams >= next * 0.9 && weightGrams < next) {
    return `Approaching transition to ${nextStageLabel} at ${next} g — begin blending formulas over 3–5 days.`;
  }
  return null;
}

function guidanceFor(stage: WombarooStage): string {
  switch (stage) {
    case "impact":
      return "Use Wombaroo Impact for the first 24–48 hours before transitioning to <0.4 Roo Milk Replacer.";
    case "0.4":
      return "Pinkie/furless stage. Keep warm (32–34 °C), feed small frequent volumes, handle minimally.";
    case "0.6":
      return "Fur emerging. Continue warmth support but reduce ambient temperature slightly.";
    case "0.8":
      return "Furred and out-of-pouch transitions beginning. Introduce native browse and grasses alongside milk.";
    case ">0.8":
      return "Out-of-pouch. Gradually reduce feed volumes as solids intake increases. Soft release planning should begin.";
  }
}

export function calculateMacropodFeed(
  input: MacropodCalcInput
): MacropodCalcResult {
  const { species, ageDays, weightGrams } = input;
  if (ageDays == null && weightGrams == null) {
    throw new Error("Provide at least ageDays or weightGrams");
  }
  if (weightGrams != null) {
    if (!Number.isFinite(weightGrams) || weightGrams <= 0) {
      throw new Error("weightGrams must be a finite number > 0");
    }
  }
  if (ageDays != null) {
    if (!Number.isFinite(ageDays) || ageDays < 0) {
      throw new Error("ageDays must be a finite number >= 0");
    }
  }

  const thresholds = SPECIES_THRESHOLDS[species];
  const warnings: string[] = [];

  let stage: WombarooStage;
  let effectiveWeight: number;

  if (weightGrams != null) {
    stage = stageByWeight(thresholds, weightGrams);
    effectiveWeight = weightGrams;
    if (ageDays != null) {
      const ageStage = stageByAge(ageDays);
      if (ageStage !== stage) {
        warnings.push(
          `Age suggests stage ${ageStage} but weight suggests ${stage}. Using weight-based stage; verify joey growth with vet if discrepancy is large.`
        );
      }
    }
  } else {
    // ageDays is guaranteed non-null by the guard above; TS narrows it here.
    stage = stageByAge(ageDays!);
    effectiveWeight = estimateWeightForAge(species, ageDays!);
    warnings.push(
      "Weight not provided — estimated from age. Weigh the joey for accurate feed volumes."
    );
  }

  const dailyIntakePercent = dailyIntakePercentFor(stage);
  const feedsPerDay = feedsPerDayFor(stage);
  const dailyFeedMl = Math.round(effectiveWeight * dailyIntakePercent);
  const perFeedMl = Math.round((dailyFeedMl / feedsPerDay) * 10) / 10;

  return {
    stage,
    stageLabel: stageLabelFor(stage),
    effectiveWeightGrams: effectiveWeight,
    dailyFeedMl,
    feedsPerDay,
    perFeedMl,
    dailyIntakePercent,
    transitionNote: transitionNoteFor(thresholds, stage, effectiveWeight),
    guidance: guidanceFor(stage),
    warnings,
  };
}

export const MACROPOD_SPECIES: {
  value: MacropodSpecies;
  label: string;
}[] = [
  { value: "eastern-grey-kangaroo", label: "Eastern Grey Kangaroo" },
  { value: "red-necked-wallaby", label: "Red-necked Wallaby" },
  { value: "swamp-wallaby", label: "Swamp Wallaby" },
  { value: "common-wallaroo", label: "Common Wallaroo" },
];
