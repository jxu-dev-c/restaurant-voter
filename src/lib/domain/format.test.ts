import { describe, expect, it } from "vitest";
import { formatDistance, formatDuration, voterCode } from "./format";

describe("domain formatters", () => {
  it("formats metric route values", () => {
    expect(formatDistance(850)).toBe("850 m");
    expect(formatDistance(3150)).toBe("3.1 km");
    expect(formatDuration(710)).toBe("12 min");
  });

  it("uses an explicit unavailable state", () => {
    expect(formatDistance(null)).toBe("Unavailable");
    expect(formatDuration(undefined)).toBe("Unavailable");
  });

  it("creates a short stable voter code", () => {
    expect(voterCode("c3be4471-3589-48ed-aeed-f82bb9084cd2")).toBe("C3BE");
  });
});
