"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/auth/admin";
import {
  addManualWinner,
  closePoll,
  createLunchCenter,
  createPoll,
  duplicatePoll,
  resolvePollTie,
  rotatePollAccess,
  seedPollCandidate,
  setPollCandidateActive,
  transitionPoll,
} from "@/lib/data/mutations";
import {
  centerSchema,
  createPollSchema,
  formDataObject,
  placeSelectionSchema,
  winnerSchema,
} from "@/lib/domain/schemas";
import { pollStatuses } from "@/lib/domain/types";
import { validateRestaurantPlace } from "@/lib/google/server-place";

function adminEmail(user: { email?: string | null }) {
  if (!user.email) throw new Error("The administrator email is unavailable");
  return user.email;
}

export async function createCenterAction(formData: FormData) {
  const user = await assertAdmin();
  const input = centerSchema.parse(formDataObject(formData));
  await createLunchCenter({ adminEmail: adminEmail(user), ...input });
  revalidatePath("/admin/centers");
}

export async function createPollAction(formData: FormData) {
  const user = await assertAdmin();
  const input = createPollSchema.parse(formDataObject(formData));
  const poll = await createPoll({ adminEmail: adminEmail(user), ...input });
  redirect(`/admin/polls/${poll.id}`);
}

export async function duplicatePollAction(formData: FormData) {
  const user = await assertAdmin();
  const pollId = String(formData.get("pollId") ?? "");
  const copyId = await duplicatePoll({ pollId, adminEmail: adminEmail(user) });
  redirect(`/admin/polls/${copyId}`);
}

export async function transitionPollAction(formData: FormData) {
  const user = await assertAdmin();
  const pollId = String(formData.get("pollId") ?? "");
  const targetStatus = String(formData.get("targetStatus") ?? "");
  if (!pollStatuses.includes(targetStatus as (typeof pollStatuses)[number])) {
    throw new Error("Invalid poll phase");
  }
  await transitionPoll({
    pollId,
    adminEmail: adminEmail(user),
    targetStatus: targetStatus as (typeof pollStatuses)[number],
  });
  revalidatePath(`/admin/polls/${pollId}`);
}

export async function closePollAction(formData: FormData) {
  const user = await assertAdmin();
  const pollId = String(formData.get("pollId") ?? "");
  await closePoll({ pollId, adminEmail: adminEmail(user) });
  revalidatePath(`/admin/polls/${pollId}`);
}

export async function resolveTieAction(formData: FormData) {
  const user = await assertAdmin();
  const pollId = String(formData.get("pollId") ?? "");
  const candidateId = String(formData.get("candidateId") ?? "");
  await resolvePollTie({ pollId, candidateId, adminEmail: adminEmail(user) });
  revalidatePath(`/admin/polls/${pollId}`);
  revalidatePath("/admin/winners");
}

export async function rotatePollAccessAction(formData: FormData) {
  const user = await assertAdmin();
  const pollId = String(formData.get("pollId") ?? "");
  await rotatePollAccess({ pollId, adminEmail: adminEmail(user) });
  revalidatePath(`/admin/polls/${pollId}`);
}

export async function addAdminCandidateAction(formData: FormData) {
  const user = await assertAdmin();
  const pollId = String(formData.get("pollId") ?? "");
  const parsed = placeSelectionSchema.parse({
    placeId: formData.get("placeId"),
    fallbackLabel: formData.get("fallbackLabel"),
    acknowledgePreviousWinner: formData.get("acknowledgePreviousWinner"),
  });
  const place = await validateRestaurantPlace(parsed.placeId);
  if (!place.ok) throw new Error(place.error.message);
  await seedPollCandidate({
    pollId,
    adminEmail: adminEmail(user),
    placeId: place.data.placeId,
    fallbackLabel: parsed.fallbackLabel,
  });
  revalidatePath(`/admin/polls/${pollId}`);
}

export async function toggleCandidateAction(formData: FormData) {
  const user = await assertAdmin();
  const pollId = String(formData.get("pollId") ?? "");
  const candidateId = String(formData.get("candidateId") ?? "");
  const active = formData.get("active") === "true";
  await setPollCandidateActive({
    pollId,
    candidateId,
    active,
    adminEmail: adminEmail(user),
  });
  revalidatePath(`/admin/polls/${pollId}`);
}

export async function addManualWinnerAction(formData: FormData) {
  const user = await assertAdmin();
  const parsed = winnerSchema.parse({
    placeId: formData.get("placeId"),
    fallbackLabel: formData.get("fallbackLabel"),
    wonOn: formData.get("wonOn"),
    notes: formData.get("notes"),
  });
  const place = await validateRestaurantPlace(parsed.placeId);
  if (!place.ok) throw new Error(place.error.message);
  await addManualWinner({
    adminEmail: adminEmail(user),
    placeId: place.data.placeId,
    fallbackLabel: parsed.fallbackLabel,
    wonOn: parsed.wonOn,
    notes: parsed.notes,
  });
  revalidatePath("/admin/winners");
}
