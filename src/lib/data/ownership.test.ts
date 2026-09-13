import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { assertAdmin, createServiceRoleClient } = vi.hoisted(() => ({
  assertAdmin: vi.fn(),
  createServiceRoleClient: vi.fn(),
}));
vi.mock("@/lib/auth/admin", () => ({ assertAdmin, requireAdmin: assertAdmin }));
vi.mock("@/lib/supabase/service-role", () => ({ createServiceRoleClient }));

import { requireOwnedPoll } from "./ownership";
import * as mutations from "./mutations";
import { getAdminPollDetail, listAdminPolls, listLunchCenters, listWinnerHistory } from "./polls";

const user = { id: "organizer-a", email: "a@example.com" };
const records: Record<string, Record<string, unknown>[]> = {
  organizer_email_allowlist: [
    { email: "a@example.com", team_id: "team-a", teams: { name: "Team A", slug: "team-a" } },
    { email: "teammate-b@example.com", team_id: "team-b", teams: { name: "Team B", slug: "team-b" } },
    { email: "b@example.com", team_id: "team-b", teams: { name: "Team B", slug: "team-b" } },
  ],
  polls: [{ id: "poll-b", owner_id: "organizer-b", team_id: "team-b" }],
  lunch_centers: [{ id: "center-b", owner_id: "organizer-b", team_id: "team-b" }],
  winner_history: [{ id: "winner-b", owner_id: "organizer-b", team_id: "team-b" }],
  poll_candidates: [{ poll_id: "poll-b", is_active: true, "polls.team_id": "team-b" }],
  ballots: [{ poll_id: "poll-b", is_submitted: true, "polls.team_id": "team-b" }],
};
const rpc = vi.fn();
const insert = vi.fn();
const from = vi.fn((table: string) => {
  let rows = records[table] ?? [];
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn((key: string, value: unknown) => { rows = rows.filter((row) => row[key] === value); return query; }),
    order: vi.fn(() => query),
    insert,
    maybeSingle: vi.fn(async () => ({ data: rows[0] ?? null, error: null })),
    single: vi.fn(async () => ({ data: rows[0] ?? null, error: rows.length ? null : { message: "No rows" } })),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve),
  };
  return query;
});

beforeEach(() => {
  vi.clearAllMocks();
  assertAdmin.mockResolvedValue(user);
  createServiceRoleClient.mockReturnValue({ from, rpc });
});

describe("organizer team access", () => {
  it("requires authentication before reading any workspace", async () => {
    assertAdmin.mockRejectedValue(new Error("Authentication required"));
    for (const read of [listAdminPolls, listLunchCenters, listWinnerHistory, () => getAdminPollDetail("poll-b")]) {
      await expect(read()).rejects.toThrow("Authentication required");
    }
    expect(from).not.toHaveBeenCalled();
  });

  it("hides another team's polls, centers, winner history, and poll detail", async () => {
    await expect(listAdminPolls()).resolves.toEqual([]);
    await expect(listLunchCenters()).resolves.toEqual([]);
    await expect(listWinnerHistory()).resolves.toEqual([]);
    from.mockClear();
    await expect(getAdminPollDetail("poll-b")).resolves.toBeNull();
    expect(from).toHaveBeenCalledTimes(2); // Allowlist and poll only; no private poll details are loaded.
  });

  it("authorizes a teammate even when another organizer created the poll", async () => {
    assertAdmin.mockResolvedValue({ id: "organizer-c", email: "teammate-b@example.com" });
    await expect(requireOwnedPoll("poll-b")).resolves.toEqual({
      id: "organizer-c",
      email: "teammate-b@example.com",
      teamId: "team-b",
      teamName: "Team B",
      teamSlug: "team-b",
    });
  });

  it("rejects a verified user who is no longer assigned in the allowlist", async () => {
    assertAdmin.mockResolvedValue({ id: "removed", email: "removed@example.com" });
    await expect(requireOwnedPoll("poll-b")).rejects.toThrow("Organizer is not assigned to a team");
  });

  it("rejects unknown polls with the same error as foreign polls", async () => {
    await expect(requireOwnedPoll("missing")).rejects.toThrow("Poll not found or access denied");
    await expect(requireOwnedPoll("poll-b")).rejects.toThrow("Poll not found or access denied");
  });

  const pollId = "poll-b";
  it.each([
    ["duplicate", () => mutations.duplicatePoll({ pollId })],
    ["transition", () => mutations.transitionPoll({ pollId, targetStatus: "voting" })],
    ["limits", () => mutations.updatePollLimits({ pollId, voteLimit: 2, nominationLimit: 5 })],
    ["close", () => mutations.closePoll({ pollId })],
    ["tie", () => mutations.resolvePollTie({ pollId, candidateId: "candidate" })],
    ["rotate", () => mutations.rotatePollAccess({ pollId })],
    ["candidate", () => mutations.seedPollCandidate({ pollId, placeId: "place" })],
    ["toggle", () => mutations.setPollCandidateActive({ pollId, candidateId: "candidate", active: false })],
    ["remove voter", () => mutations.removePollVoter({ pollId, voterId: "voter" })],
  ])("blocks cross-team %s mutations before any writes", async (_name, run) => {
    await expect(run()).rejects.toThrow("Poll not found or access denied");
    expect(rpc).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("cannot create a poll using another team's center", async () => {
    await expect(mutations.createPoll({
      title: "Test", lunchCenterId: "center-b", voteLimit: 1, nominationLimit: 5, nominationsEnabled: true,
    })).rejects.toThrow("Unable to load lunch center");
    expect(insert).not.toHaveBeenCalled();
  });

  it("passes the verified organizer email to the audit RPC", async () => {
    assertAdmin.mockResolvedValue({ id: "organizer-b", email: "b@example.com" });
    rpc.mockResolvedValue({ data: null, error: null });
    await mutations.rotatePollAccess({ pollId });
    expect(rpc).toHaveBeenCalledWith("rotate_poll_access", { p_poll_id: pollId, p_admin_email: "b@example.com" });
  });
});
