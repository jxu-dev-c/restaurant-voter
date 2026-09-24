import { describe, expect, it } from "vitest";
import { formatPollDayHours, POLL_WEEKDAY } from "./formatters";
import { mapBrowserPlace, mapRestPlace } from "./place-mapper";

describe("poll-day hours", () => {
  const periods = [
    { open: { day: 2, hour: 11, minute: 30 }, close: { day: 2, hour: 14, minute: 0 } },
    { open: { day: 2, hour: 17, minute: 0 }, close: { day: 2, hour: 22, minute: 0 } },
  ];
  it("reads Tuesday, the day the poll lands on", () => {
    expect(POLL_WEEKDAY).toBe(2);
    expect(formatPollDayHours([
      { open: { day: 1, hour: 9, minute: 0 }, close: { day: 1, hour: 17, minute: 0 } },
      { open: { day: 2, hour: 12, minute: 0 }, close: { day: 2, hour: 20, minute: 0 } },
    ])).toBe("12 PM–8 PM");
  });
  it("preserves hours from both Google adapters and formats split shifts", () => {
    const browser = mapBrowserPlace({ id: "test", regularOpeningHours: { periods } });
    const rest = mapRestPlace({ id: "test", regularOpeningHours: { periods } });
    expect(browser.openingPeriods).toEqual(periods);
    expect(rest?.openingPeriods).toEqual(periods);
    expect(formatPollDayHours(browser.openingPeriods)).toBe("11:30 AM–2 PM, 5 PM–10 PM");
  });
  it("distinguishes missing hours, closed Tuesdays, and 24-hour opening", () => {
    expect(formatPollDayHours(null)).toBe("Hours unavailable");
    expect(formatPollDayHours([])).toBe("Closed");
    expect(formatPollDayHours([{ open: { day: 0, hour: 0, minute: 0 } }])).toBe("Open 24 hours");
  });
  it("includes Monday overnight hours and clips Tuesday at midnight", () => {
    expect(formatPollDayHours([
      { open: { day: 1, hour: 22, minute: 0 }, close: { day: 2, hour: 2, minute: 0 } },
      { open: { day: 2, hour: 18, minute: 0 }, close: { day: 3, hour: 1, minute: 0 } },
    ])).toBe("12 AM–2 AM, 6 PM–midnight");
  });
  it("wraps a Saturday-to-Sunday week boundary without leaking into Tuesday", () => {
    expect(formatPollDayHours([
      { open: { day: 6, hour: 20, minute: 0 }, close: { day: 0, hour: 3, minute: 0 } },
    ])).toBe("Closed");
  });
});
