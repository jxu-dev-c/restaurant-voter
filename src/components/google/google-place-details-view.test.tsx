import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { GooglePlaceDetails } from "@/lib/google/types";

import { GooglePlaceDetailsView } from "./google-place-details-view";

const place: GooglePlaceDetails = {
  placeId: "test-place-id",
  displayName: "Test Restaurant",
  formattedAddress: "123 Test Street",
  location: null,
  rating: 4.5,
  userRatingCount: 100,
  priceLevel: null,
  photo: null,
  businessStatus: null,
  googleMapsUri: null,
  types: [],
};

describe("GooglePlaceDetailsView", () => {
  it.each(["card", "flat", "admin-row"] as const)("shows poll-day hours instead of operational status in %s", (variant) => {
    render(<GooglePlaceDetailsView variant={variant} place={{
      ...place,
      businessStatus: "OPERATIONAL",
      openingPeriods: [{
        open: { day: 2, hour: 11, minute: 0 },
        close: { day: 2, hour: 21, minute: 0 },
      }],
    }} />);
    expect(screen.getByText("11 AM–9 PM")).toBeInTheDocument();
    expect(screen.queryByText("Operational")).not.toBeInTheDocument();
  });

  it("links the flat card rating to Google reviews in a new tab", () => {
    render(<GooglePlaceDetailsView variant="flat" place={{
      ...place, googleReviewsUri: "https://www.google.com/maps/reviews",
    }} />);
    const link = screen.getByRole("link", { name: /4.5 \(100\).*Google reviews for Test Restaurant/ });
    expect(link).toHaveAttribute("href", "https://www.google.com/maps/reviews");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveClass("hover:decoration-current", "focus-visible:decoration-current");
  });

  it("falls back to the place listing when Google provides no reviews URL", () => {
    render(<GooglePlaceDetailsView variant="flat" place={{
      ...place, googleMapsUri: "https://www.google.com/maps/place/test",
    }} />);
    expect(screen.getByRole("link", { name: /Google reviews/ }))
      .toHaveAttribute("href", "https://www.google.com/maps/place/test");
  });

  it("renders the card variant as a flat panel with no shadow", () => {
    render(<GooglePlaceDetailsView place={place} />);

    const article = screen.getByRole("article");
    expect(article).toHaveClass("panel");
    expect(article.className).not.toMatch(/shadow/);
  });

  it("renders the flat variant with no card wrapper, for nesting inside a selectable card", () => {
    render(<GooglePlaceDetailsView place={place} variant="flat" />);

    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Test Restaurant" })).toBeInTheDocument();
    expect(screen.getByText("123 Test Street")).toBeInTheDocument();
  });

  it("renders a compact management row without card semantics", () => {
    render(<GooglePlaceDetailsView place={place} variant="admin-row" />);

    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.getByText("Test Restaurant")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Google Maps" })).toBeInTheDocument();
  });

  it("hides the photo fallback tile from assistive tech, since the name is already adjacent", () => {
    render(<GooglePlaceDetailsView place={place} variant="admin-row" />);

    // The tile is decorative: announcing "no photo" adds noise, not information.
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Test Restaurant" })).toBeInTheDocument();
  });
});
