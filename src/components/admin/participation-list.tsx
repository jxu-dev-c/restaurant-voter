"use client";

import { useState } from "react";

import { GooglePlaceName } from "@/components/google/google-place-name";
import { ConfirmActionForm } from "@/components/ui/confirm-action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { AdminVoterView, CandidateView, PollStatus } from "@/lib/domain/types";

type ParticipationFilter = "all" | "submitted" | "waiting";

export function ParticipationList({
  candidates,
  deleteAction,
  pollId,
  pollStatus,
  voters,
}: {
  candidates: CandidateView[];
  deleteAction: (formData: FormData) => Promise<void>;
  pollId: string;
  pollStatus: PollStatus;
  voters: AdminVoterView[];
}) {
  const [filter, setFilter] = useState<ParticipationFilter>("all");
  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const submittedCount = voters.filter((voter) => voter.submittedAt).length;
  const visibleVoters = voters.filter((voter) => {
    if (filter === "all") return true;
    return filter === "submitted" ? Boolean(voter.submittedAt) : !voter.submittedAt;
  });

  return (
    <section className="admin-section overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-line px-5 py-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Participation</p>
          <h2 className="mt-2 text-2xl font-bold">{submittedCount} of {voters.length} submitted</h2>
          <p className="mt-1 text-sm text-muted">See who is ready before closing the vote.</p>
        </div>
        <div className="admin-filter-group" aria-label="Filter participants">
          {[
            ["All", "all"],
            ["Submitted", "submitted"],
            ["Waiting", "waiting"],
          ].map(([label, value]) => (
            <button
              aria-pressed={filter === value}
              className="admin-filter-button"
              key={value}
              type="button"
              onClick={() => setFilter(value as ParticipationFilter)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {voters.length ? (
        <div className="divide-y divide-line">
          {visibleVoters.map((voter) => (
            <div className="px-5 py-4 sm:px-6" key={voter.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-bold">{voter.displayName}</p>
                  <p className="mt-0.5 text-sm text-muted">Voter code {voter.voterCode}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${voter.submittedAt ? "bg-leaf-soft text-leaf" : "bg-surface-soft text-muted"}`}>
                    {voter.submittedAt ? "Submitted" : "Waiting"}
                  </span>
                  {pollStatus !== "closed" ? (
                    <ConfirmActionForm
                      action={deleteAction}
                      confirmLabel="Delete voter"
                      confirmMessage="Their ballot and all vote choices will be permanently removed, and this browser identity will be blocked from rejoining. Any restaurant they nominated will remain."
                      confirmTitle={`Delete ${voter.displayName}?`}
                      tone="danger"
                    >
                      <input type="hidden" name="pollId" value={pollId} />
                      <input type="hidden" name="voterId" value={voter.id} />
                      <SubmitButton className="button button-ghost button-compact" pendingLabel="Deleting…">
                        Delete
                      </SubmitButton>
                    </ConfirmActionForm>
                  ) : null}
                </div>
              </div>
              {pollStatus === "closed" && voter.candidateIds?.length ? (
                <p className="mt-3 text-sm leading-6 text-muted">
                  Voted for {voter.candidateIds.map((candidateId, index) => {
                    const candidate = candidateById.get(candidateId);
                    return (
                      <span key={candidateId}>
                        {index > 0 ? ", " : null}
                        {candidate ? (
                          <GooglePlaceName
                            className="font-semibold text-ink underline decoration-transparent underline-offset-2 hover:decoration-current"
                            fallbackLabel={candidate.fallbackLabel}
                            placeId={candidate.placeId}
                          />
                        ) : "Unknown"}
                      </span>
                    );
                  })}
                </p>
              ) : null}
            </div>
          ))}
          {!visibleVoters.length ? <p className="px-6 py-10 text-center text-sm text-muted">No participants match this filter.</p> : null}
        </div>
      ) : (
        <p className="px-6 py-10 text-center text-muted">No voters have joined yet.</p>
      )}
    </section>
  );
}
