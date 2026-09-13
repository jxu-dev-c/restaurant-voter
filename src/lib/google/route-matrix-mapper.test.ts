import { describe, expect, it } from "vitest";

import {
  mapRouteMatrixResponse,
  parseGoogleDurationSeconds,
} from "./route-matrix-mapper";

describe("parseGoogleDurationSeconds", () => {
  it("accepts whole and fractional protobuf durations", () => {
    expect(parseGoogleDurationSeconds("90s")).toBe(90);
    expect(parseGoogleDurationSeconds("12.5s")).toBe(12.5);
  });

  it("rejects malformed durations", () => {
    expect(parseGoogleDurationSeconds("3m")).toBeNull();
    expect(parseGoogleDurationSeconds(undefined)).toBeNull();
  });
});

describe("mapRouteMatrixResponse", () => {
  it("preserves destination order and marks omitted routes unavailable", () => {
    const result = mapRouteMatrixResponse(
      ["place-a", "place-b", "place-c"],
      [
        {
          destinationIndex: 2,
          condition: "ROUTE_EXISTS",
          distanceMeters: 2500,
          duration: "420s",
          status: { code: 0 },
        },
        {
          destinationIndex: 0,
          condition: "ROUTE_NOT_FOUND",
          status: { code: 5 },
        },
      ],
    );

    expect(result.routes).toEqual([
      {
        placeId: "place-a",
        destinationIndex: 0,
        condition: "ROUTE_NOT_FOUND",
        distanceMeters: null,
        durationSeconds: null,
        statusCode: 5,
      },
      {
        placeId: "place-b",
        destinationIndex: 1,
        condition: "ROUTE_NOT_FOUND",
        distanceMeters: null,
        durationSeconds: null,
        statusCode: null,
      },
      {
        placeId: "place-c",
        destinationIndex: 2,
        condition: "ROUTE_EXISTS",
        distanceMeters: 2500,
        durationSeconds: 420,
        statusCode: 0,
      },
    ]);
  });
});
