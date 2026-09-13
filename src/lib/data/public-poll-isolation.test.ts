import { expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { createServiceRoleClient } = vi.hoisted(() => ({ createServiceRoleClient: vi.fn() }));
vi.mock("@/lib/supabase/service-role", () => ({ createServiceRoleClient }));
import { getPublicPollView } from "./polls";

it("public referral views use the poll team's labels and winner history", async () => {
  const records: Record<string, Record<string, unknown>[]> = {
    polls: [{ id: "poll-a", public_id: "public-a", team_id: "team-a", status: "nominations", center_latitude: 44, center_longitude: -63 }],
    poll_candidates: [{ id: "candidate-a", poll_id: "poll-a", restaurant_id: "restaurant", fallback_label: "A label", is_active: true,
      restaurants: { id: "restaurant", google_place_id: "shared-place", fallback_label: "Global legacy label" },
    }],
    winner_history: [
      { restaurant_id: "restaurant", team_id: "team-b", won_on: "2026-09-11" },
      { restaurant_id: "restaurant", team_id: "team-a", won_on: "2026-09-01" },
    ],
  };
  createServiceRoleClient.mockReturnValue({ from: (table: string) => {
    let rows = records[table] ?? [];
    const query = {
      select: () => query,
      eq: (key: string, value: unknown) => { rows = rows.filter((row) => row[key] === value); return query; },
      in: (key: string, values: unknown[]) => { rows = rows.filter((row) => values.includes(row[key])); return query; },
      order: () => query,
      maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve),
    };
    return query;
  } });
  const poll = await getPublicPollView("public-a");
  expect(poll?.candidates[0]).toMatchObject({ fallbackLabel: "A label", previousWinnerAt: "2026-09-01" });
  expect(poll).not.toHaveProperty("team_id");
  expect(poll?.currentVoter).toBeNull();
});
