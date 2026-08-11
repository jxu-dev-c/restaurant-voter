"use client";

import { useState } from "react";

import { GooglePlaceDetailsCard } from "@/components/google/google-place-details-card";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate } from "@/lib/domain/format";
import type { CandidateView } from "@/lib/domain/types";

type CandidateFilter = "active" | "voter" | "removed" | "all";

const filters: Array<{ label: string; value: CandidateFilter }> = [
  { label: "Active", value: "active" },
  { label: "Voter-nominated", value: "voter" },
  { label: "Removed", value: "removed" },
  { label: "All", value: "all" },
];

function matchesFilter(candidate: CandidateView, filter: CandidateFilter) {
  if (filter === "all") return true;
  if (filter === "voter") return candidate.source === "voter";
  return candidate.status === filter;
}

export function CandidateRoster({
  candidates,
  canEdit,
  pollId,
  toggleAction,
}: {
  candidates: CandidateView[];
  canEdit: boolean;
  pollId: string;
  toggleAction: (formData: FormData) => Promise<void>;
}) {
  const [filter, setFilter] = useState<CandidateFilter>("active");
  const visibleCandidates = candidates
    .filter((candidate) => matchesFilter(candidate, filter))
    .toSorted((left, right) => Number(left.status === "removed") - Number(right.status === "removed"));
  const activeCount = candidates.filter((candidate) => candidate.status === "active").length;

  return (
    <section className="admin-section overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-line px-5 py-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="eyebrow">Candidate roster</p>
            {!canEdit ? <span className="status-pill">Locked</span> : null}
          </div>
          <h2 className="mt-2 text-2xl font-bold">{activeCount} active restaurant{activeCount === 1 ? "" : "s"}</h2>
          <p className="mt-1 text-sm text-muted">Review the shortlist quickly and remove anything that should not reach the ballot.</p>
        </div>
        <div className="admin-filter-group overflow-x-auto" aria-label="Filter candidate roster">
          {filters.map((item) => (
            <button
              aria-pressed={filter === item.value}
              className="admin-filter-button"
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-line">
        {visibleCandidates.length ? visibleCandidates.map((candidate) => (
          <article
            className={`grid gap-4 px-5 py-5 sm:px-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center ${candidate.status === "removed" ? "bg-surface-soft/65" : ""}`}
            key={candidate.id}
          >
            <div className={candidate.status === "removed" ? "opacity-65" : ""}>
              <GooglePlaceDetailsCard
                elevated={false}
                fallbackLabel={candidate.fallbackLabel}
                placeId={candidate.placeId}
                variant="admin-row"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 xl:max-w-48 xl:justify-end">
              <span className="status-pill">{candidate.source === "admin" ? "Admin added" : "Voter nominated"}</span>
              {candidate.previousWinnerAt ? (
                <span className="rounded-full bg-[#fff3d9] px-3 py-1 text-xs font-bold text-warning">
                  Won {formatDate(candidate.previousWinnerAt)}
                </span>
              ) : null}
              {canEdit ? (
                <form action={toggleAction} className="w-full sm:w-auto">
                  <input type="hidden" name="pollId" value={pollId} />
                  <input type="hidden" name="candidateId" value={candidate.id} />
                  <input type="hidden" name="active" value={candidate.status === "removed" ? "true" : "false"} />
                  <SubmitButton className="button button-secondary button-compact w-full" pendingLabel="Updating…">
                    {candidate.status === "removed" ? "Restore" : "Remove"}
                  </SubmitButton>
                </form>
              ) : null}
            </div>
          </article>
        )) : (
          <div className="px-6 py-10 text-center text-sm text-muted">No restaurants match this filter.</div>
        )}
      </div>
    </section>
  );
}
