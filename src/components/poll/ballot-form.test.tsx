import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BallotForm } from "./ballot-form";

// The real "flat" variant renders no interactive children — that is precisely
// what makes wrapping the whole card in a <label> safe. This mock matches it.
vi.mock("@/components/google", () => ({
  GooglePlaceDetailsCard: ({ fallbackLabel }: { fallbackLabel: string }) => (
    <div>
      <span>{fallbackLabel}</span>
    </div>
  ),
}));

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

  it("keeps the selectable card free of nested interactive elements", () => {
    // The whole card is a <label>, so any nested control would steal or
    // double-fire its click. This invariant is what keeps that pattern safe.
    const { container } = render(
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

    const card = container.querySelector("label.select-card");
    expect(card).not.toBeNull();
    expect(
      card!.querySelectorAll("a, button, select, textarea, [role='button']"),
    ).toHaveLength(0);
  });
});
