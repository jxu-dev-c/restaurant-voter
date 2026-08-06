import { describe, expect, it } from "vitest";
import { createPollSchema, placeSelectionSchema, winnerSchema } from "./schemas";

describe("domain form schemas", () => {
  it("coerces poll values from FormData strings", () => {
    const parsed = createPollSchema.parse({
      title: "Friday lunch",
      lunchCenterId: "c3be4471-3589-48ed-aeed-f82bb9084cd2",
      voteLimit: "3",
      nominationLimit: "7",
      nominationsEnabled: "on",
    });

    expect(parsed.voteLimit).toBe(3);
    expect(parsed.nominationLimit).toBe(7);
    expect(parsed.nominationsEnabled).toBe(true);
  });

  it("requires a canonical place id for nominations", () => {
    expect(
      placeSelectionSchema.safeParse({ placeId: "", fallbackLabel: "Cafe" }).success,
    ).toBe(false);
  });

  it("does not require Google-owned display text to be persisted", () => {
    expect(
      placeSelectionSchema.parse({ placeId: "ChIJ-test-place-id" }),
    ).toEqual({
      placeId: "ChIJ-test-place-id",
      acknowledgePreviousWinner: false,
    });

    expect(
      winnerSchema.parse({
        placeId: "ChIJ-test-place-id",
        wonOn: "2026-08-05",
      }),
    ).toEqual({
      placeId: "ChIJ-test-place-id",
      wonOn: "2026-08-05",
    });
  });
});
