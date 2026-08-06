import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BallotForm } from "./ballot-form";

vi.mock("@/components/google", () => ({
  GooglePlaceDetailsCard: ({ fallbackLabel }: { fallbackLabel: string }) => (
    <div>
      <span>{fallbackLabel}</span>
      <a href="#details">View details</a>
    </div>
  ),
}));

vi.mock("./use-route-metrics", () => ({
  useRouteMetrics: () => ({ metrics: new Map(), error: null }),
}));

describe("BallotForm", () => {
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
      screen.getByRole("checkbox", { name: "Restaurant option 1: include in ballot" }),
    ).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Save ballot" }));

    expect(await screen.findByRole("dialog", { name: "Vote saved" })).toHaveTextContent(
      "You can return using this same link anytime to change them while voting is still open.",
    );
    expect(saveAction).toHaveBeenCalledOnce();
  });

  it("does not change the selection when a link inside the card is clicked", async () => {
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

    await user.click(screen.getByRole("link", { name: "View details" }));

    expect(
      screen.getByRole("checkbox", { name: "Restaurant option 1: include in ballot" }),
    ).not.toBeChecked();
  });
});
