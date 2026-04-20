import { describe, it, expect } from "vitest";
import { calculateFlyingFoxFeed } from "./flyingFox";

describe("calculateFlyingFoxFeed", () => {
  it("classifies a 3-day-old grey-headed as neonate", () => {
    const result = calculateFlyingFoxFeed({
      species: "grey-headed",
      formula: "wombaroo-flying-fox",
      ageDays: 3,
    });
    expect(result.stage.label).toContain("Neonate");
    expect(result.feedsPerDay).toBe(6);
    expect(result.expectedWeightGrams).toBe(65);
    expect(result.dailyFeedMl).toBeGreaterThan(0);
    expect(result.perFeedMl).toBeGreaterThan(0);
  });

  it("classifies by forearm length when age is not provided", () => {
    const result = calculateFlyingFoxFeed({
      species: "grey-headed",
      formula: "wombaroo-flying-fox",
      forearmMm: 120,
    });
    expect(result.stage.label).toContain("Juvenile (2–3 months)");
    expect(result.feedsPerDay).toBe(4);
  });

  it("reduces feeds per day as the pup grows", () => {
    const neonate = calculateFlyingFoxFeed({
      species: "grey-headed",
      formula: "wombaroo-flying-fox",
      ageDays: 3,
    });
    const weaning = calculateFlyingFoxFeed({
      species: "grey-headed",
      formula: "wombaroo-flying-fox",
      ageDays: 130,
    });
    expect(weaning.feedsPerDay).toBeLessThan(neonate.feedsPerDay);
  });

  it("uses smaller expected weights for Little Red Flying-fox", () => {
    const ghff = calculateFlyingFoxFeed({
      species: "grey-headed",
      formula: "wombaroo-flying-fox",
      ageDays: 30,
    });
    const lrff = calculateFlyingFoxFeed({
      species: "little-red",
      formula: "wombaroo-flying-fox",
      ageDays: 30,
    });
    expect(lrff.expectedWeightGrams).toBeLessThan(ghff.expectedWeightGrams);
  });

  it("warns when age and forearm disagree on stage", () => {
    const result = calculateFlyingFoxFeed({
      species: "grey-headed",
      formula: "wombaroo-flying-fox",
      ageDays: 3,
      forearmMm: 140,
    });
    expect(result.warnings.length).toBeGreaterThan(0);
    // Forearm wins
    expect(result.stage.label).toContain("Pre-weaning");
  });

  it("returns neonate stage for age below the youngest bucket", () => {
    const result = calculateFlyingFoxFeed({
      species: "grey-headed",
      formula: "wombaroo-flying-fox",
      ageDays: -1,
    });
    expect(result.stage.label).toContain("Neonate");
  });

  it("returns weaning stage for age above the oldest bucket", () => {
    const result = calculateFlyingFoxFeed({
      species: "grey-headed",
      formula: "wombaroo-flying-fox",
      ageDays: 365,
    });
    expect(result.stage.label).toContain("Weaning");
  });

  it("provides formula-specific guidance for Impact on neonates", () => {
    const result = calculateFlyingFoxFeed({
      species: "grey-headed",
      formula: "wombaroo-impact",
      ageDays: 2,
    });
    expect(result.formulaRecommendation).toMatch(/colostrum/i);
  });

  it("throws when neither age nor forearm is provided", () => {
    expect(() =>
      calculateFlyingFoxFeed({
        species: "grey-headed",
        formula: "wombaroo-flying-fox",
      })
    ).toThrow();
  });
});
