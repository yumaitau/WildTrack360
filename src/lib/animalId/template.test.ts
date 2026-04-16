import { describe, it, expect } from "vitest";
import { renderAnimalIdTemplate } from "./template";

describe("renderAnimalIdTemplate", () => {
  it("renders {ORG_SHORT}", () => {
    expect(
      renderAnimalIdTemplate("{ORG_SHORT}-001", { orgShortCode: "WARC" })
    ).toBe("WARC-001");
  });

  it("renders {YYYY} and {YY}", () => {
    expect(renderAnimalIdTemplate("{YYYY}/{YY}", { year: 2026 })).toBe(
      "2026/26"
    );
  });

  it("renders {seq} unpadded", () => {
    expect(renderAnimalIdTemplate("ID-{seq}", { seq: 42 })).toBe("ID-42");
  });

  it("renders {seq:N} zero-padded", () => {
    expect(renderAnimalIdTemplate("ID-{seq:4}", { seq: 42 })).toBe("ID-0042");
    expect(renderAnimalIdTemplate("ID-{seq:6}", { seq: 7 })).toBe("ID-000007");
  });

  it("renders {seq:N} when value exceeds pad width", () => {
    expect(renderAnimalIdTemplate("ID-{seq:2}", { seq: 12345 })).toBe(
      "ID-12345"
    );
  });

  it("renders {SPECIES}", () => {
    expect(
      renderAnimalIdTemplate("{ORG_SHORT}-{SPECIES}-{seq:3}", {
        orgShortCode: "WARC",
        species: "KANG",
        seq: 5,
      })
    ).toBe("WARC-KANG-005");
  });

  it("renders {SPECIES} as empty string when missing", () => {
    expect(renderAnimalIdTemplate("{ORG_SHORT}-{SPECIES}-{seq}", {
      orgShortCode: "X",
      seq: 1,
    })).toBe("X--1");
  });

  it("leaves unknown placeholders literal", () => {
    expect(renderAnimalIdTemplate("{ORG_SHORT}-{UNKNOWN}-{seq}", {
      orgShortCode: "A",
      seq: 1,
    })).toBe("A-{UNKNOWN}-1");
  });

  it("handles missing context values gracefully", () => {
    expect(renderAnimalIdTemplate("{ORG_SHORT}-{YYYY}-{seq:4}", {})).toBe(
      "--"
    );
  });

  it("handles multiple occurrences of the same placeholder", () => {
    expect(
      renderAnimalIdTemplate("{ORG_SHORT}-{ORG_SHORT}-{seq}-{seq:3}", {
        orgShortCode: "AB",
        seq: 9,
      })
    ).toBe("AB-AB-9-009");
  });

  it("renders a full realistic template", () => {
    expect(
      renderAnimalIdTemplate("{ORG_SHORT}-{YYYY}-{seq:4}", {
        orgShortCode: "WARC",
        year: 2026,
        seq: 42,
      })
    ).toBe("WARC-2026-0042");
  });

  it("renders template with no placeholders as-is", () => {
    expect(renderAnimalIdTemplate("FIXED-ID-001", { seq: 99 })).toBe(
      "FIXED-ID-001"
    );
  });
});
