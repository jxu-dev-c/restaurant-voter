import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { computeRouteMatrix } from "./server-routes";

const origin = { lat: 44.6488, lng: -63.5752 };

it("provides sample estimates without contacting Google", async () => {
  const fetchImpl = vi.fn();
  const result = await computeRouteMatrix({
    origin, destinationPlaceIds: ["lunchpick-trial-sample-1", "lunchpick-trial-sample-2"], fetchImpl,
  });
  expect(fetchImpl).not.toHaveBeenCalled();
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Expected sample routes");
  expect(result.data.routes).toHaveLength(2);
  expect(result.data.routes[0].distanceMeters).toBeGreaterThan(0);
  expect(result.data.routes[0].durationSeconds).toBeGreaterThan(0);
});

it("keeps sample IDs out of live requests while preserving mixed shortlist order", async () => {
  const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify([
    { destinationIndex: 0, condition: "ROUTE_EXISTS", distanceMeters: 1500, duration: "300s", status: { code: 0 } },
  ]), { status: 200 }));
  const result = await computeRouteMatrix({
    origin, destinationPlaceIds: ["lunchpick-trial-sample-1", "real-place", "lunchpick-trial-sample-2"],
    apiKey: "test-server-key", fetchImpl,
  });
  expect(fetchImpl).toHaveBeenCalledOnce();
  const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
  expect(body.destinations).toEqual([{ waypoint: { placeId: "real-place" } }]);
  expect(result).toMatchObject({ ok: true, data: { routes: [
    { placeId: "lunchpick-trial-sample-1", destinationIndex: 0 },
    { placeId: "real-place", destinationIndex: 1, distanceMeters: 1500, durationSeconds: 300 },
    { placeId: "lunchpick-trial-sample-2", destinationIndex: 2 },
  ] } });
});
