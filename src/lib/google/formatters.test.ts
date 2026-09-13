import { describe, expect, it } from "vitest";

import {
  formatBusinessStatus,
  formatDistanceKilometers,
  formatDurationMinutes,
  formatPriceLevel,
  googleMapsPlaceUrl,
} from "./formatters";

describe("Google display formatters", () => {
  it("formats route measurements in kilometres and minutes", () => {
    expect(formatDistanceKilometers(850)).toBe("0.8 km");
    expect(formatDistanceKilometers(12_600)).toBe("13 km");
    expect(formatDurationMinutes(61)).toBe("2 min");
  });

  it("uses Unavailable for absent optional fields", () => {
    expect(formatDistanceKilometers(null)).toBe("Unavailable");
    expect(formatDurationMinutes(null)).toBe("Unavailable");
    expect(formatPriceLevel(null)).toBe("Unavailable");
  });

  it("normalizes REST and JavaScript price/status values", () => {
    expect(formatPriceLevel("MODERATE")).toBe("$$");
    expect(formatPriceLevel("PRICE_LEVEL_EXPENSIVE")).toBe("$$$");
    expect(formatBusinessStatus("CLOSED_TEMPORARILY")).toBe(
      "Closed Temporarily",
    );
  });

  it("builds a Google Maps place source link", () => {
    const url = new URL(googleMapsPlaceUrl("place id/with symbols"));
    expect(url.hostname).toBe("www.google.com");
    expect(url.searchParams.get("query_place_id")).toBe(
      "place id/with symbols",
    );
  });
});
