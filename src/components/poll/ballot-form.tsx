"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { ActionState, InteractiveCandidateView } from "@/lib/domain/types";
import { initialActionState } from "@/lib/domain/types";
import { SubmitButton } from "@/components/ui/submit-button";
import { GooglePlaceDetailsCard } from "@/components/google";
import { formatDate, formatDistance, formatDuration } from "@/lib/domain/format";
import { useRouteMetrics } from "./use-route-metrics";

type BallotFormProps = {
  pollId: string;
  publicId: string;
  candidates: InteractiveCandidateView[];
  initialCandidateIds: string[];
  revision: number;
  maxChoices: number;
  saveAction: (state: ActionState, formData: FormData) => Promise<ActionState>;
  withdrawAction: (formData: FormData) => Promise<void>;
};

type BallotDraft = {
  selected: Set<string>;
  expectedRevision: number;
  dirty: boolean;
  hasBallot: boolean;
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
    hasBallot: candidateIds.length > 0,
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
  withdrawAction,
}: BallotFormProps) {
  const authoritativeSelection = JSON.stringify(initialCandidateIds);
  const authoritativeKey = `${revision}:${authoritativeSelection}`;
  const [state, formAction] = useActionState(saveAction, initialActionState);
  const handledActionStateRef = useRef<ActionState>(state);
  const [draft, setDraft] = useState<BallotDraft>(() => ({
    selected: new Set(initialCandidateIds),
    expectedRevision: revision,
    dirty: false,
    hasBallot: initialCandidateIds.length > 0,
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
      setDraft({
        selected: new Set(candidateIds),
        expectedRevision: revision,
        dirty: false,
        hasBallot: candidateIds.length > 0,
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
      hasBallot: candidateIds.length > 0,
      lastSeenAuthoritativeKey: authoritativeKey,
      remoteChanged: false,
    });
  }

  async function handleWithdraw(formData: FormData) {
    await withdrawAction(formData);
    setDraft((current) => ({
      ...current,
      selected: new Set(),
      dirty: false,
      hasBallot: false,
      remoteChanged: false,
    }));
  }

  return (
    <div>
      <form action={formAction} key={`ballot-${currentDraft.expectedRevision}`}>
        <input type="hidden" name="pollId" value={pollId} />
        <input type="hidden" name="revision" value={currentDraft.expectedRevision} />
        {selectedIds.map((candidateId) => (
          <input key={candidateId} type="hidden" name="candidateIds" value={candidateId} />
        ))}
        <fieldset className="pb-28 sm:pb-0">
          <div className="mb-4 flex items-center justify-between gap-4">
            <legend className="font-bold">Choose up to {maxChoices}</legend>
            <span className="status-pill" aria-live="polite">{selectedCount} selected</span>
          </div>
          <div className="grid gap-3">
            {candidates.map((candidate, index) => {
            const checked = currentDraft.selected.has(candidate.id);
            const disabled = !checked && selectedCount >= maxChoices;
            const checkboxId = `candidate-${candidate.id}`;
            return (
              <div
                key={candidate.id}
                className={`panel p-4 transition ${checked ? "border-accent bg-[#fff8f4]" : "hover:border-[#bcc7bc]"}`}
              >
                <div className="flex items-center gap-3">
                  <input
                    id={checkboxId}
                    aria-label={`Restaurant option ${index + 1}: include in ballot`}
                    className="h-5 w-5 shrink-0 accent-[#ff6f3d]"
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggle(candidate.id)}
                  />
                  <label
                    className={disabled ? "font-bold text-muted" : "cursor-pointer font-bold"}
                    htmlFor={checkboxId}
                  >
                    {checked ? "Included in ballot" : "Include in ballot"}
                  </label>
                </div>
                <div className="mt-3 min-w-0">
                  <GooglePlaceDetailsCard placeId={candidate.placeId} fallbackLabel={candidate.fallbackLabel} />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="status-pill">{formatDistance(metrics.get(candidate.placeId)?.distanceMeters)}</span>
                    <span className="status-pill">{formatDuration(metrics.get(candidate.placeId)?.durationSeconds)} drive</span>
                  </div>
                  {candidate.previousWinnerAt ? (
                    <span className="mt-1 block text-sm font-semibold text-warning">
                      Previous winner · {formatDate(candidate.previousWinnerAt)}
                    </span>
                  ) : null}
                </div>
              </div>
            );
            })}
          </div>
        </fieldset>
        {currentDraft.remoteChanged ? (
          <div className="mt-4 rounded-2xl border border-warning/30 bg-[#fff8e8] p-4 text-sm text-warning" role="status">
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
        <div className="sticky bottom-3 mt-6 flex flex-col gap-3 rounded-2xl border border-line bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row">
          <SubmitButton disabled={selectedCount === 0} pendingLabel="Saving ballot…">
            Save ballot
          </SubmitButton>
          <span className="self-center text-sm text-muted">
            Saving replaces your previous choices.
          </span>
        </div>
      </form>
      {currentDraft.hasBallot ? (
        <form action={handleWithdraw} className="mt-3">
          <input type="hidden" name="pollId" value={pollId} />
          <input type="hidden" name="revision" value={currentDraft.expectedRevision} />
          <SubmitButton className="button button-danger" pendingLabel="Withdrawing…">
            Withdraw ballot
          </SubmitButton>
        </form>
      ) : null}
    </div>
  );
}
