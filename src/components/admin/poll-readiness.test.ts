import { describe, expect, it } from "vitest";

import type { AdminPollDetail } from "@/lib/domain/types";

import { derivePollReadiness } from "./poll-readiness";

function makePoll(overrides: Partial<AdminPollDetail> = {}): AdminPollDetail {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    publicId: "poll-public-id",
    title: "Team lunch",
    status: "draft",
    outcomeStatus: "pending",
    allowsVoterNominations: true,
    nominationLimit: 5,
    maxChoices: 2,
    center: { label: "Office", latitude: 44.65, longitude: -63.57 },
    candidates: [
      {
        id: "22222222-2222-4222-8222-222222222222",
        restaurantId: "33333333-3333-4333-8333-333333333333",
        placeId: "place-one",
        fallbackLabel: "Restaurant One",
        source: "admin",
        status: "active",
        previousWinnerAt: null,
        canRemoveNomination: false,
      },
      {
        id: "44444444-4444-4444-8444-444444444444",
        restaurantId: "55555555-5555-4555-8555-555555555555",
        placeId: "place-two",
        fallbackLabel: "Restaurant Two",
        source: "voter",
        status: "active",
        previousWinnerAt: null,
        canRemoveNomination: false,
      },
    ],
    currentVoter: null,
    ballot: null,
    winnerCandidateId: null,
    closedAt: null,
    accessVersion: 1,
    voters: [],
    createdAt: "2026-08-11T12:00:00.000Z",
    ...overrides,
  };
}

describe("derivePollReadiness", () => {
  it("opens nominations first when voter nominations are enabled", () => {
    expect(derivePollReadiness(makePoll())).toEqual({
      activeCandidateCount: 2,
      blockers: [],
      canAdvance: true,
      nextStatus: "nominations",
    });
  });

  it("skips nominations for an admin-managed shortlist", () => {
    expect(derivePollReadiness(makePoll({ allowsVoterNominations: false })).nextStatus).toBe("voting");
  });

  it("explains every condition blocking voting", () => {
    const poll = makePoll({
      status: "nominations",
      maxChoices: 3,
      candidates: makePoll().candidates.map((candidate) => ({ ...candidate, status: "removed" })),
    });

    expect(derivePollReadiness(poll)).toEqual({
      activeCandidateCount: 0,
      blockers: [
        "Add at least one active restaurant before opening the poll.",
        "Reduce the choice limit or add 3 more active restaurants.",
      ],
      canAdvance: false,
      nextStatus: "voting",
    });
  });

  it("has no advance action after voting starts", () => {
    expect(derivePollReadiness(makePoll({ status: "voting" }))).toMatchObject({
      blockers: [],
      canAdvance: false,
      nextStatus: null,
    });
  });
});
