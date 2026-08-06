import { describe, expect, it } from "vitest";

import { mapBrowserPlace, mapRestPlace } from "./place-mapper";

describe("mapBrowserPlace", () => {
  it("converts Google class-like values to a JSON-safe DTO", () => {
    const place = mapBrowserPlace({
      id: "place-123",
      displayName: "  Noodle House  ",
      formattedAddress: "1 Main Street",
      location: { lat: () => 44.6488, lng: () => -63.5752 },
      rating: 4.6,
      userRatingCount: 321,
      priceLevel: "MODERATE",
      businessStatus: "OPERATIONAL",
      googleMapsURI: "https://maps.google.com/example",
      types: ["restaurant", "food"],
      photos: [
        {
          widthPx: 1200,
          heightPx: 800,
          googleMapsURI: "https://maps.google.com/photo",
          authorAttributions: [
            {
              displayName: "Alex Example",
              uri: "https://maps.google.com/contributor",
              photoURI: "https://example.test/profile.jpg",
            },
          ],
          getURI: ({ maxWidth } = {}) =>
            `https://example.test/photo?w=${maxWidth}`,
        },
      ],
    });

    expect(place).toEqual({
      placeId: "place-123",
      displayName: "  Noodle House  ",
      formattedAddress: "1 Main Street",
      location: { lat: 44.6488, lng: -63.5752 },
      rating: 4.6,
      userRatingCount: 321,
      priceLevel: "MODERATE",
      photo: {
        uri: "https://example.test/photo?w=960",
        widthPx: 1200,
        heightPx: 800,
        googleMapsUri: "https://maps.google.com/photo",
        attributions: [
          {
            displayName: "Alex Example",
            uri: "https://maps.google.com/contributor",
            photoUri: "https://example.test/profile.jpg",
          },
        ],
      },
      businessStatus: "OPERATIONAL",
      googleMapsUri: "https://maps.google.com/example",
      types: ["restaurant", "food"],
    });
  });

  it("keeps missing Google-owned fields non-fatal", () => {
    expect(mapBrowserPlace({ id: "place-123" })).toMatchObject({
      placeId: "place-123",
      displayName: null,
      location: null,
      rating: null,
      priceLevel: null,
      photo: null,
    });
  });
});

describe("mapRestPlace", () => {
  it("maps the exact Place Details response without creating a keyed photo URL", () => {
    const place = mapRestPlace({
      id: "rest-place",
      displayName: { text: "Cafe One" },
      location: { latitude: 45, longitude: -63 },
      photos: [
        {
          widthPx: 640,
          heightPx: 480,
          googleMapsUri: "https://maps.google.com/photo",
          authorAttributions: [{ displayName: "Photographer" }],
        },
      ],
      types: ["cafe"],
    });

    expect(place?.photo).toMatchObject({
      uri: null,
      widthPx: 640,
      heightPx: 480,
      attributions: [{ displayName: "Photographer" }],
    });
  });

  it("rejects a response without a Place ID", () => {
    expect(mapRestPlace({ displayName: { text: "Missing ID" } })).toBeNull();
  });
});
