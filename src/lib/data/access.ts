import "server-only";

import { readPollAccessGrant, readPollDeviceIdentity } from "@/lib/security/poll-cookies";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getPollAccessRecord } from "@/lib/data/polls";

export class PollAccessError extends Error {
  constructor(message = "A valid referral link is required") {
    super(message);
    this.name = "PollAccessError";
  }
}

export async function getAuthorizedPoll(publicId: string) {
  const poll = await getPollAccessRecord(publicId);
  if (!poll || poll.status === "draft") return null;

  const grant = await readPollAccessGrant({
    pollPublicId: poll.publicId,
    accessVersion: poll.accessVersion,
  });
  if (!grant) return null;

  return poll;
}

export async function requireAuthorizedPoll(publicId: string) {
  const poll = await getAuthorizedPoll(publicId);
  if (!poll) throw new PollAccessError();
  return poll;
}

export async function getCurrentPollVoter(publicId: string, pollId: string) {
  const identity = await readPollDeviceIdentity(publicId);
  if (!identity) return null;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("poll_voters")
    .select("id,display_name,voter_code,device_hash")
    .eq("poll_id", pollId)
    .eq("device_hash", identity.deviceHash)
    .maybeSingle();
  if (error) throw new Error(`Unable to resolve voter identity: ${error.message}`);
  if (!data) return null;

  return {
    id: data.id,
    displayName: data.display_name,
    voterCode: data.voter_code,
    deviceHash: data.device_hash,
  };
}

export async function requireCurrentPollVoter(publicId: string, pollId: string) {
  const voter = await getCurrentPollVoter(publicId, pollId);
  if (!voter) throw new PollAccessError("Join the poll before performing this action");
  return voter;
}
