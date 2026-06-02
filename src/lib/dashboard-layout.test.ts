import { describe, it, expect } from "vitest";
import {
  reconcileOrder,
  reconcileHidden,
  reconcileSizes,
  validateTrendWindow,
  buildTrendChartRows,
  DEFAULT_TREND_WINDOW,
  type QuerySeries,
} from "./dashboard-layout";

describe("reconcileOrder", () => {
  it("falls back to server order when nothing is stored", () => {
    expect(reconcileOrder(null, ["a", "b", "c"])).toEqual(["a", "b", "c"]);
  });

  it("preserves a valid stored order", () => {
    expect(reconcileOrder(["c", "a", "b"], ["a", "b", "c"])).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("drops stale IDs that no longer exist", () => {
    expect(reconcileOrder(["a", "gone", "b"], ["a", "b"])).toEqual(["a", "b"]);
  });

  it("falls back to server order for malformed (non-array) stored shapes", () => {
    // A parseable-but-wrong localStorage value (e.g. {} from an older build)
    // must not throw during hydration.
    expect(
      reconcileOrder({} as unknown as string[], ["a", "b"]),
    ).toEqual(["a", "b"]);
  });

  it("appends new widgets that were not in the stored order", () => {
    expect(reconcileOrder(["b", "a"], ["a", "b", "c", "d"])).toEqual([
      "b",
      "a",
      "c",
      "d",
    ]);
  });

  it("de-duplicates repeated IDs, keeping the first occurrence", () => {
    expect(reconcileOrder(["a", "a", "b", "a"], ["a", "b"])).toEqual([
      "a",
      "b",
    ]);
  });

  it("handles combined stale + duplicate + new IDs", () => {
    expect(
      reconcileOrder(["x", "b", "b", "a", "x"], ["a", "b", "c"]),
    ).toEqual(["b", "a", "c"]);
  });
});

describe("reconcileHidden", () => {
  it("returns empty array when nothing is stored", () => {
    expect(reconcileHidden(null, ["a", "b"])).toEqual([]);
  });

  it("keeps only hidden IDs that still exist, de-duplicated", () => {
    expect(reconcileHidden(["a", "gone", "a", "b"], ["a", "b", "c"])).toEqual([
      "a",
      "b",
    ]);
  });

  it("returns empty for malformed (non-array) stored shapes", () => {
    expect(reconcileHidden({} as unknown as string[], ["a", "b"])).toEqual([]);
  });
});

describe("reconcileSizes", () => {
  it("returns empty object when nothing is stored", () => {
    expect(reconcileSizes(null, ["a"])).toEqual({});
  });

  it("keeps only full/half values for current widgets", () => {
    const stored = { a: "half", b: "full", c: "huge", gone: "half" };
    expect(reconcileSizes(stored, ["a", "b", "c"])).toEqual({
      a: "half",
      b: "full",
    });
  });
});

describe("validateTrendWindow", () => {
  it("accepts allowed numeric values", () => {
    expect(validateTrendWindow(12)).toBe(12);
  });

  it("accepts allowed string values", () => {
    expect(validateTrendWindow("26")).toBe(26);
  });

  it("rejects disallowed values and falls back to default", () => {
    expect(validateTrendWindow(7)).toBe(DEFAULT_TREND_WINDOW);
    expect(validateTrendWindow("abc")).toBe(DEFAULT_TREND_WINDOW);
    expect(validateTrendWindow(null)).toBe(DEFAULT_TREND_WINDOW);
  });
});

describe("buildTrendChartRows", () => {
  it("transforms multi-series data, filling gaps with 0", () => {
    const series: QuerySeries = [
      {
        label: "Admissions",
        rows: [
          { label: "2026-01", value: 5 },
          { label: "2026-03", value: 8 },
        ],
      },
      {
        label: "Releases",
        rows: [
          { label: "2026-02", value: 3 },
          { label: "2026-03", value: 4 },
        ],
      },
    ];

    const { chartRows, seriesKeys } = buildTrendChartRows(series);

    expect(seriesKeys).toEqual([
      { key: "series_0", label: "Admissions" },
      { key: "series_1", label: "Releases" },
    ]);

    expect(chartRows).toEqual([
      { label: "2026-01", series_0: 5, series_1: 0 },
      { label: "2026-02", series_0: 0, series_1: 3 },
      { label: "2026-03", series_0: 8, series_1: 4 },
    ]);
  });

  it("handles an empty series list", () => {
    const { chartRows, seriesKeys } = buildTrendChartRows([]);
    expect(chartRows).toEqual([]);
    expect(seriesKeys).toEqual([]);
  });
});
