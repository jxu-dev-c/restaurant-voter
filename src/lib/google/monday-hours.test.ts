import { describe, expect, it } from "vitest";
import { formatMondayHours } from "./formatters";
import { mapBrowserPlace, mapRestPlace } from "./place-mapper";

describe("Monday hours", () => {
  const periods = [
    { open: { day: 1, hour: 11, minute: 30 }, close: { day: 1, hour: 14, minute: 0 } },
    { open: { day: 1, hour: 17, minute: 0 }, close: { day: 1, hour: 22, minute: 0 } },
  ];
  it("preserves hours from both Google adapters and formats split shifts", () => {
    const browser = mapBrowserPlace({ id: "test", regularOpeningHours: { periods } });
    const rest = mapRestPlace({ id: "test", regularOpeningHours: { periods } });
    expect(browser.openingPeriods).toEqual(periods);
    expect(rest?.openingPeriods).toEqual(periods);
    expect(formatMondayHours(browser.openingPeriods)).toBe("11:30 AM–2 PM, 5 PM–10 PM");
  });
  it("distinguishes missing hours, closed Mondays, and 24-hour opening", () => {
    expect(formatMondayHours(null)).toBe("Hours unavailable");
    expect(formatMondayHours([])).toBe("Closed");
    expect(formatMondayHours([{ open: { day: 0, hour: 0, minute: 0 } }])).toBe("Open 24 hours");
  });
  it("includes Sunday overnight hours and clips Monday at midnight", () => {
    expect(formatMondayHours([
      { open: { day: 0, hour: 22, minute: 0 }, close: { day: 1, hour: 2, minute: 0 } },
      { open: { day: 1, hour: 18, minute: 0 }, close: { day: 2, hour: 1, minute: 0 } },
    ])).toBe("12 AM–2 AM, 6 PM–midnight");
  });
});
