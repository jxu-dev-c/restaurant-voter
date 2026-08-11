import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminCandidateForm } from "@/components/admin/admin-candidate-form";
import { CandidateRoster } from "@/components/admin/candidate-roster";
import { ParticipationList } from "@/components/admin/participation-list";
import { PhaseControls } from "@/components/admin/phase-controls";
import { PollLimitForm } from "@/components/admin/poll-limit-form";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmActionForm } from "@/components/ui/confirm-action-form";
import {
  addAdminCandidateAction,
  closePollAction,
  deletePollVoterAction,
  duplicatePollAction,
  resolveTieAction,
  rotatePollAccessAction,
  toggleCandidateAction,
  transitionPollAction,
  updatePollLimitsAction,
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
  const activeCandidateCount = poll.candidates.filter((candidate) => candidate.status === "active").length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        actions={<CopyLinkButton value={referralUrl} />}
        badge={<span className="status-pill" data-status={poll.status}>{poll.status}</span>}
        description={(
          <>
            {poll.center.label} · Up to {poll.maxChoices} choices per voter
            {poll.allowsVoterNominations
              ? ` · Up to ${poll.nominationLimit} nomination${poll.nominationLimit === 1 ? "" : "s"} per voter`
              : " · Admin-managed shortlist"}
          </>
        )}
        eyebrow="Poll workspace"
        title={poll.title}
      />

      <PhaseControls
        closeAction={closePollAction}
        poll={poll}
        resolveTieAction={resolveTieAction}
        transitionAction={transitionPollAction}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px] xl:items-start">
        <div className="space-y-6">
          <CandidateRoster
            candidates={poll.candidates}
            canEdit={canEditCandidates}
            pollId={poll.id}
            toggleAction={toggleCandidateAction}
          />

          {canEditCandidates ? (
            <details className="admin-section overflow-hidden" open={poll.candidates.length === 0}>
              <summary className="cursor-pointer list-none px-5 py-4 font-bold sm:px-6">
                <span className="flex items-center justify-between gap-3">
                  <span>Add a restaurant</span>
                  <span className="text-sm font-semibold text-muted">Search Google Maps</span>
                </span>
              </summary>
              <div className="border-t border-line">
                <AdminCandidateForm
                  action={addAdminCandidateAction}
                  center={{ lat: poll.center.latitude, lng: poll.center.longitude }}
                  embedded
                  pollId={poll.id}
                />
              </div>
            </details>
          ) : null}

          <ParticipationList
            candidates={poll.candidates}
            deleteAction={deletePollVoterAction}
            pollId={poll.id}
            pollStatus={poll.status}
            voters={poll.voters}
          />
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6">
          <section className="admin-section p-5">
            <p className="eyebrow">Share and access</p>
            <h2 className="mt-2 text-lg font-bold">Invite the team</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              This link handles joining, nominations, voting, and results as the poll moves through each phase.
            </p>
            <p className="mt-4 break-all rounded-xl bg-surface-soft p-3 font-mono text-xs leading-5 text-muted">{referralUrl}</p>
            <div className="mt-4"><CopyLinkButton value={referralUrl} /></div>
          </section>

          <section className="admin-section p-5">
            <p className="eyebrow">Poll settings</p>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <div><dt className="admin-data-label">Center</dt><dd className="admin-data-value">{poll.center.label}</dd></div>
              <div><dt className="admin-data-label">Access version</dt><dd className="admin-data-value">{poll.accessVersion}</dd></div>
            </dl>
            <PollLimitForm
              action={updatePollLimitsAction}
              activeCandidateCount={activeCandidateCount}
              poll={poll}
            />
            <details className="mt-5 border-t border-line pt-4">
              <summary className="cursor-pointer font-bold">Advanced actions</summary>
              <div className="mt-4 grid gap-3">
                <form action={duplicatePollAction}>
                  <input type="hidden" name="pollId" value={poll.id} />
                  <SubmitButton className="button button-secondary w-full" pendingLabel="Duplicating poll…">Duplicate as a new draft</SubmitButton>
                </form>
                <ConfirmActionForm
                  action={rotatePollAccessAction}
                  confirmMessage="Every earlier referral link and existing poll-access grant will stop working."
                  confirmTitle="Rotate the referral link?"
                >
                  <input type="hidden" name="pollId" value={poll.id} />
                  <SubmitButton className="button button-danger w-full" pendingLabel="Rotating link…">Rotate referral link</SubmitButton>
                </ConfirmActionForm>
              </div>
            </details>
          </section>
        </aside>
      </div>
    </div>
  );
}
