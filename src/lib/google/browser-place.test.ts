import { beforeEach, describe, expect, it, vi } from "vitest";

const { loadGoogleMapsLibrary } = vi.hoisted(() => ({
  loadGoogleMapsLibrary: vi.fn(),
}));

vi.mock("./browser-loader", () => ({ loadGoogleMapsLibrary }));

import { loadBrowserPlaceDetails } from "./browser-place";

describe("browser place details", () => {
  beforeEach(() => {
    loadGoogleMapsLibrary.mockReset();
  });

  it("deduplicates concurrent requests for the same place and fields", async () => {
    const fetchFields = vi.fn().mockResolvedValue(undefined);

    class Place {
      id: string;
      displayName = "Harbour Tacos";
      formattedAddress = "1 Test Street";
      location = { lat: 44.65, lng: -63.57 };
      rating = 4.5;
      userRatingCount = 10;
      priceLevel = "PRICE_LEVEL_MODERATE";
      photos = [];
      businessStatus = "OPERATIONAL";
      googleMapsURI = "https://maps.google.com/?cid=test";
      types = ["restaurant"];
      fetchFields = fetchFields;

      constructor({ id }: { id: string }) {
        this.id = id;
      }
    }

    loadGoogleMapsLibrary.mockResolvedValue({ Place });

    const [first, second] = await Promise.all([
      loadBrowserPlaceDetails("cache-test-place", { apiKey: "browser-test-key" }),
      loadBrowserPlaceDetails("cache-test-place", { apiKey: "browser-test-key" }),
    ]);

    expect(first).toEqual(second);
    expect(first.ok).toBe(true);
    expect(loadGoogleMapsLibrary).toHaveBeenCalledTimes(1);
    expect(fetchFields).toHaveBeenCalledTimes(1);
  });
});
