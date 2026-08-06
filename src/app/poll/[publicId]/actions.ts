"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/domain/types";
import { getAuthorizedPoll, requireCurrentPollVoter } from "@/lib/data/access";
import {
  nominateRestaurant,
  registerPollVoter,
  savePollBallot,
  withdrawPollBallot,
} from "@/lib/data/mutations";
import { ballotSchema, placeSelectionSchema } from "@/lib/domain/schemas";
import { validateRestaurantPlace } from "@/lib/google/server-place";
import { logServerError } from "@/lib/observability/logger";
import { getOrCreatePollDeviceIdentity } from "@/lib/security/poll-cookies";
import { parseDisplayName } from "@/lib/security/display-name";

function actionError(error: unknown, fallback: string): ActionState {
  const message = error instanceof Error ? error.message : fallback;
  return {
    ok: false,
    message: message.replace(/^.*?:\s*/, ""),
    conflict: /revision|stale|conflict/i.test(message),
  };
}

export async function registerVoterAction(
  publicId: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const poll = await getAuthorizedPoll(publicId);
    if (!poll || poll.status === "closed") {
      return { ok: false, message: "This poll is not accepting new voters." };
    }

    const displayName = parseDisplayName(formData.get("displayName"));
    const identity = await getOrCreatePollDeviceIdentity(publicId);
    await registerPollVoter({ pollId: poll.id, deviceHash: identity.deviceHash, displayName });
    revalidatePath(`/poll/${publicId}`);
    return { ok: true, message: `Welcome, ${displayName}.` };
  } catch (error) {
    logServerError("poll.voter.register_failed", error, { publicId });
    return actionError(error, "Unable to join this poll.");
  }
}

export async function nominateRestaurantAction(
  publicId: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const poll = await getAuthorizedPoll(publicId);
    if (!poll || poll.status !== "nominations") {
      return { ok: false, message: "Restaurant nominations are closed." };
    }
    const voter = await requireCurrentPollVoter(publicId, poll.id);
    const parsed = placeSelectionSchema.safeParse({
      placeId: formData.get("placeId"),
      fallbackLabel: formData.get("fallbackLabel"),
      acknowledgePreviousWinner: formData.get("acknowledgePreviousWinner"),
    });
    if (!parsed.success) {
      return { ok: false, message: "Choose a restaurant from Google Maps." };
    }

    const validation = await validateRestaurantPlace(parsed.data.placeId);
    if (!validation.ok) return { ok: false, message: validation.error.message };

    await nominateRestaurant({
      pollId: poll.id,
      voterId: voter.id,
      placeId: validation.data.placeId,
      fallbackLabel: parsed.data.fallbackLabel,
    });
    revalidatePath(`/poll/${publicId}`);
    return { ok: true, message: `${validation.data.displayName ?? "Restaurant"} was nominated.` };
  } catch (error) {
    logServerError("poll.nomination.create_failed", error, { publicId });
    return actionError(error, "Unable to nominate that restaurant.");
  }
}

export async function saveBallotAction(
  publicId: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const poll = await getAuthorizedPoll(publicId);
    if (!poll || poll.status !== "voting") {
      return { ok: false, message: "Voting is no longer open." };
    }
    const voter = await requireCurrentPollVoter(publicId, poll.id);
    const parsed = ballotSchema.safeParse({
      pollId: formData.get("pollId"),
      revision: formData.get("revision"),
      candidateIds: formData.getAll("candidateIds"),
    });
    if (!parsed.success || parsed.data.pollId !== poll.id) {
      return { ok: false, message: "The ballot is invalid. Refresh and try again." };
    }

    await savePollBallot({
      pollId: poll.id,
      voterId: voter.id,
      candidateIds: parsed.data.candidateIds,
      expectedRevision: parsed.data.revision,
    });
    revalidatePath(`/poll/${publicId}`);
    return { ok: true, message: "Your ballot is saved." };
  } catch (error) {
    logServerError("poll.ballot.save_failed", error, { publicId });
    return actionError(error, "Unable to save your ballot.");
  }
}

export async function withdrawBallotAction(publicId: string, formData: FormData) {
  const poll = await getAuthorizedPoll(publicId);
  if (!poll || poll.status !== "voting") return;
  const voter = await requireCurrentPollVoter(publicId, poll.id);
  const revision = Number(formData.get("revision"));
  if (!Number.isInteger(revision) || revision < 0) throw new Error("Invalid ballot revision");

  await withdrawPollBallot({ pollId: poll.id, voterId: voter.id, expectedRevision: revision });
  revalidatePath(`/poll/${publicId}`);
}
