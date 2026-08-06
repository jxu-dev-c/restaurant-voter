import type { AdminPollDetail, PollStatus } from "@/lib/domain/types";
import { SubmitButton } from "@/components/ui/submit-button";
import { Notice } from "@/components/ui/notice";
import { ConfirmActionForm } from "@/components/ui/confirm-action-form";

type PhaseControlsProps = {
  poll: AdminPollDetail;
  transitionAction: (formData: FormData) => Promise<void>;
  closeAction: (formData: FormData) => Promise<void>;
  resolveTieAction: (formData: FormData) => Promise<void>;
};

function nextPhase(poll: AdminPollDetail): PollStatus | null {
  if (poll.status === "draft") return poll.allowsVoterNominations ? "nominations" : "voting";
  if (poll.status === "nominations") return "voting";
  return null;
}

export function PhaseControls({ poll, transitionAction, closeAction, resolveTieAction }: PhaseControlsProps) {
  const next = nextPhase(poll);
  const activeCandidates = poll.candidates.filter((candidate) => candidate.status === "active");
  const tiedLeaders = poll.outcomeStatus === "tie"
    ? activeCandidates.filter((candidate) => candidate.voteCount === Math.max(...activeCandidates.map((item) => item.voteCount ?? 0)))
    : [];

  return (
    <section className="panel p-6">
      <h2 className="text-lg font-bold">Phase controls</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Changes are one-way. The center, choice limit, and candidate list lock when voting begins.
      </p>

      {next ? (
        <ConfirmActionForm
          action={transitionAction}
          className="mt-5"
          confirmMessage={`Open ${next}? This phase change cannot be reversed.`}
        >
          <input type="hidden" name="pollId" value={poll.id} />
          <input type="hidden" name="targetStatus" value={next} />
          <SubmitButton
            disabled={activeCandidates.length === 0 || (next === "voting" && poll.maxChoices > activeCandidates.length)}
            pendingLabel={`Opening ${next}…`}
          >
            Open {next}
          </SubmitButton>
        </ConfirmActionForm>
      ) : null}

      {poll.status === "voting" ? (
        <ConfirmActionForm
          action={closeAction}
          className="mt-5"
          confirmMessage="Close voting and publish the final counts? This poll cannot reopen."
        >
          <input type="hidden" name="pollId" value={poll.id} />
          <SubmitButton className="button button-danger" pendingLabel="Closing vote…">
            Close voting and publish results
          </SubmitButton>
        </ConfirmActionForm>
      ) : null}

      {tiedLeaders.length > 1 ? (
        <div className="mt-5">
          <Notice title="The vote is tied" tone="warning">
            Choose one tied leader as the official winner. Aggregate results are already visible to link holders.
          </Notice>
          <div className="mt-4 grid gap-2">
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
