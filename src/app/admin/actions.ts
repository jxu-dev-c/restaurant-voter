"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOwnedPoll } from "@/lib/data/ownership";
import { assertAdmin } from "@/lib/auth/admin";
import {
  addManualWinner,
  closePoll,
  createLunchCenter,
  createPoll,
  duplicatePoll,
  removePollVoter,
  resolvePollTie,
  rotatePollAccess,
  seedPollCandidate,
  setPollCandidateActive,
  transitionPoll,
  updatePollLimits,
} from "@/lib/data/mutations";
import {
  centerSchema,
  createPollSchema,
  formDataObject,
  placeSelectionSchema,
  updatePollLimitsSchema,
  winnerSchema,
} from "@/lib/domain/schemas";
import { pollStatuses } from "@/lib/domain/types";
import { validateRestaurantPlace } from "@/lib/google/server-place";

export async function createCenterAction(formData: FormData) {
  await assertAdmin();
  const input = centerSchema.parse(formDataObject(formData));
  await createLunchCenter(input);
  revalidatePath("/admin/centers");
}

export async function createPollAction(formData: FormData) {
  await assertAdmin();
  const input = createPollSchema.parse(formDataObject(formData));
  const poll = await createPoll(input);
  redirect(`/admin/polls/${poll.id}`);
}

export async function duplicatePollAction(formData: FormData) {
  await assertAdmin();
  const pollId = String(formData.get("pollId") ?? "");
  const copyId = await duplicatePoll({ pollId });
  redirect(`/admin/polls/${copyId}`);
}

export async function transitionPollAction(formData: FormData) {
  await assertAdmin();
  const pollId = String(formData.get("pollId") ?? "");
  const targetStatus = String(formData.get("targetStatus") ?? "");
  if (!pollStatuses.includes(targetStatus as (typeof pollStatuses)[number])) {
    throw new Error("Invalid poll phase");
  }
  await transitionPoll({
    pollId,
    targetStatus: targetStatus as (typeof pollStatuses)[number],
  });
  revalidatePath(`/admin/polls/${pollId}`);
}

export async function updatePollLimitsAction(formData: FormData) {
  await assertAdmin();
  const input = updatePollLimitsSchema.parse(formDataObject(formData));
  const poll = await updatePollLimits(input);
  revalidatePath(`/admin/polls/${input.pollId}`);
  revalidatePath(`/poll/${poll.public_id}`);
  revalidatePath("/admin");
}

export async function closePollAction(formData: FormData) {
  await assertAdmin();
  const pollId = String(formData.get("pollId") ?? "");
  await closePoll({ pollId });
  revalidatePath(`/admin/polls/${pollId}`);
}

export async function resolveTieAction(formData: FormData) {
  await assertAdmin();
  const pollId = String(formData.get("pollId") ?? "");
  const candidateId = String(formData.get("candidateId") ?? "");
  await resolvePollTie({ pollId, candidateId });
  revalidatePath(`/admin/polls/${pollId}`);
  revalidatePath("/admin/winners");
}

export async function rotatePollAccessAction(formData: FormData) {
  await assertAdmin();
  const pollId = String(formData.get("pollId") ?? "");
  await rotatePollAccess({ pollId });
  revalidatePath(`/admin/polls/${pollId}`);
}

export async function deletePollVoterAction(formData: FormData) {
  await assertAdmin();
  const pollId = String(formData.get("pollId") ?? "");
  const voterId = String(formData.get("voterId") ?? "");
  if (!pollId || !voterId) throw new Error("A poll and voter are required");

  await removePollVoter({
    pollId,
    voterId,
  });
  revalidatePath(`/admin/polls/${pollId}`);
}

export async function addAdminCandidateAction(formData: FormData) {
  await assertAdmin();
  const pollId = String(formData.get("pollId") ?? "");
  await requireOwnedPoll(pollId);
  const parsed = placeSelectionSchema.parse({
    placeId: formData.get("placeId"),
    fallbackLabel: formData.get("fallbackLabel"),
    acknowledgePreviousWinner: formData.get("acknowledgePreviousWinner"),
  });
  const place = await validateRestaurantPlace(parsed.placeId);
  if (!place.ok) throw new Error(place.error.message);
  await seedPollCandidate({
    pollId,
    placeId: place.data.placeId,
    fallbackLabel: place.data.displayName ?? parsed.fallbackLabel,
  });
  revalidatePath(`/admin/polls/${pollId}`);
}

export async function toggleCandidateAction(formData: FormData) {
  await assertAdmin();
  const pollId = String(formData.get("pollId") ?? "");
  const candidateId = String(formData.get("candidateId") ?? "");
  const active = formData.get("active") === "true";
  await setPollCandidateActive({
    pollId,
    candidateId,
    active,
  });
  revalidatePath(`/admin/polls/${pollId}`);
}

export async function addManualWinnerAction(formData: FormData) {
  await assertAdmin();
  const parsed = winnerSchema.parse({
    placeId: formData.get("placeId"),
    fallbackLabel: formData.get("fallbackLabel"),
    wonOn: formData.get("wonOn"),
    notes: formData.get("notes"),
  });
  const place = await validateRestaurantPlace(parsed.placeId);
  if (!place.ok) throw new Error(place.error.message);
  await addManualWinner({
    placeId: place.data.placeId,
    fallbackLabel: place.data.displayName ?? parsed.fallbackLabel,
    wonOn: parsed.wonOn,
    notes: parsed.notes,
  });
  revalidatePath("/admin/winners");
}
