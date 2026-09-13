import type { AdminPollDetail, PollStatus } from "@/lib/domain/types";

export type PollReadiness = {
  activeCandidateCount: number;
  blockers: string[];
  canAdvance: boolean;
  nextStatus: PollStatus | null;
};

export function derivePollReadiness(poll: AdminPollDetail): PollReadiness {
  const activeCandidateCount = poll.candidates.filter((candidate) => candidate.status === "active").length;
  const nextStatus = poll.status === "draft"
    ? poll.allowsVoterNominations ? "nominations" : "voting"
    : poll.status === "nominations" ? "voting" : null;
  const blockers: string[] = [];

  if (nextStatus && activeCandidateCount === 0) {
    blockers.push("Add at least one active restaurant before opening the poll.");
  }
  if (nextStatus === "voting" && poll.maxChoices > activeCandidateCount) {
    blockers.push(`Reduce the choice limit or add ${poll.maxChoices - activeCandidateCount} more active restaurant${poll.maxChoices - activeCandidateCount === 1 ? "" : "s"}.`);
  }

  return {
    activeCandidateCount,
    blockers,
    canAdvance: nextStatus !== null && blockers.length === 0,
    nextStatus,
  };
}
