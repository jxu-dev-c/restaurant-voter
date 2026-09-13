import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminCandidateForm } from "@/components/admin/admin-candidate-form";
import { CandidateRoster } from "@/components/admin/candidate-roster";
import { ParticipationList } from "@/components/admin/participation-list";
import { PhaseControls } from "@/components/admin/phase-controls";
import { PollLimitForm } from "@/components/admin/poll-limit-form";
import { ReferralLinkPanel } from "@/components/admin/referral-link-panel";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { SubmitButton } from "@/components/ui/submit-button";
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

const TABS = [
  { key: "roster", label: "Roster" },
  { key: "participation", label: "Participation" },
  { key: "settings", label: "Share & settings" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function resolveTab(value: string | string[] | undefined): TabKey {
  const candidate = Array.isArray(value) ? value[0] : value;
  return TABS.some((tab) => tab.key === candidate) ? (candidate as TabKey) : "roster";
}

export default async function AdminPollPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const tab = resolveTab((await searchParams).tab);
  const poll = await getAdminPollDetail(id);
  if (!poll) notFound();

  const token = createReferralToken({
    pollPublicId: poll.publicId,
    accessVersion: poll.accessVersion,
  });
  const referralUrl = new URL(
    `/join/${token}`,
    getPublicEnvironment().appUrl,
  ).toString();
  const canEditCandidates = poll.status === "draft" || poll.status === "nominations";
  const activeCandidateCount = poll.candidates.filter(
    (candidate) => candidate.status === "active",
  ).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        actions={<CopyLinkButton value={referralUrl} />}
        badge={
          <span className="status-pill" data-status={poll.status}>
            {poll.status}
          </span>
        }
        description={
          <>
            {poll.center.label} · Up to {poll.maxChoices} choices per voter
            {poll.allowsVoterNominations
              ? ` · Up to ${poll.nominationLimit} nomination${
                  poll.nominationLimit === 1 ? "" : "s"
                } per voter`
              : " · Admin-managed shortlist"}
          </>
        }
        title={poll.title}
      />

      {/* Lifecycle stays pinned above the tabs — it is the point of the page. */}
      <PhaseControls
        closeAction={closePollAction}
        poll={poll}
        resolveTieAction={resolveTieAction}
        transitionAction={transitionPollAction}
      />

      {/* URL-param tabs keep this a server component and stay linkable. */}
      <nav className="admin-filter-group" aria-label="Poll sections">
        {TABS.map((item) => (
          <Link
            key={item.key}
            className="admin-filter-button"
            aria-current={tab === item.key ? "page" : undefined}
            href={`?tab=${item.key}`}
            scroll={false}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {tab === "roster" ? (
        <div className="space-y-6">
          <CandidateRoster
            candidates={poll.candidates}
            canEdit={canEditCandidates}
            pollId={poll.id}
            toggleAction={toggleCandidateAction}
          />

          {canEditCandidates ? (
            <section className="admin-section overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6">
                <h2 className="card-title">Add a restaurant</h2>
                <span className="text-sm text-muted">Search Google Maps</span>
              </div>
              <div className="border-t border-line">
                <AdminCandidateForm
                  action={addAdminCandidateAction}
                  center={{ lat: poll.center.latitude, lng: poll.center.longitude }}
                  embedded
                  pollId={poll.id}
                />
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {tab === "participation" ? (
        <ParticipationList
          candidates={poll.candidates}
          deleteAction={deletePollVoterAction}
          pollId={poll.id}
          pollStatus={poll.status}
          voters={poll.voters}
        />
      ) : null}

      {tab === "settings" ? (
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <ReferralLinkPanel
            pollId={poll.id}
            referralUrl={referralUrl}
            rotateAction={rotatePollAccessAction}
          />

          <section className="admin-section p-5">
            <p className="eyebrow">Poll settings</p>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <dt className="admin-data-label">Center</dt>
                <dd className="admin-data-value">{poll.center.label}</dd>
              </div>
              <div>
                <dt className="admin-data-label">Access version</dt>
                <dd className="admin-data-value">{poll.accessVersion}</dd>
              </div>
            </dl>
            <PollLimitForm
              action={updatePollLimitsAction}
              activeCandidateCount={activeCandidateCount}
              poll={poll}
            />
            <div className="mt-5 border-t border-line pt-4">
              <h3 className="card-title">Duplicate</h3>
              <p className="mt-1 mb-3 text-sm text-muted">
                Copy the center, limits, and shortlist into a fresh draft.
              </p>
              <form action={duplicatePollAction}>
                <input type="hidden" name="pollId" value={poll.id} />
                <SubmitButton
                  className="button button-secondary button-compact"
                  pendingLabel="Duplicating poll…"
                >
                  Duplicate as a new draft
                </SubmitButton>
              </form>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
