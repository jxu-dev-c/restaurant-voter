import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import type { GooglePlaceDetails } from "@/lib/google/types";

import { NominationForm } from "./nomination-form";

const selectedPlace: GooglePlaceDetails = {
  placeId: "test-place-id",
  displayName: "Test Restaurant",
  formattedAddress: null,
  location: null,
  rating: null,
  userRatingCount: null,
  priceLevel: null,
  photo: null,
  businessStatus: null,
  googleMapsUri: null,
  types: [],
};

vi.mock("@/components/google", () => ({
  PlaceAutocompleteSearch: ({
    onPlaceSelect,
  }: {
    onPlaceSelect?: (place: GooglePlaceDetails) => void;
  }) => {
    const [hasSelection, setHasSelection] = useState(false);

    return (
      <div>
        <button
          type="button"
          onClick={() => {
            setHasSelection(true);
            onPlaceSelect?.(selectedPlace);
          }}
        >
          Select test restaurant
        </button>
        {hasSelection ? <div>Selected restaurant card</div> : null}
      </div>
    );
  },
}));

describe("NominationForm", () => {
  it("clears the selected restaurant after a successful nomination", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue({
      ok: true,
      message: "Test Restaurant was nominated.",
    });

    render(<NominationForm center={{ lat: 44.65, lng: -63.57 }} action={action} />);

    await user.click(screen.getByRole("button", { name: "Select test restaurant" }));
    expect(screen.getByText("Selected restaurant card")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Nominate this restaurant" }));

    await waitFor(() => {
      expect(screen.queryByText("Selected restaurant card")).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Nominate this restaurant" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Test Restaurant was nominated.");
    expect(action).toHaveBeenCalledOnce();
    expect(action.mock.calls[0]?.[1]).toBeInstanceOf(FormData);
    expect((action.mock.calls[0]?.[1] as FormData).get("placeId")).toBe("test-place-id");
  });
});
