import { describe, it, expect } from "vitest";
import { calculateMacropodFeed } from "./macropod";

describe("calculateMacropodFeed", () => {
  it("classifies a 300 g Eastern Grey as 0.4 stage", () => {
    const r = calculateMacropodFeed({
      species: "eastern-grey-kangaroo",
      weightGrams: 300,
    });
    expect(r.stage).toBe("0.4");
    expect(r.feedsPerDay).toBe(6);
    expect(r.effectiveWeightGrams).toBe(300);
  });

  it("classifies a 1500 g Eastern Grey as 0.6 stage", () => {
    const r = calculateMacropodFeed({
      species: "eastern-grey-kangaroo",
      weightGrams: 1500,
    });
    expect(r.stage).toBe("0.6");
    expect(r.feedsPerDay).toBe(5);
  });

  it("classifies a 3000 g Eastern Grey as 0.8 stage", () => {
    const r = calculateMacropodFeed({
      species: "eastern-grey-kangaroo",
      weightGrams: 3000,
    });
    expect(r.stage).toBe("0.8");
    expect(r.feedsPerDay).toBe(4);
  });

  it("classifies a 5000 g Eastern Grey as >0.8 stage", () => {
    const r = calculateMacropodFeed({
      species: "eastern-grey-kangaroo",
      weightGrams: 5000,
    });
    expect(r.stage).toBe(">0.8");
    expect(r.feedsPerDay).toBe(3);
  });

  it("scales daily ml as a percentage of body weight", () => {
    const r = calculateMacropodFeed({
      species: "eastern-grey-kangaroo",
      weightGrams: 1000,
    });
    // 0.6 stage = 18% intake = 180 ml
    expect(r.dailyFeedMl).toBe(180);
    expect(r.perFeedMl).toBe(36);
  });

  it("uses age to estimate weight and emits a warning", () => {
    const r = calculateMacropodFeed({
      species: "red-necked-wallaby",
      ageDays: 200,
    });
    expect(r.effectiveWeightGrams).toBeGreaterThan(0);
    expect(r.warnings.some((w) => /weigh/i.test(w))).toBe(true);
  });

  it("flags a transition note when approaching the next stage", () => {
    const r = calculateMacropodFeed({
      species: "eastern-grey-kangaroo",
      weightGrams: 950,
    });
    expect(r.stage).toBe("0.4");
    expect(r.transitionNote).toMatch(/transition/i);
  });

  it("warns when age and weight imply different stages", () => {
    const r = calculateMacropodFeed({
      species: "eastern-grey-kangaroo",
      ageDays: 30,
      weightGrams: 3000,
    });
    expect(r.stage).toBe("0.8");
    expect(r.warnings.some((w) => /suggests/i.test(w))).toBe(true);
  });

  it("returns Impact for neonatal age", () => {
    const r = calculateMacropodFeed({
      species: "eastern-grey-kangaroo",
      ageDays: 1,
    });
    expect(r.stage).toBe("impact");
    expect(r.stageLabel).toMatch(/Impact/);
  });

  it("produces species-appropriate thresholds for Swamp Wallaby", () => {
    const r = calculateMacropodFeed({
      species: "swamp-wallaby",
      weightGrams: 1500,
    });
    expect(r.stage).toBe("0.8");
  });

  it("throws when neither age nor weight is provided", () => {
    expect(() =>
      calculateMacropodFeed({ species: "eastern-grey-kangaroo" })
    ).toThrow();
  });
});
