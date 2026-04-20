export type FlyingFoxSpecies = "grey-headed" | "little-red";

export type FlyingFoxFormula =
  | "wombaroo-impact"
  | "wombaroo-flying-fox"
  | "di-vetelact";

export interface FlyingFoxStage {
  label: string;
  ageDaysMin: number;
  ageDaysMax: number;
  forearmMmMin: number;
  forearmMmMax: number;
  // Expected body weight range for the stage (grams)
  weightGramsMin: number;
  weightGramsMax: number;
  // Daily milk intake as a fraction of body weight
  dailyIntakeFraction: number;
  feedsPerDay: number;
  notes: string;
}

export interface FlyingFoxCalcInput {
  species: FlyingFoxSpecies;
  formula: FlyingFoxFormula;
  ageDays?: number;
  forearmMm?: number;
}

export interface FlyingFoxCalcResult {
  stage: FlyingFoxStage;
  expectedWeightGrams: number;
  dailyFeedMl: number;
  feedsPerDay: number;
  perFeedMl: number;
  formulaRecommendation: string;
  warnings: string[];
}

// Reference stages for Grey-headed Flying Fox based on commonly-cited
// wildlife-carer guidance (WIRES, Tolga Bat Hospital, Wombaroo feeding
// guides). Intended as a starting point — carers should confirm with
// their vet and manufacturer documentation.
const GHFF_STAGES: FlyingFoxStage[] = [
  {
    label: "Neonate (0–7 days)",
    ageDaysMin: 0,
    ageDaysMax: 7,
    forearmMmMin: 40,
    forearmMmMax: 55,
    weightGramsMin: 50,
    weightGramsMax: 80,
    dailyIntakeFraction: 0.25,
    feedsPerDay: 6,
    notes: "Body temperature support required. Feed small volumes frequently.",
  },
  {
    label: "Early pup (1–2 weeks)",
    ageDaysMin: 8,
    ageDaysMax: 14,
    forearmMmMin: 55,
    forearmMmMax: 70,
    weightGramsMin: 80,
    weightGramsMax: 120,
    dailyIntakeFraction: 0.22,
    feedsPerDay: 5,
    notes: "Eyes opening. Still fully dependent on milk.",
  },
  {
    label: "Growing pup (2–4 weeks)",
    ageDaysMin: 15,
    ageDaysMax: 28,
    forearmMmMin: 70,
    forearmMmMax: 90,
    weightGramsMin: 120,
    weightGramsMax: 180,
    dailyIntakeFraction: 0.20,
    feedsPerDay: 5,
    notes: "Thermoregulation developing.",
  },
  {
    label: "Young juvenile (1–2 months)",
    ageDaysMin: 29,
    ageDaysMax: 60,
    forearmMmMin: 90,
    forearmMmMax: 110,
    weightGramsMin: 180,
    weightGramsMax: 280,
    dailyIntakeFraction: 0.18,
    feedsPerDay: 4,
    notes: "Begin introducing fruit.",
  },
  {
    label: "Juvenile (2–3 months)",
    ageDaysMin: 61,
    ageDaysMax: 90,
    forearmMmMin: 110,
    forearmMmMax: 130,
    weightGramsMin: 280,
    weightGramsMax: 400,
    dailyIntakeFraction: 0.16,
    feedsPerDay: 4,
    notes: "Crèche-ready. Should be taking solids alongside milk.",
  },
  {
    label: "Pre-weaning (3–4 months)",
    ageDaysMin: 91,
    ageDaysMax: 120,
    forearmMmMin: 130,
    forearmMmMax: 150,
    weightGramsMin: 400,
    weightGramsMax: 550,
    dailyIntakeFraction: 0.13,
    feedsPerDay: 3,
    notes: "Active flying. Reduce milk as solid intake increases.",
  },
  {
    label: "Weaning (4+ months)",
    ageDaysMin: 121,
    ageDaysMax: 180,
    forearmMmMin: 150,
    forearmMmMax: 170,
    weightGramsMin: 550,
    weightGramsMax: 650,
    dailyIntakeFraction: 0.10,
    feedsPerDay: 2,
    notes: "Transitioning off milk. Pre-release conditioning.",
  },
];

// Little Red Flying-fox is ~70% of Grey-headed adult mass; derive
// stage weights proportionally while keeping age/forearm timing.
const LRFF_WEIGHT_SCALE = 0.7;

const LRFF_STAGES: FlyingFoxStage[] = GHFF_STAGES.map((s) => ({
  ...s,
  forearmMmMin: Math.round(s.forearmMmMin * 0.92),
  forearmMmMax: Math.round(s.forearmMmMax * 0.92),
  weightGramsMin: Math.round(s.weightGramsMin * LRFF_WEIGHT_SCALE),
  weightGramsMax: Math.round(s.weightGramsMax * LRFF_WEIGHT_SCALE),
}));

function stagesFor(species: FlyingFoxSpecies): FlyingFoxStage[] {
  return species === "little-red" ? LRFF_STAGES : GHFF_STAGES;
}

function pickStageByAge(
  stages: FlyingFoxStage[],
  ageDays: number
): FlyingFoxStage {
  const clamped = Math.max(0, ageDays);
  const found = stages.find(
    (s) => clamped >= s.ageDaysMin && clamped <= s.ageDaysMax
  );
  if (found) return found;
  return clamped < stages[0].ageDaysMin ? stages[0] : stages[stages.length - 1];
}

function pickStageByForearm(
  stages: FlyingFoxStage[],
  forearmMm: number
): FlyingFoxStage {
  const found = stages.find(
    (s) => forearmMm >= s.forearmMmMin && forearmMm <= s.forearmMmMax
  );
  if (found) return found;
  return forearmMm < stages[0].forearmMmMin
    ? stages[0]
    : stages[stages.length - 1];
}

function midpoint(min: number, max: number): number {
  return Math.round((min + max) / 2);
}

function formulaGuidance(
  formula: FlyingFoxFormula,
  stage: FlyingFoxStage
): string {
  const isNeonate = stage.ageDaysMax <= 7;
  switch (formula) {
    case "wombaroo-impact":
      return isNeonate
        ? "Wombaroo Impact is appropriate as a colostrum substitute for the first 24–48 h. Transition to Wombaroo Flying-fox Milk Replacer."
        : "Impact is a colostrum substitute — switch to Wombaroo Flying-fox Milk Replacer for ongoing feeds.";
    case "wombaroo-flying-fox":
      return "Wombaroo Flying-fox Milk Replacer is the recommended formula across all pup stages.";
    case "di-vetelact":
      return isNeonate
        ? "Di-Vetelact can be used short-term but Wombaroo Flying-fox Milk Replacer is preferred for neonates. Consult a vet."
        : "Di-Vetelact is acceptable as an interim formula; transition to Wombaroo Flying-fox Milk Replacer when available.";
  }
}

export function calculateFlyingFoxFeed(
  input: FlyingFoxCalcInput
): FlyingFoxCalcResult {
  const { species, formula } = input;
  const stages = stagesFor(species);

  const warnings: string[] = [];
  let stage: FlyingFoxStage;

  if (input.ageDays != null && input.forearmMm != null) {
    const byAge = pickStageByAge(stages, input.ageDays);
    const byForearm = pickStageByForearm(stages, input.forearmMm);
    stage = byForearm;
    if (byAge.label !== byForearm.label) {
      warnings.push(
        `Age suggests stage "${byAge.label}" but forearm suggests "${byForearm.label}" — using forearm. Verify measurements.`
      );
    }
  } else if (input.forearmMm != null) {
    stage = pickStageByForearm(stages, input.forearmMm);
  } else if (input.ageDays != null) {
    stage = pickStageByAge(stages, input.ageDays);
  } else {
    throw new Error("Provide either ageDays or forearmMm");
  }

  const expectedWeightGrams = midpoint(
    stage.weightGramsMin,
    stage.weightGramsMax
  );
  const dailyFeedMl = Math.round(
    expectedWeightGrams * stage.dailyIntakeFraction
  );
  const perFeedMl = Math.round((dailyFeedMl / stage.feedsPerDay) * 10) / 10;

  return {
    stage,
    expectedWeightGrams,
    dailyFeedMl,
    feedsPerDay: stage.feedsPerDay,
    perFeedMl,
    formulaRecommendation: formulaGuidance(formula, stage),
    warnings,
  };
}

export const FLYING_FOX_SPECIES: {
  value: FlyingFoxSpecies;
  label: string;
}[] = [
  { value: "grey-headed", label: "Grey-headed Flying Fox" },
  { value: "little-red", label: "Little Red Flying-fox" },
];

export const FLYING_FOX_FORMULAS: {
  value: FlyingFoxFormula;
  label: string;
}[] = [
  { value: "wombaroo-flying-fox", label: "Wombaroo Flying-fox Milk Replacer" },
  { value: "wombaroo-impact", label: "Wombaroo Impact (colostrum substitute)" },
  { value: "di-vetelact", label: "Di-Vetelact" },
];
