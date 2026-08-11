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
  it("keeps its shadow by default and supports a scoped flat presentation", () => {
    const { rerender } = render(<GooglePlaceDetailsView place={place} />);

    expect(screen.getByRole("article")).toHaveClass("shadow-sm");

    rerender(<GooglePlaceDetailsView elevated={false} place={place} />);

    expect(screen.getByRole("article")).not.toHaveClass("shadow-sm");
  });

  it("renders a compact management row without card semantics", () => {
    render(<GooglePlaceDetailsView place={place} variant="admin-row" />);

    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.getByText("Test Restaurant")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Google Maps" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Photo unavailable" })).toBeInTheDocument();
  });
});
