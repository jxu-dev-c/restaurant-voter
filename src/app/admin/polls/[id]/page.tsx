import { notFound } from "next/navigation";
import { GooglePlaceDetailsCard } from "@/components/google";
import { AdminCandidateForm } from "@/components/admin/admin-candidate-form";
import { PhaseControls } from "@/components/admin/phase-controls";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmActionForm } from "@/components/ui/confirm-action-form";
import {
  addAdminCandidateAction,
  closePollAction,
  duplicatePollAction,
  resolveTieAction,
  rotatePollAccessAction,
  toggleCandidateAction,
  transitionPollAction,
} from "@/app/admin/actions";
import { getAdminPollDetail } from "@/lib/data/polls";
import { getPublicEnvironment } from "@/lib/env";
import { createReferralToken } from "@/lib/security/referral";

export default async function AdminPollPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const poll = await getAdminPollDetail(id);
  if (!poll) notFound();

  const token = createReferralToken({ pollPublicId: poll.publicId, accessVersion: poll.accessVersion });
  const referralUrl = new URL(`/join/${token}`, getPublicEnvironment().appUrl).toString();
  const canEditCandidates = poll.status === "draft" || poll.status === "nominations";
  const candidateById = new Map(poll.candidates.map((candidate) => [candidate.id, candidate]));

  return (
    <div className="space-y-6">
      <section className="panel p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <span className="status-pill">{poll.status}</span>
            <h1 className="mt-4 text-3xl font-black tracking-[-0.045em] sm:text-4xl">{poll.title}</h1>
            <p className="mt-2 text-muted">{poll.center.label} · Up to {poll.maxChoices} choices per voter</p>
          </div>
          <CopyLinkButton value={referralUrl} />
        </div>
        <div className="mt-6 rounded-2xl border border-line bg-surface-soft p-4">
          <p className="break-all font-mono text-xs text-muted">{referralUrl}</p>
          <ConfirmActionForm
            action={rotatePollAccessAction}
            className="mt-3"
            confirmMessage="Rotate this referral link? Every earlier link and existing poll-access grant will stop working."
          >
            <input type="hidden" name="pollId" value={poll.id} />
            <SubmitButton className="button button-secondary" pendingLabel="Rotating link…">Rotate referral link</SubmitButton>
          </ConfirmActionForm>
          <form action={duplicatePollAction} className="mt-3">
            <input type="hidden" name="pollId" value={poll.id} />
            <SubmitButton className="button button-secondary" pendingLabel="Duplicating poll…">Duplicate as a new draft</SubmitButton>
          </form>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <section className="panel p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Candidate roster</p>
                <h2 className="mt-2 text-2xl font-bold">{poll.candidates.filter((item) => item.status === "active").length} active restaurants</h2>
              </div>
              {!canEditCandidates ? <span className="status-pill">Locked</span> : null}
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {poll.candidates.map((candidate) => (
                <article className={`rounded-2xl border p-3 ${candidate.status === "removed" ? "border-line bg-surface-soft opacity-65" : "border-line bg-white"}`} key={candidate.id}>
                  <GooglePlaceDetailsCard placeId={candidate.placeId} fallbackLabel={candidate.fallbackLabel} />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-muted">{candidate.source} · {candidate.status}</span>
                    {canEditCandidates ? (
                      <form action={toggleCandidateAction}>
                        <input type="hidden" name="pollId" value={poll.id} />
                        <input type="hidden" name="candidateId" value={candidate.id} />
                        <input type="hidden" name="active" value={candidate.status === "removed" ? "true" : "false"} />
                        <SubmitButton className="button button-secondary" pendingLabel="Updating…">
                          {candidate.status === "removed" ? "Restore" : "Remove"}
                        </SubmitButton>
                      </form>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>

          {canEditCandidates ? (
            <AdminCandidateForm pollId={poll.id} center={{ lat: poll.center.latitude, lng: poll.center.longitude }} action={addAdminCandidateAction} />
          ) : null}

          <section className="panel p-6">
            <p className="eyebrow">Participation</p>
            <h2 className="mt-2 text-2xl font-bold">{poll.voters.filter((voter) => voter.submittedAt).length} submitted ballots</h2>
            <div className="mt-5 grid gap-2">
              {poll.voters.length ? poll.voters.map((voter) => (
                <div className="rounded-xl border border-line bg-white p-3" key={voter.id}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{voter.displayName} · {voter.voterCode}</span>
                    <span className="text-sm text-muted">{voter.submittedAt ? "Submitted" : "Not submitted"}</span>
                  </div>
                  {poll.status === "closed" && voter.candidateIds?.length ? (
                    <p className="mt-2 text-sm text-muted">{voter.candidateIds.map((candidateId) => candidateById.get(candidateId)?.fallbackLabel ?? "Unknown").join(", ")}</p>
                  ) : null}
                </div>
              )) : <p className="text-muted">No voters have joined yet.</p>}
            </div>
          </section>
        </div>

        <aside className="h-fit xl:sticky xl:top-6">
          <PhaseControls poll={poll} transitionAction={transitionPollAction} closeAction={closePollAction} resolveTieAction={resolveTieAction} />
        </aside>
      </div>
    </div>
  );
}
