import "server-only";

import { getAuthorizedPoll } from "@/lib/data/access";
import { getPollRouteData } from "@/lib/data/polls";
import type { LatLngLiteral } from "./types";

export type AuthorizedPollRouteData = {
  center: LatLngLiteral;
  /** Active, voting-locked poll candidates, loaded from the database. */
  candidatePlaceIds: string[];
};

export type PollRouteDataResult =
  | { ok: true; data: AuthorizedPollRouteData }
  | {
      ok: false;
      status: 401 | 403 | 404 | 503;
      error: {
        code: string;
        message: string;
      };
    };

export type PollRouteDataLoader = (input: {
  publicId: string;
  request: Request;
}) => Promise<PollRouteDataResult>;

/**
 * Loads route inputs exclusively from the authorized poll record. The handler
 * accepts no client-supplied origin or destination values, so it cannot become
 * an authenticated general-purpose Google API proxy.
 */
export const loadAuthorizedPollRouteData: PollRouteDataLoader = async ({ publicId }) => {
  try {
    const authorizedPoll = await getAuthorizedPoll(publicId);
    if (!authorizedPoll) {
      return {
        ok: false,
        status: 401,
        error: {
          code: "poll_access_required",
          message: "A valid referral link is required.",
        },
      };
    }

    const routeData = await getPollRouteData(publicId);
    if (!routeData) {
      return {
        ok: false,
        status: 404,
        error: {
          code: "poll_not_found",
          message: "The poll is unavailable.",
        },
      };
    }

    return {
      ok: true,
      data: {
        center: {
          lat: routeData.center.latitude,
          lng: routeData.center.longitude,
        },
        candidatePlaceIds: routeData.destinations.map((destination) => destination.placeId),
      },
    };
  } catch {
    return {
      ok: false,
      status: 503,
      error: {
        code: "poll_route_data_unavailable",
        message: "Route data is temporarily unavailable.",
      },
    };
  }
};
