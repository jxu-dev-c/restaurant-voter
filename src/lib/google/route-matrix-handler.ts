import "server-only";

import type { PollRouteDataLoader } from "./poll-route-data";
import {
  computeRouteMatrix,
  type ComputeRouteMatrixInput,
} from "./server-routes";
import type { GoogleApiResult, RouteMatrix } from "./types";

type RouteContext = {
  params: Promise<{ publicId: string }>;
};

type RouteMatrixComputer = (
  input: ComputeRouteMatrixInput,
) => Promise<GoogleApiResult<RouteMatrix>>;

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  Vary: "Cookie",
};

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function normalizeCandidatePlaceIds(values: readonly string[]): string[] | null {
  const placeIds = [...new Set(values.map((value) => value.trim()))];
  if (
    placeIds.length > 50 ||
    placeIds.some((value) => !value || value.length > 512)
  ) {
    return null;
  }
  return placeIds;
}

export function createRouteMatrixGetHandler(dependencies: {
  loadPollRouteData: PollRouteDataLoader;
  computeMatrix?: RouteMatrixComputer;
}) {
  const computeMatrix = dependencies.computeMatrix ?? computeRouteMatrix;

  return async function GET(
    request: Request,
    context: RouteContext,
  ): Promise<Response> {
    const { publicId } = await context.params;
    if (!publicId.trim() || publicId.length > 200) {
      return json(
        { error: { code: "invalid_poll", message: "Poll not found." } },
        404,
      );
    }

    try {
      const access = await dependencies.loadPollRouteData({ publicId, request });
      if (!access.ok) {
        return json({ error: access.error }, access.status);
      }

      const candidatePlaceIds = normalizeCandidatePlaceIds(
        access.data.candidatePlaceIds,
      );
      if (!candidatePlaceIds) {
        return json(
          {
            error: {
              code: "invalid_poll_route_data",
              message: "Route data is temporarily unavailable.",
            },
          },
          503,
        );
      }

      const result = await computeMatrix({
        origin: access.data.center,
        destinationPlaceIds: candidatePlaceIds,
      });
      if (!result.ok) {
        const status = result.error.code === "invalid_request" ? 503 : 502;
        return json({ error: result.error }, status);
      }

      return json(result.data);
    } catch {
      return json(
        {
          error: {
            code: "route_data_unavailable",
            message: "Route data is temporarily unavailable.",
          },
        },
        503,
      );
    }
  };
}
