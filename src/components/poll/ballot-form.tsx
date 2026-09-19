"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { ActionState, InteractiveCandidateView } from "@/lib/domain/types";
import { initialActionState } from "@/lib/domain/types";
import { SubmitButton } from "@/components/ui/submit-button";
import { GooglePlaceDetailsCard } from "@/components/google";
import { formatDate, formatDistance, formatDuration } from "@/lib/domain/format";
import { CheckIcon, DriveIcon, TrophyIcon } from "@/components/ui/icons";
import { SubmissionSuccessDialog } from "./submission-success-dialog";
import { useRouteMetrics } from "./use-route-metrics";

type BallotFormProps = {
  pollId: string;
  publicId: string;
  candidates: InteractiveCandidateView[];
  initialCandidateIds: string[];
  revision: number;
  maxChoices: number;
  saveAction: (state: ActionState, formData: FormData) => Promise<ActionState>;
};

type BallotDraft = {
  selected: Set<string>;
  expectedRevision: number;
  dirty: boolean;
  lastSeenAuthoritativeKey: string;
  remoteChanged: boolean;
};

function reconcileAuthoritativeBallot(
  current: BallotDraft,
  authoritativeKey: string,
  authoritativeSelection: string,
  revision: number,
): BallotDraft {
  if (current.lastSeenAuthoritativeKey === authoritativeKey) return current;
  if (current.dirty) {
    return {
      ...current,
      lastSeenAuthoritativeKey: authoritativeKey,
      remoteChanged: true,
    };
  }

  const candidateIds = JSON.parse(authoritativeSelection) as string[];
  return {
    selected: new Set(candidateIds),
    expectedRevision: revision,
    dirty: false,
    lastSeenAuthoritativeKey: authoritativeKey,
    remoteChanged: false,
  };
}

export function BallotForm({
  pollId,
  publicId,
  candidates,
  initialCandidateIds,
  revision,
  maxChoices,
  saveAction,
}: BallotFormProps) {
  const authoritativeSelection = JSON.stringify(initialCandidateIds);
  const authoritativeKey = `${revision}:${authoritativeSelection}`;
  const [state, formAction] = useActionState(saveAction, initialActionState);
  const handledActionStateRef = useRef<ActionState>(state);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [draft, setDraft] = useState<BallotDraft>(() => ({
    selected: new Set(initialCandidateIds),
    expectedRevision: revision,
    dirty: false,
    lastSeenAuthoritativeKey: authoritativeKey,
    remoteChanged: false,
  }));
  const { metrics, error: routeError } = useRouteMetrics(
    publicId,
    candidates.map((candidate) => candidate.placeId),
  );
  const currentDraft = reconcileAuthoritativeBallot(
    draft,
    authoritativeKey,
    authoritativeSelection,
    revision,
  );
  if (currentDraft !== draft) setDraft(currentDraft);
  const selectedCount = currentDraft.selected.size;
  const selectedIds = Array.from(currentDraft.selected);

  useEffect(() => {
    if (handledActionStateRef.current === state) return;
    handledActionStateRef.current = state;

    const timeout = window.setTimeout(() => {
      if (!state.ok) {
        setDraft((current) => ({
          ...current,
          selected: new Set(current.selected),
        }));
        return;
      }

      const candidateIds = JSON.parse(authoritativeSelection) as string[];
      setSuccessDialogOpen(true);
      setDraft({
        selected: new Set(candidateIds),
        expectedRevision: revision,
        dirty: false,
        lastSeenAuthoritativeKey: authoritativeKey,
        remoteChanged: false,
      });
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [authoritativeKey, authoritativeSelection, revision, state]);

  function toggle(candidateId: string) {
    setDraft((current) => {
      const next = new Set(current.selected);
      if (next.has(candidateId)) next.delete(candidateId);
      else if (next.size < maxChoices) next.add(candidateId);
      return { ...current, selected: next, dirty: true };
    });
  }

  function adoptLatestBallot() {
    const candidateIds = JSON.parse(authoritativeSelection) as string[];
    setDraft({
      selected: new Set(candidateIds),
      expectedRevision: revision,
      dirty: false,
      lastSeenAuthoritativeKey: authoritativeKey,
      remoteChanged: false,
    });
  }

  return (
    <div>
      <form action={formAction} key={`ballot-${currentDraft.expectedRevision}`}>
        <input type="hidden" name="pollId" value={pollId} />
        <input type="hidden" name="revision" value={currentDraft.expectedRevision} />
        {selectedIds.map((candidateId) => (
          <input key={candidateId} type="hidden" name="candidateIds" value={candidateId} />
        ))}
        <fieldset>
          <legend className="sr-only">Choose up to {maxChoices} restaurants</legend>
          <div className="poll-section-heading">
            <div>
              <h2 className="card-title">Choose up to {maxChoices}</h2>
              <p className="mt-1 text-sm text-muted">Pick the places you&apos;d pull up a chair for.</p>
            </div>
            <span className="status-pill" data-status="voting" aria-live="polite">
              {selectedCount} of {maxChoices} selected
            </span>
          </div>
          <div className="restaurant-grid grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {candidates.map((candidate) => {
              const checked = currentDraft.selected.has(candidate.id);
              const disabled = !checked && selectedCount >= maxChoices;
              const metric = metrics.get(candidate.placeId);
              const distance = formatDistance(metric?.distanceMeters);
              const duration = formatDuration(metric?.durationSeconds);
              const hasMetrics =
                metric?.distanceMeters != null || metric?.durationSeconds != null;

              // Keep links independent of selection; the checkbox remains the
              // native keyboard control and the rest of the card is clickable.
              return (
                <article
                  key={candidate.id}
                  className="select-card"
                  onClick={(event) => {
                    if ((event.target as Element).closest("a, input")) return;
                    if (!disabled) toggle(candidate.id);
                  }}
                >
                  <input
                    type="checkbox"
                    aria-label={`Select ${candidate.fallbackLabel}`}
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggle(candidate.id)}
                  />
                  {candidate.previousWinnerAt ? (
                    <span className="flag flag-corner">Previous winner</span>
                  ) : null}
                  <GooglePlaceDetailsCard
                    placeId={candidate.placeId}
                    fallbackLabel={candidate.fallbackLabel}
                    variant="flat"
                  />
                  <div className="restaurant-meta flex items-center justify-between gap-3">
                    <p className="flex min-w-0 items-center gap-1.5 text-sm text-muted">
                      <DriveIcon className="shrink-0" size={15} />
                      <span className="truncate">
                        {hasMetrics ? `${distance} · ${duration} drive` : "Distance unavailable"}
                      </span>
                    </p>
                    <span className="flex items-center gap-2 text-xs font-semibold text-blue" aria-hidden="true">
                      {checked ? "Selected" : "Select"}
                      <span className="select-check">
                        <CheckIcon size={15} />
                      </span>
                    </span>
                  </div>
                  {candidate.previousWinnerAt ? (
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-gold-ink">
                      <TrophyIcon className="shrink-0" size={14} />
                      Won {formatDate(candidate.previousWinnerAt)}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        </fieldset>
        {currentDraft.remoteChanged ? (
          <div className="mt-4 rounded-2xl border border-warning/30 bg-gold-soft p-4 text-sm text-warning" role="status">
            <p className="font-semibold">This ballot changed in another tab.</p>
            <p className="mt-1">Saving this draft will be rejected until you discard it and use the latest saved ballot.</p>
            <button className="button button-secondary mt-3" type="button" onClick={adoptLatestBallot}>
              Use latest ballot
            </button>
          </div>
        ) : null}
        {state.message && !(state.ok && currentDraft.dirty) ? (
          <p className={`mt-4 text-sm ${state.ok ? "text-leaf" : "text-danger"}`} role="status">
            {state.message}
          </p>
        ) : null}
        {selectedCount >= maxChoices ? (
          <p className="mt-3 text-sm text-muted" role="status">
            Choice limit reached. Deselect a restaurant to choose another.
          </p>
        ) : null}
        {routeError ? <p className="mt-3 text-sm text-warning" role="status">{routeError}</p> : null}
        <div className="ballot-save-bar">
          <SubmitButton disabled={selectedCount === 0} pendingLabel="Saving ballot…">
            Save ballot
          </SubmitButton>
        </div>
      </form>
      <SubmissionSuccessDialog
        description="Your choices are saved. You can return using this same link anytime to change them while voting is still open."
        open={successDialogOpen}
        title="Vote saved"
        onClose={() => setSuccessDialogOpen(false)}
      />
    </div>
  );
}
