import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PollLimitForm } from "./poll-limit-form";

describe("PollLimitForm", () => {
  it("allows both limits to increase while nominations are open", () => {
    render(
      <PollLimitForm
        action={vi.fn()}
        activeCandidateCount={4}
        poll={{
          id: "11111111-1111-4111-8111-111111111111",
          status: "nominations",
          allowsVoterNominations: true,
          maxChoices: 2,
          nominationLimit: 5,
        }}
      />,
    );

    expect(screen.getByLabelText("Choices per voter")).toHaveAttribute("min", "2");
    expect(screen.getByLabelText("Choices per voter")).toHaveAttribute("max", "10");
    expect(screen.getByLabelText("Nominations per voter")).toHaveAttribute("min", "5");
    expect(screen.getByRole("button", { name: "Update limits" })).toBeEnabled();
  });

  it("only allows the choice limit to increase during voting", () => {
    render(
      <PollLimitForm
        action={vi.fn()}
        activeCandidateCount={5}
        poll={{
          id: "11111111-1111-4111-8111-111111111111",
          status: "voting",
          allowsVoterNominations: true,
          maxChoices: 3,
          nominationLimit: 5,
        }}
      />,
    );

    expect(screen.getByLabelText("Choices per voter")).toHaveAttribute("max", "5");
    expect(screen.queryByLabelText("Nominations per voter")).not.toBeInTheDocument();
    expect(screen.getByText("Locked when voting begins.")).toBeInTheDocument();
  });

  it("renders closed poll limits without an update action", () => {
    render(
      <PollLimitForm
        action={vi.fn()}
        activeCandidateCount={5}
        poll={{
          id: "11111111-1111-4111-8111-111111111111",
          status: "closed",
          allowsVoterNominations: true,
          maxChoices: 3,
          nominationLimit: 5,
        }}
      />,
    );

    expect(screen.getByText("Up to 3")).toBeInTheDocument();
    expect(screen.getByText("Up to 5")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Update limits" })).not.toBeInTheDocument();
  });
});
