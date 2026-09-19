import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GooglePlaceDetails } from "@/lib/google/types";
import { RestaurantMap } from "./restaurant-map";

const mocks = vi.hoisted(() => ({
  markers: [] as Array<{ map: unknown; title: string; click?: () => void }>,
  remove: vi.fn(),
  close: vi.fn(),
  open: vi.fn(),
  setContent: vi.fn(),
  setOptions: vi.fn(),
  details: vi.fn(),
}));

vi.mock("@/lib/google/browser-place", () => ({ loadBrowserPlaceDetails: mocks.details }));
vi.mock("@/lib/google/browser-loader", () => ({
  loadGoogleMapsLibrary: async () => ({
    Map: class { fitBounds() {} },
    LatLngBounds: class { extend() {} },
    InfoWindow: class {
      close = mocks.close;
      open = mocks.open;
      setContent = mocks.setContent;
      setOptions = mocks.setOptions;
    },
    AdvancedMarkerElement: class {
      map: unknown;
      title: string;
      click?: () => void;
      constructor(options: { map: unknown; title: string }) {
        this.map = options.map;
        this.title = options.title;
        mocks.markers.push(this);
      }
      addListener(event: string, callback: () => void) {
        if (event === "click") this.click = callback;
        return { remove: mocks.remove };
      }
    },
  }),
}));

const candidates = ["first", "second"].map((id) => ({
  id, placeId: id, fallbackLabel: `Fallback ${id}`,
  previousWinnerAt: null, canRemoveNomination: false,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.markers.length = 0;
  mocks.details.mockImplementation(async (placeId: string) => ({
    ok: true,
    data: {
      placeId,
      displayName: placeId === "first" ? "First <Restaurant>" : null,
      formattedAddress: placeId === "first" ? "123 Main Street" : null,
      location: { lat: 44.7, lng: -63.6 },
      rating: placeId === "first" ? 4.5 : null,
      userRatingCount: placeId === "first" ? 12 : null,
      priceLevel: null, photo: null, businessStatus: null,
      googleMapsUri: null, types: [],
    } satisfies GooglePlaceDetails,
  }));
});

describe("RestaurantMap", () => {
  it("opens the selected restaurant's native info window and switches pins", async () => {
    const { unmount } = render(<RestaurantMap center={{ lat: 44.65, lng: -63.57 }} centerLabel="Office" candidates={candidates} />);
    await screen.findByText("Map ready.");
    expect(mocks.open).not.toHaveBeenCalled();
    const first = mocks.markers[1];
    first.click?.();
    expect(mocks.open).toHaveBeenLastCalledWith({ map: first.map, anchor: first });
    expect(mocks.setOptions.mock.lastCall?.[0].headerContent.textContent).toBe("First <Restaurant>");
    const content = mocks.setContent.mock.lastCall?.[0] as HTMLElement;
    expect(within(content).getByText("123 Main Street")).toBeTruthy();
    expect(content.textContent).toContain("4.5 ★ (12 reviews)");
    expect(within(content).getByRole("link").getAttribute("href")).toContain("query_place_id=first");

    const second = mocks.markers[2];
    second.click?.();
    expect(mocks.open).toHaveBeenLastCalledWith({ map: second.map, anchor: second });
    expect(mocks.setOptions.mock.lastCall?.[0].ariaLabel).toBe("Fallback second");
    const secondContent = mocks.setContent.mock.lastCall?.[0] as HTMLElement;
    expect(secondContent.textContent).not.toContain("123 Main Street");
    expect(secondContent.textContent).not.toContain("null");
    expect(within(secondContent).getByRole("link").getAttribute("href")).toContain("query_place_id=second");
    unmount();
    expect(mocks.close).toHaveBeenCalledTimes(3);
    expect(mocks.remove).toHaveBeenCalledTimes(2);
    expect(mocks.markers.every((marker) => marker.map === null)).toBe(true);
  });
});
