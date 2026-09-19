"use client";

import { useState } from "react";

import { GooglePlaceDetailsCard } from "@/components/google/google-place-details-card";
import { SubmitButton } from "@/components/ui/submit-button";
import { RestaurantIcon } from "@/components/ui/icons";
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
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="admin-page-title text-2xl">{activeCount} active restaurant{activeCount === 1 ? "" : "s"}</h2>
          {!canEdit ? <span className="status-pill">Locked</span> : null}
        </div>
        <div className="admin-filter-group" aria-label="Filter candidate roster">
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
                <span className="flag">Won {formatDate(candidate.previousWinnerAt)}</span>
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
          <div className="grid justify-items-center px-6 py-10 text-center">
            <span className="state-icon">
              <RestaurantIcon size={22} weight="light" />
            </span>
            <p className="mt-4 text-sm text-muted">No restaurants match this filter.</p>
          </div>
        )}
      </div>
    </section>
  );
}
