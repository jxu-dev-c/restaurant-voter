import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AdminPollDetail } from "@/lib/domain/types";

import { PhaseControls } from "./phase-controls";

function makePoll(overrides: Partial<AdminPollDetail> = {}): AdminPollDetail {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    publicId: "poll-public-id",
    title: "Team lunch",
    status: "draft",
    outcomeStatus: "pending",
    allowsVoterNominations: true,
    nominationLimit: 3,
    maxChoices: 2,
    center: { label: "Office", latitude: 44.65, longitude: -63.57 },
    candidates: [],
    currentVoter: null,
    ballot: null,
    winnerCandidateId: null,
    closedAt: null,
    accessVersion: 1,
    voters: [],
    createdAt: "2026-10-16T12:00:00.000Z",
    ...overrides,
  };
}

function renderControls(poll: AdminPollDetail) {
  return render(
    <PhaseControls
      closeAction={vi.fn()}
      poll={poll}
      resolveTieAction={vi.fn()}
      transitionAction={vi.fn()}
    />,
  );
}

describe("PhaseControls", () => {
  it.each(["draft", "nominations"] as const)("leaves the early close to the settings tab while %s", (status) => {
    renderControls(makePoll({ status }));

    expect(screen.queryByRole("button", { name: "Close poll early" })).not.toBeInTheDocument();
  });

  it("offers the publishing close during voting", () => {
    renderControls(makePoll({ status: "voting" }));

    expect(screen.getByRole("button", { name: "Close voting and publish" })).toBeInTheDocument();
  });

  it("explains a poll that was closed early", () => {
    renderControls(
      makePoll({ status: "closed", outcomeStatus: "cancelled", closedAt: "2026-10-16T13:00:00.000Z" }),
    );

    expect(screen.getByRole("heading", { name: "Poll closed early" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Closed before voting" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close poll early" })).not.toBeInTheDocument();
  });
});
