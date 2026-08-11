import type { AdminPollDetail, PollStatus } from "@/lib/domain/types";
import { SubmitButton } from "@/components/ui/submit-button";
import { Notice } from "@/components/ui/notice";
import { ConfirmActionForm } from "@/components/ui/confirm-action-form";
import { derivePollReadiness } from "@/components/admin/poll-readiness";

type PhaseControlsProps = {
  poll: AdminPollDetail;
  transitionAction: (formData: FormData) => Promise<void>;
  closeAction: (formData: FormData) => Promise<void>;
  resolveTieAction: (formData: FormData) => Promise<void>;
};

export function PhaseControls({ poll, transitionAction, closeAction, resolveTieAction }: PhaseControlsProps) {
  const readiness = derivePollReadiness(poll);
  const activeCandidates = poll.candidates.filter((candidate) => candidate.status === "active");
  const tiedLeaders = poll.outcomeStatus === "tie"
    ? activeCandidates.filter((candidate) => candidate.voteCount === Math.max(...activeCandidates.map((item) => item.voteCount ?? 0)))
    : [];
  const phases: PollStatus[] = poll.allowsVoterNominations
    ? ["draft", "nominations", "voting", "closed"]
    : ["draft", "voting", "closed"];
  const currentPhaseIndex = phases.indexOf(poll.status);

  return (
    <section className="admin-lifecycle-panel">
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-center">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Poll lifecycle</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">{poll.status === "closed" ? "Poll complete" : "Move the poll forward"}</h2>
            </div>
            <span className="status-pill" data-status={poll.status}>{poll.status}</span>
          </div>
          <ol className="mt-6 grid gap-2 sm:grid-flow-col sm:auto-cols-fr" aria-label="Poll phases">
            {phases.map((phase, index) => {
              const state = index < currentPhaseIndex ? "complete" : index === currentPhaseIndex ? "current" : "upcoming";
              return (
                <li className="admin-phase-step" data-state={state} key={phase}>
                  <span className="admin-phase-number">{index + 1}</span>
                  <span className="capitalize">{phase}</span>
                </li>
              );
            })}
          </ol>
          <p className="mt-5 text-sm leading-6 text-muted">
            Phase changes are one-way. The shortlist and nomination limit lock when voting begins; the choice limit may still increase.
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
          {readiness.nextStatus ? (
            <>
              <p className="admin-data-label">Next recommended action</p>
              <h3 className="mt-1 text-xl font-bold capitalize">Open {readiness.nextStatus}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                {readiness.nextStatus === "nominations"
                  ? "Invite the team to add restaurants before the shortlist locks."
                  : "Lock the shortlist and let joined voters submit their choices."}
              </p>
              {readiness.blockers.length ? (
                <ul className="mt-4 space-y-2" aria-label="Readiness blockers">
                  {readiness.blockers.map((blocker) => (
                    <li className="flex gap-2 text-sm font-semibold text-warning" key={blocker}>
                      <span aria-hidden="true">!</span>
                      <span>{blocker}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm font-semibold text-leaf">Ready to advance · {readiness.activeCandidateCount} active restaurants</p>
              )}
              <ConfirmActionForm
                action={transitionAction}
                className="mt-5"
                confirmMessage={`Open ${readiness.nextStatus}? This phase change cannot be reversed.`}
              >
                <input type="hidden" name="pollId" value={poll.id} />
                <input type="hidden" name="targetStatus" value={readiness.nextStatus} />
                <SubmitButton
                  className="button button-primary w-full"
                  disabled={!readiness.canAdvance}
                  pendingLabel={`Opening ${readiness.nextStatus}…`}
                >
                  Open {readiness.nextStatus}
                </SubmitButton>
              </ConfirmActionForm>
            </>
          ) : poll.status === "voting" ? (
            <>
              <p className="admin-data-label">Next recommended action</p>
              <h3 className="mt-1 text-xl font-bold">Close when everyone is ready</h3>
              <p className="mt-2 text-sm leading-6 text-muted">Closing publishes final counts and the poll cannot reopen.</p>
              <ConfirmActionForm
                action={closeAction}
                className="mt-5"
                confirmLabel="Close voting"
                confirmMessage="Close voting and publish the final counts? This poll cannot reopen."
                confirmTitle="Close this poll?"
                tone="danger"
              >
                <input type="hidden" name="pollId" value={poll.id} />
                <SubmitButton className="button button-danger w-full" pendingLabel="Closing vote…">
                  Close voting and publish
                </SubmitButton>
              </ConfirmActionForm>
            </>
          ) : (
            <>
              <p className="admin-data-label">Lifecycle status</p>
              <h3 className="mt-1 text-xl font-bold">No further phase changes</h3>
              <p className="mt-2 text-sm leading-6 text-muted">The result is published and the poll is now read-only.</p>
            </>
          )}
        </div>
      </div>

      {tiedLeaders.length > 1 ? (
        <div className="mt-6 border-t border-line pt-6">
          <Notice title="The vote is tied" tone="warning">
            Choose one tied leader as the official winner. Aggregate results are already visible to link holders.
          </Notice>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {tiedLeaders.map((candidate) => (
              <ConfirmActionForm
                action={resolveTieAction}
                confirmMessage={`Choose ${candidate.fallbackLabel} as the official winner?`}
                key={candidate.id}
              >
                <input type="hidden" name="pollId" value={poll.id} />
                <input type="hidden" name="candidateId" value={candidate.id} />
                <SubmitButton className="button button-secondary w-full justify-between" pendingLabel="Resolving tie…">
                  <span>{candidate.fallbackLabel}</span>
                  <span>{candidate.voteCount} votes</span>
                </SubmitButton>
              </ConfirmActionForm>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
