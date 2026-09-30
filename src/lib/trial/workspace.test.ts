import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { cookieGet, cookieSet, maybeSingle, rpc, verifyTrialSession } = vi.hoisted(() => ({
  cookieGet: vi.fn(), cookieSet: vi.fn(), maybeSingle: vi.fn(), rpc: vi.fn(), verifyTrialSession: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: cookieGet, set: cookieSet }) }));
vi.mock("./token", () => ({ verifyTrialSession }));
vi.mock("@/lib/supabase/service-role", () => ({ createServiceRoleClient: () => ({
  rpc,
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
}) }));
import { TRIAL_TEAM_ID } from "./constants";
import { ensureTrialWorkspace, getTrialOrganizer } from "./workspace";

const generation = "00000000-0000-4000-8000-000000000011";
const row = {
  generation, resets_at: "2099-01-01T00:00:00+00:00",
  teams: { id: TRIAL_TEAM_ID, slug: "trial", name: "Trial", is_trial: true },
};
beforeEach(() => {
  vi.clearAllMocks();
  cookieGet.mockReturnValue({ value: "signed-token" });
  verifyTrialSession.mockReturnValue({ generation });
  maybeSingle.mockResolvedValue({ data: row, error: null });
});
it("requires a valid trial cookie before querying the trial team", async () => {
  verifyTrialSession.mockReturnValue(null);
  await expect(getTrialOrganizer()).rejects.toThrow("trial session has ended");
  expect(maybeSingle).not.toHaveBeenCalled();
});
it("derives the reserved team from server data", async () => {
  await expect(getTrialOrganizer()).resolves.toMatchObject({ id: null, teamId: TRIAL_TEAM_ID, trialResetsAt: row.resets_at });
});
it.each([
  { ...row, generation: "00000000-0000-4000-8000-000000000012" },
  { ...row, resets_at: "2000-01-01T00:00:00Z" },
  { ...row, teams: { ...row.teams, is_trial: false } },
  { ...row, teams: { ...row.teams, id: "normal-team" } },
  { ...row, teams: { ...row.teams, slug: "nrg" } },
  null,
])("rejects revoked, expired, or misconfigured trial teams", async (data) => {
  maybeSingle.mockResolvedValue({ data, error: null });
  await expect(getTrialOrganizer()).rejects.toThrow("trial session has ended");
});
it("rejects a workspace RPC response naming a normal team", async () => {
  rpc.mockResolvedValue({ data: [{ team_id: "normal-team" }], error: null });
  await expect(ensureTrialWorkspace()).rejects.toThrow();
});
it("fails closed when the database check fails", async () => {
  maybeSingle.mockResolvedValue({ data: null, error: { message: "Offline" } });
  await expect(getTrialOrganizer()).rejects.toThrow("Unable to verify trial workspace");
});
