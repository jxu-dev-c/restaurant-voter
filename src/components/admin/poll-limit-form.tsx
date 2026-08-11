import type { AdminPollDetail } from "@/lib/domain/types";
import { SubmitButton } from "@/components/ui/submit-button";

type PollLimitFormProps = {
  poll: Pick<
    AdminPollDetail,
    "id" | "status" | "allowsVoterNominations" | "maxChoices" | "nominationLimit"
  >;
  activeCandidateCount: number;
  action: (formData: FormData) => Promise<void>;
};

export function PollLimitForm({ poll, activeCandidateCount, action }: PollLimitFormProps) {
  const choiceMaximum = poll.status === "voting"
    ? Math.max(poll.maxChoices, Math.min(10, activeCandidateCount))
    : 10;
  const canIncreaseChoices = poll.status !== "closed" && poll.maxChoices < choiceMaximum;
  const canIncreaseNominations = poll.allowsVoterNominations
    && (poll.status === "draft" || poll.status === "nominations")
    && poll.nominationLimit < 50;
  const canUpdate = canIncreaseChoices || canIncreaseNominations;

  const fields = (
    <div className="grid gap-4 sm:grid-cols-2">
        <div>
          {canIncreaseChoices ? (
            <>
              <label className="admin-data-label" htmlFor="pollVoteLimit">Choices per voter</label>
              <input
                className="field mt-2"
                id="pollVoteLimit"
                name="voteLimit"
                type="number"
                min={poll.maxChoices}
                max={choiceMaximum}
                defaultValue={poll.maxChoices}
                required
              />
            </>
          ) : (
            <>
              <p className="admin-data-label">Choices per voter</p>
              <p className="admin-data-value mt-2">Up to {poll.maxChoices}</p>
            </>
          )}
          <p className="mt-2 text-xs leading-5 text-muted">
            {poll.status === "voting"
              ? `May increase up to the ${activeCandidateCount} locked restaurants.`
              : poll.status === "closed"
                ? "Locked when the poll closed."
                : "May be increased before or during voting."}
          </p>
        </div>

        <div>
          {canIncreaseNominations ? (
            <>
              <label className="admin-data-label" htmlFor="pollNominationLimit">Nominations per voter</label>
              <input
                className="field mt-2"
                id="pollNominationLimit"
                name="nominationLimit"
                type="number"
                min={poll.nominationLimit}
                max={50}
                defaultValue={poll.nominationLimit}
                required
              />
            </>
          ) : (
            <>
              <p className="admin-data-label">Nominations per voter</p>
              <p className="admin-data-value mt-2">
                {poll.allowsVoterNominations ? `Up to ${poll.nominationLimit}` : "Off"}
              </p>
            </>
          )}
          <p className="mt-2 text-xs leading-5 text-muted">
            {!poll.allowsVoterNominations
              ? "Voter nominations are disabled."
              : poll.status === "draft" || poll.status === "nominations"
                ? "May be increased while nominations are open."
                : "Locked when voting begins."}
          </p>
        </div>
    </div>
  );

  if (!canUpdate) {
    return <div className="mt-4 border-t border-line pt-4">{fields}</div>;
  }

  return (
    <form action={action} className="mt-4 border-t border-line pt-4">
      <input type="hidden" name="pollId" value={poll.id} />
      {!canIncreaseChoices ? <input type="hidden" name="voteLimit" value={poll.maxChoices} /> : null}
      {!canIncreaseNominations ? <input type="hidden" name="nominationLimit" value={poll.nominationLimit} /> : null}
      {fields}
      <div className="mt-4">
        <SubmitButton className="button button-secondary w-full" pendingLabel="Updating limits…">
          Update limits
        </SubmitButton>
        <p className="mt-2 text-xs leading-5 text-muted">Limits can only be increased.</p>
      </div>
    </form>
  );
}
