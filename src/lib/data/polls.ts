import "server-only";

import { cache } from "react";
import { requireOrganizerPage } from "@/lib/data/ownership";
import type {
  AdminPollDetail,
  AdminPollSummary,
  CandidateView,
  LunchCenter,
  PublicPollView,
  WinnerHistoryView,
} from "@/lib/domain/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type PollRow = {
  team_id: string;
  id: string;
  public_id: string;
  title: string;
  status: PublicPollView["status"];
  outcome_status: PublicPollView["outcomeStatus"];
  center_name: string;
  center_latitude: number;
  center_longitude: number;
  vote_limit: number;
  nomination_limit: number;
  nominations_enabled: boolean;
  access_version: number;
  official_winner_candidate_id: string | null;
  closed_at: string | null;
  created_at: string;
};

type CandidateRow = {
  fallback_label: string | null;
  id: string;
  restaurant_id: string;
  source: CandidateView["source"];
  is_active: boolean;
  nominated_by_voter_id: string | null;
  restaurants: {
    id: string;
    google_place_id: string;
  } | Array<{
    id: string;
    google_place_id: string;
  }>;
};

type LoadedCandidateView = CandidateView & {
  nominatedByVoterId: string | null;
};

function restaurantFromCandidate(row: CandidateRow) {
  return Array.isArray(row.restaurants) ? row.restaurants[0] : row.restaurants;
}

function assertQuery<T>(data: T | null, error: { message: string } | null, context: string): T {
  if (error) throw new Error(`${context}: ${error.message}`);
  if (data === null) throw new Error(`${context}: no data returned`);
  return data;
}

export type PollAccessRecord = {
  id: string;
  publicId: string;
  status: PublicPollView["status"];
  accessVersion: number;
};

export const getPollAccessRecord = cache(async (publicId: string): Promise<PollAccessRecord | null> => {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("polls")
    .select("id,public_id,status,access_version")
    .eq("public_id", publicId)
    .maybeSingle();

  if (error) throw new Error(`Unable to load poll access record: ${error.message}`);
  if (!data) return null;

  return {
    id: data.id,
    publicId: data.public_id,
    status: data.status as PollAccessRecord["status"],
    accessVersion: data.access_version,
  };
});

async function loadCandidateViews(
  pollId: string,
  options: { includeRemoved: boolean; includeResults: boolean; teamId: string },
): Promise<LoadedCandidateView[]> {
  const supabase = createServiceRoleClient();
  let candidateQuery = supabase
    .from("poll_candidates")
    .select("id,restaurant_id,fallback_label,source,is_active,nominated_by_voter_id,restaurants!inner(id,google_place_id)")
    .eq("poll_id", pollId)
    .order("created_at", { ascending: true });

  if (!options.includeRemoved) candidateQuery = candidateQuery.eq("is_active", true);

  const { data: candidateData, error: candidateError } = await candidateQuery;
  const candidateRows = assertQuery(candidateData as CandidateRow[] | null, candidateError, "Unable to load candidates");
  const restaurantIds = candidateRows.map((row) => row.restaurant_id);

  const [winnerResponse, resultResponse] = await Promise.all([
    restaurantIds.length
      ? supabase
          .from("winner_history")
          .select("restaurant_id,won_on")
          .in("restaurant_id", restaurantIds)
          .eq("team_id", options.teamId)
          .order("won_on", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    options.includeResults
      ? supabase.from("poll_results").select("candidate_id,vote_count,rank").eq("poll_id", pollId)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (winnerResponse.error) throw new Error(`Unable to load winner history: ${winnerResponse.error.message}`);
  if (resultResponse.error) throw new Error(`Unable to load poll results: ${resultResponse.error.message}`);

  const latestWinByRestaurant = new Map<string, string>();
  for (const win of winnerResponse.data ?? []) {
    if (!latestWinByRestaurant.has(win.restaurant_id)) {
      latestWinByRestaurant.set(win.restaurant_id, win.won_on);
    }
  }
  const resultByCandidate = new Map(
    (resultResponse.data ?? []).map((result) => [result.candidate_id, result]),
  );

  return candidateRows.map((row) => {
    const restaurant = restaurantFromCandidate(row);
    return {
      id: row.id,
      restaurantId: row.restaurant_id,
      placeId: restaurant.google_place_id,
      fallbackLabel: row.fallback_label ?? "Restaurant",
      source: row.source,
      status: row.is_active ? "active" : "removed",
      previousWinnerAt: latestWinByRestaurant.get(row.restaurant_id) ?? null,
      canRemoveNomination: false,
      nominatedByVoterId: row.nominated_by_voter_id,
      ...(options.includeResults
        ? {
            voteCount: resultByCandidate.get(row.id)?.vote_count ?? 0,
            resultRank: resultByCandidate.get(row.id)?.rank ?? undefined,
          }
        : {}),
    };
  });
}

function publicCandidateView(
  candidate: LoadedCandidateView,
  options: { voterId?: string | null; nominationsOpen?: boolean } = {},
): CandidateView {
  const { nominatedByVoterId, ...view } = candidate;
  return {
    ...view,
    canRemoveNomination:
      options.nominationsOpen === true &&
      candidate.source === "voter" &&
      nominatedByVoterId === options.voterId,
  };
}

export async function getPublicPollView(
  publicId: string,
  deviceHash?: string | null,
): Promise<PublicPollView | null> {
  const supabase = createServiceRoleClient();
  const { data: pollData, error: pollError } = await supabase
    .from("polls")
    .select(
      "id,team_id,public_id,title,status,outcome_status,center_name,center_latitude,center_longitude,vote_limit,nomination_limit,nominations_enabled,access_version,official_winner_candidate_id,closed_at,created_at",
    )
    .eq("public_id", publicId)
    .maybeSingle();

  if (pollError) throw new Error(`Unable to load poll: ${pollError.message}`);
  if (!pollData) return null;
  const poll = pollData as PollRow;

  const [loadedCandidates, voterResponse] = await Promise.all([
    loadCandidateViews(poll.id, {
      includeRemoved: false,
      includeResults: poll.status === "closed",
      teamId: poll.team_id,
    }),
    deviceHash
      ? supabase
          .from("poll_voters")
          .select("id,display_name,voter_code")
          .eq("poll_id", poll.id)
          .eq("device_hash", deviceHash)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (voterResponse.error) throw new Error(`Unable to load voter: ${voterResponse.error.message}`);
  const voter = voterResponse.data;
  const candidates = loadedCandidates.map((candidate) =>
    publicCandidateView(candidate, {
      voterId: voter?.id,
      nominationsOpen: poll.status === "nominations" && poll.nominations_enabled,
    }),
  );
  let ballot: PublicPollView["ballot"] = null;

  if (voter) {
    const { data: ballotData, error: ballotError } = await supabase
      .from("ballots")
      .select("id,revision,is_submitted,submitted_at")
      .eq("poll_id", poll.id)
      .eq("voter_id", voter.id)
      .maybeSingle();
    if (ballotError) throw new Error(`Unable to load ballot: ${ballotError.message}`);

    if (ballotData) {
      const { data: choiceData, error: choiceError } = await supabase
        .from("ballot_choices")
        .select("candidate_id")
        .eq("ballot_id", ballotData.id);
      if (choiceError) throw new Error(`Unable to load ballot choices: ${choiceError.message}`);
      ballot = {
        revision: ballotData.revision,
        candidateIds: ballotData.is_submitted ? (choiceData ?? []).map((choice) => choice.candidate_id) : [],
        submittedAt: ballotData.is_submitted ? ballotData.submitted_at : null,
      };
    }
  }

  return {
    id: poll.id,
    publicId: poll.public_id,
    title: poll.title,
    status: poll.status,
    outcomeStatus: poll.outcome_status,
    allowsVoterNominations: poll.nominations_enabled,
    nominationLimit: poll.nomination_limit,
    maxChoices: poll.vote_limit,
    center: {
      label: poll.center_name,
      latitude: Number(poll.center_latitude),
      longitude: Number(poll.center_longitude),
    },
    candidates,
    currentVoter: voter
      ? { id: voter.id, displayName: voter.display_name, voterCode: voter.voter_code }
      : null,
    ballot,
    winnerCandidateId: poll.official_winner_candidate_id,
    closedAt: poll.closed_at,
  };
}

export async function listLunchCenters(): Promise<LunchCenter[]> {
  const organizer = await requireOrganizerPage({ returnTo: "/admin/centers" });
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("lunch_centers")
    .select("id,name,latitude,longitude")
    .eq("team_id", organizer.teamId)
    .order("name");
  if (error) throw new Error(`Unable to load lunch centers: ${error.message}`);

  return (data ?? []).map((center) => ({
    id: center.id,
    label: center.name,
    latitude: Number(center.latitude),
    longitude: Number(center.longitude),
  }));
}

export async function listAdminPolls(): Promise<AdminPollSummary[]> {
  const organizer = await requireOrganizerPage({ returnTo: "/admin" });
  const supabase = createServiceRoleClient();
  const [pollResponse, candidateResponse, ballotResponse] = await Promise.all([
    supabase
      .from("polls")
      .select(
        "id,public_id,title,status,outcome_status,center_name,vote_limit,created_at,closed_at",
      )
      .eq("team_id", organizer.teamId)
      .order("created_at", { ascending: false }),
    supabase.from("poll_candidates").select("poll_id,is_active,polls!poll_candidates_poll_id_fkey!inner(team_id)").eq("polls.team_id", organizer.teamId),
    supabase.from("ballots").select("poll_id,is_submitted,polls!ballots_poll_id_fkey!inner(team_id)").eq("polls.team_id", organizer.teamId),
  ]);

  if (pollResponse.error) throw new Error(`Unable to load polls: ${pollResponse.error.message}`);
  if (candidateResponse.error) throw new Error(`Unable to count candidates: ${candidateResponse.error.message}`);
  if (ballotResponse.error) throw new Error(`Unable to count ballots: ${ballotResponse.error.message}`);

  const candidateCounts = new Map<string, number>();
  for (const row of candidateResponse.data ?? []) {
    if (row.is_active) candidateCounts.set(row.poll_id, (candidateCounts.get(row.poll_id) ?? 0) + 1);
  }
  const ballotCounts = new Map<string, number>();
  for (const row of ballotResponse.data ?? []) {
    if (row.is_submitted) ballotCounts.set(row.poll_id, (ballotCounts.get(row.poll_id) ?? 0) + 1);
  }

  return (pollResponse.data ?? []).map((poll) => ({
    id: poll.id,
    publicId: poll.public_id,
    title: poll.title,
    status: poll.status as AdminPollSummary["status"],
    outcomeStatus: poll.outcome_status as AdminPollSummary["outcomeStatus"],
    activeCandidateCount: candidateCounts.get(poll.id) ?? 0,
    submittedBallotCount: ballotCounts.get(poll.id) ?? 0,
    maxChoices: poll.vote_limit,
    centerLabel: poll.center_name,
    createdAt: poll.created_at,
    closedAt: poll.closed_at,
  }));
}

export async function getAdminPollDetail(pollId: string): Promise<AdminPollDetail | null> {
  const organizer = await requireOrganizerPage({ returnTo: `/admin/polls/${pollId}` });
  const supabase = createServiceRoleClient();
  const { data: pollData, error: pollError } = await supabase
    .from("polls")
    .select(
      "id,team_id,public_id,title,status,outcome_status,center_name,center_latitude,center_longitude,vote_limit,nomination_limit,nominations_enabled,access_version,official_winner_candidate_id,closed_at,created_at",
    )
    .eq("id", pollId)
    .eq("team_id", organizer.teamId)
    .maybeSingle();
  if (pollError) throw new Error(`Unable to load admin poll: ${pollError.message}`);
  if (!pollData) return null;
  const poll = pollData as PollRow;

  const [loadedCandidates, voterResponse, ballotResponse] = await Promise.all([
    loadCandidateViews(poll.id, {
      includeRemoved: true,
      includeResults: poll.status === "closed",
      teamId: poll.team_id,
    }),
    supabase
      .from("poll_voters")
      .select("id,display_name,voter_code")
      .eq("poll_id", poll.id)
      .is("anonymized_at", null)
      .order("registered_at"),
    supabase
      .from("ballots")
      .select("id,voter_id,is_submitted,submitted_at")
      .eq("poll_id", poll.id),
  ]);

  if (voterResponse.error) throw new Error(`Unable to load poll voters: ${voterResponse.error.message}`);
  if (ballotResponse.error) throw new Error(`Unable to load admin ballots: ${ballotResponse.error.message}`);
  const candidates = loadedCandidates.map((candidate) => publicCandidateView(candidate));

  const ballotsByVoter = new Map((ballotResponse.data ?? []).map((ballot) => [ballot.voter_id, ballot]));
  const choicesByBallot = new Map<string, string[]>();

  if (poll.status === "closed" && (ballotResponse.data?.length ?? 0) > 0) {
    const ballotIds = (ballotResponse.data ?? []).map((ballot) => ballot.id);
    const { data: choices, error: choicesError } = await supabase
      .from("ballot_choices")
      .select("ballot_id,candidate_id")
      .in("ballot_id", ballotIds);
    if (choicesError) throw new Error(`Unable to load named ballot audit: ${choicesError.message}`);
    for (const choice of choices ?? []) {
      choicesByBallot.set(choice.ballot_id, [
        ...(choicesByBallot.get(choice.ballot_id) ?? []),
        choice.candidate_id,
      ]);
    }
  }

  return {
    id: poll.id,
    publicId: poll.public_id,
    title: poll.title,
    status: poll.status,
    outcomeStatus: poll.outcome_status,
    allowsVoterNominations: poll.nominations_enabled,
    nominationLimit: poll.nomination_limit,
    maxChoices: poll.vote_limit,
    center: {
      label: poll.center_name,
      latitude: Number(poll.center_latitude),
      longitude: Number(poll.center_longitude),
    },
    candidates,
    currentVoter: null,
    ballot: null,
    winnerCandidateId: poll.official_winner_candidate_id,
    closedAt: poll.closed_at,
    accessVersion: poll.access_version,
    createdAt: poll.created_at,
    voters: (voterResponse.data ?? []).map((voter) => {
      const ballot = ballotsByVoter.get(voter.id);
      return {
        id: voter.id,
        displayName: voter.display_name,
        voterCode: voter.voter_code,
        submittedAt: ballot?.is_submitted ? ballot.submitted_at : null,
        ...(poll.status === "closed" && ballot
          ? { candidateIds: choicesByBallot.get(ballot.id) ?? [] }
          : {}),
      };
    }),
  };
}

export async function getPollRouteData(publicId: string) {
  const poll = await getPublicPollView(publicId);
  if (!poll || poll.status === "draft") return null;

  return {
    pollId: poll.id,
    publicId: poll.publicId,
    center: { latitude: poll.center.latitude, longitude: poll.center.longitude },
    destinations: poll.candidates.map((candidate) => ({
      candidateId: candidate.id,
      placeId: candidate.placeId,
    })),
  };
}

export async function listWinnerHistory(): Promise<WinnerHistoryView[]> {
  const organizer = await requireOrganizerPage({ returnTo: "/admin/winners" });
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("winner_history")
    .select("id,restaurant_id,fallback_label,source_poll_id,source,won_on,notes,restaurants!inner(id,google_place_id)")
    .eq("team_id", organizer.teamId)
    .order("won_on", { ascending: false });
  if (error) throw new Error(`Unable to load winner history: ${error.message}`);

  return (data ?? []).map((row) => {
    const restaurant = Array.isArray(row.restaurants) ? row.restaurants[0] : row.restaurants;
    return {
      id: row.id,
      restaurantId: row.restaurant_id,
      placeId: restaurant.google_place_id,
      fallbackLabel: row.fallback_label ?? "Restaurant",
      source: row.source as WinnerHistoryView["source"],
      sourcePollId: row.source_poll_id,
      wonOn: row.won_on,
      notes: row.notes,
    };
  });
}
