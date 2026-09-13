import { loadAuthorizedPollRouteData } from "@/lib/google/poll-route-data";
import { createRouteMatrixGetHandler } from "@/lib/google/route-matrix-handler";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = createRouteMatrixGetHandler({
  loadPollRouteData: loadAuthorizedPollRouteData,
});
