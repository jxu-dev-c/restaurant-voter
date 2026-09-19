import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BallotForm } from "./ballot-form";

// Keep the real card content so review-link clicks exercise label behavior.
vi.mock("@/components/google", async () => {
  const { GooglePlaceDetailsView } = await import("@/components/google/google-place-details-view");
  return {
    GooglePlaceDetailsCard: ({ fallbackLabel }: { fallbackLabel: string }) => (
      <GooglePlaceDetailsView variant="flat" place={{
        placeId: "place-id", displayName: fallbackLabel, formattedAddress: null,
        location: null, rating: 4.5, userRatingCount: 100, priceLevel: null,
        photo: null, businessStatus: null, googleMapsUri: null, types: [],
        googleReviewsUri: "https://www.google.com/maps/reviews",
      }} />
    ),
  };
});

vi.mock("./use-route-metrics", () => ({
  useRouteMetrics: () => ({ metrics: new Map(), error: null }),
}));

describe("BallotForm", () => {
  it("allows additional selections when the choice limit increases", async () => {
    const user = userEvent.setup();
    const candidates = ["One", "Two", "Three"].map((label, index) => ({
      id: `candidate-${index}`,
      placeId: `place-${index}`,
      fallbackLabel: `Restaurant ${label}`,
      previousWinnerAt: null,
      canRemoveNomination: false,
    }));
    const props = {
      pollId: "poll-id",
      publicId: "public-id",
      candidates,
      initialCandidateIds: [],
      revision: 0,
      saveAction: vi.fn(),
    };
    const { rerender } = render(<BallotForm {...props} maxChoices={1} />);

    await user.click(screen.getByText("Restaurant One"));
    expect(
      screen.getByRole("checkbox", { name: "Select Restaurant Two" }),
    ).toBeDisabled();

    rerender(<BallotForm {...props} maxChoices={3} />);
    await user.click(screen.getByText("Restaurant Two"));
    await user.click(screen.getByText("Restaurant Three"));

    expect(screen.getByText("3 of 3 selected")).toBeInTheDocument();
    expect(screen.getByText("Choose up to 3")).toBeInTheDocument();
  });

  it("confirms a successful vote can be changed later using the same link", async () => {
    const user = userEvent.setup();
    const saveAction = vi.fn().mockResolvedValue({
      ok: true,
      message: "Your ballot is saved.",
    });

    render(
      <BallotForm
        pollId="poll-id"
        publicId="public-id"
        candidates={[
          {
            id: "candidate-id",
            placeId: "place-id",
            fallbackLabel: "Test Restaurant",
            previousWinnerAt: null,
            canRemoveNomination: false,
          },
        ]}
        initialCandidateIds={[]}
        revision={0}
        maxChoices={2}
        saveAction={saveAction}
      />,
    );

    await user.click(screen.getByText("Test Restaurant"));
    expect(
      screen.getByRole("checkbox", { name: "Select Test Restaurant" }),
    ).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Save ballot" }));

    expect(await screen.findByRole("dialog", { name: "Vote saved" })).toHaveTextContent(
      "You can return using this same link anytime to change them while voting is still open.",
    );
    expect(saveAction).toHaveBeenCalledOnce();
  });

  it("is operable by keyboard alone", async () => {
    const user = userEvent.setup();

    render(
      <BallotForm
        pollId="poll-id"
        publicId="public-id"
        candidates={[
          {
            id: "candidate-id",
            placeId: "place-id",
            fallbackLabel: "Test Restaurant",
            previousWinnerAt: null,
            canRemoveNomination: false,
          },
        ]}
        initialCandidateIds={[]}
        revision={0}
        maxChoices={2}
        saveAction={vi.fn()}
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Select Test Restaurant" });

    // The old implementation was a <div onClick>, which keyboard users could
    // not reach or operate at all. A real checkbox is tabbable and takes space.
    expect(checkbox).not.toBeDisabled();
    expect(checkbox).not.toHaveAttribute("tabindex", "-1");

    checkbox.focus();
    expect(checkbox).toHaveFocus();
    await user.keyboard("[Space]");
    expect(checkbox).toBeChecked();
  });

  it("opens reviews without changing the vote selection", async () => {
    const user = userEvent.setup();
    render(
      <BallotForm
        pollId="poll-id"
        publicId="public-id"
        candidates={[
          {
            id: "candidate-id",
            placeId: "place-id",
            fallbackLabel: "Test Restaurant",
            previousWinnerAt: "2026-08-09T00:00:00.000Z",
            canRemoveNomination: false,
          },
        ]}
        initialCandidateIds={[]}
        revision={0}
        maxChoices={2}
        saveAction={vi.fn()}
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Select Test Restaurant" });
    const reviews = screen.getByRole("link", { name: /Google reviews for Test Restaurant/ });
    await user.click(reviews);
    expect(checkbox).not.toBeChecked();
    await user.click(screen.getByText("Test Restaurant"));
    expect(checkbox).toBeChecked();
    await user.click(reviews);
    expect(checkbox).toBeChecked();
    reviews.focus();
    await user.keyboard("[Enter]");
    expect(checkbox).toBeChecked();
  });
});
