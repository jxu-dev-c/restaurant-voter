import "server-only";

import type { PollStatus } from "@/lib/domain/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

function assertNoError(error: { message: string; code?: string } | null, context: string) {
  if (error) {
    const wrapped = new Error(`${context}: ${error.message}`) as Error & { code?: string };
    wrapped.code = error.code;
    throw wrapped;
  }
}

export async function createLunchCenter(input: {
  adminEmail: string;
  name: string;
  addressLabel?: string;
  googlePlaceId?: string;
  latitude: number;
  longitude: number;
}) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("lunch_centers")
    .insert({
      name: input.name,
      address_label: input.addressLabel ?? null,
      google_place_id: input.googlePlaceId ?? null,
      latitude: input.latitude,
      longitude: input.longitude,
      created_by_admin: input.adminEmail,
    })
    .select("id")
    .single();
  assertNoError(error, "Unable to create lunch center");
  return data!.id as string;
}

export async function createPoll(input: {
  adminEmail: string;
  title: string;
  lunchCenterId: string;
  voteLimit: number;
  nominationsEnabled: boolean;
}) {
  const supabase = createServiceRoleClient();
  const { data: center, error: centerError } = await supabase
    .from("lunch_centers")
    .select("id,name,address_label,google_place_id,latitude,longitude")
    .eq("id", input.lunchCenterId)
    .single();
  assertNoError(centerError, "Unable to load lunch center");

  const { data, error } = await supabase
    .from("polls")
    .insert({
      title: input.title,
      lunch_center_id: center!.id,
      center_name: center!.name,
      center_address: center!.address_label,
      center_google_place_id: center!.google_place_id,
      center_latitude: center!.latitude,
      center_longitude: center!.longitude,
      vote_limit: input.voteLimit,
      nominations_enabled: input.nominationsEnabled,
      created_by_admin: input.adminEmail,
    })
    .select("id,public_id")
    .single();
  assertNoError(error, "Unable to create poll");
  return data! as { id: string; public_id: string };
}

export async function duplicatePoll(input: { pollId: string; adminEmail: string }) {
  const supabase = createServiceRoleClient();
  const { data: original, error: originalError } = await supabase
    .from("polls")
    .select(
      "title,lunch_center_id,center_name,center_address,center_google_place_id,center_latitude,center_longitude,vote_limit,nominations_enabled",
    )
    .eq("id", input.pollId)
    .single();
  assertNoError(originalError, "Unable to load poll to duplicate");

  const { data: copy, error: copyError } = await supabase
    .from("polls")
    .insert({
      title: `${original!.title} (copy)`,
      lunch_center_id: original!.lunch_center_id,
      center_name: original!.center_name,
      center_address: original!.center_address,
      center_google_place_id: original!.center_google_place_id,
      center_latitude: original!.center_latitude,
      center_longitude: original!.center_longitude,
      vote_limit: original!.vote_limit,
      nominations_enabled: original!.nominations_enabled,
      created_by_admin: input.adminEmail,
    })
    .select("id")
    .single();
  assertNoError(copyError, "Unable to duplicate poll");

  const { data: candidates, error: candidatesError } = await supabase
    .from("poll_candidates")
    .select("restaurant_id")
    .eq("poll_id", input.pollId)
    .eq("is_active", true);
  assertNoError(candidatesError, "Unable to copy candidates");

  if ((candidates?.length ?? 0) > 0) {
    const { error: insertError } = await supabase.from("poll_candidates").insert(
      candidates!.map((candidate) => ({
        poll_id: copy!.id,
        restaurant_id: candidate.restaurant_id,
        source: "admin",
        is_active: true,
      })),
    );
    assertNoError(insertError, "Unable to copy candidate roster");
  }

  return copy!.id as string;
}

export async function transitionPoll(input: {
  pollId: string;
  adminEmail: string;
  targetStatus: PollStatus;
}) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.rpc("transition_poll", {
    p_poll_id: input.pollId,
    p_admin_email: input.adminEmail,
    p_target_status: input.targetStatus,
  });
  assertNoError(error, "Unable to transition poll");
}

export async function closePoll(input: { pollId: string; adminEmail: string }) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("close_poll", {
    p_poll_id: input.pollId,
    p_admin_email: input.adminEmail,
  });
  assertNoError(error, "Unable to close poll");
  return data;
}

export async function resolvePollTie(input: {
  pollId: string;
  adminEmail: string;
  candidateId: string;
}) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.rpc("resolve_tie", {
    p_poll_id: input.pollId,
    p_admin_email: input.adminEmail,
    p_candidate_id: input.candidateId,
  });
  assertNoError(error, "Unable to resolve tie");
}

export async function rotatePollAccess(input: { pollId: string; adminEmail: string }) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("rotate_poll_access", {
    p_poll_id: input.pollId,
    p_admin_email: input.adminEmail,
  });
  assertNoError(error, "Unable to rotate poll access");
  return data;
}

export async function seedPollCandidate(input: {
  pollId: string;
  adminEmail: string;
  placeId: string;
  fallbackLabel?: string;
}) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("seed_poll_candidate", {
    p_poll_id: input.pollId,
    p_admin_email: input.adminEmail,
    p_google_place_id: input.placeId,
    p_fallback_label: input.fallbackLabel ?? null,
  });
  assertNoError(error, "Unable to add candidate");
  return data;
}

export async function setPollCandidateActive(input: {
  pollId: string;
  candidateId: string;
  adminEmail: string;
  active: boolean;
}) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.rpc("set_candidate_active", {
    p_poll_id: input.pollId,
    p_admin_email: input.adminEmail,
    p_candidate_id: input.candidateId,
    p_is_active: input.active,
  });
  assertNoError(error, "Unable to update candidate");
}

export async function registerPollVoter(input: {
  pollId: string;
  deviceHash: string;
  displayName: string;
}) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("register_poll_voter", {
    p_poll_id: input.pollId,
    p_device_hash: input.deviceHash,
    p_display_name: input.displayName,
  });
  assertNoError(error, "Unable to register voter");
  return Array.isArray(data) ? data[0] : data;
}

export async function nominateRestaurant(input: {
  pollId: string;
  voterId: string;
  placeId: string;
  fallbackLabel?: string;
}) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("nominate_restaurant", {
    p_poll_id: input.pollId,
    p_voter_id: input.voterId,
    p_google_place_id: input.placeId,
    p_fallback_label: input.fallbackLabel ?? null,
  });
  assertNoError(error, "Unable to nominate restaurant");
  return data;
}

export async function savePollBallot(input: {
  pollId: string;
  voterId: string;
  candidateIds: string[];
  expectedRevision: number;
}) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("save_ballot", {
    p_poll_id: input.pollId,
    p_voter_id: input.voterId,
    p_candidate_ids: input.candidateIds,
    p_expected_revision: input.expectedRevision,
  });
  assertNoError(error, "Unable to save ballot");
  return Array.isArray(data) ? data[0] : data;
}

export async function withdrawPollBallot(input: {
  pollId: string;
  voterId: string;
  expectedRevision: number;
}) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("withdraw_ballot", {
    p_poll_id: input.pollId,
    p_voter_id: input.voterId,
    p_expected_revision: input.expectedRevision,
  });
  assertNoError(error, "Unable to withdraw ballot");
  return Array.isArray(data) ? data[0] : data;
}

export async function addManualWinner(input: {
  adminEmail: string;
  placeId: string;
  fallbackLabel?: string;
  wonOn: string;
  notes?: string;
}) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.rpc("add_manual_winner", {
    p_admin_email: input.adminEmail,
    p_google_place_id: input.placeId,
    p_fallback_label: input.fallbackLabel ?? null,
    p_won_on: input.wonOn,
    p_notes: input.notes ?? null,
  });
  assertNoError(error, "Unable to add winner history");
}
