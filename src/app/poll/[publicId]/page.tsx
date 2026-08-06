import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { AutoRefresh } from "@/components/poll/auto-refresh";
import { BallotForm } from "@/components/poll/ballot-form";
import { CandidateGallery } from "@/components/poll/candidate-gallery";
import { JoinPollForm } from "@/components/poll/join-poll-form";
import { NominationForm } from "@/components/poll/nomination-form";
import { PhaseSteps } from "@/components/poll/phase-steps";
import { PollMapDialog } from "@/components/poll/poll-map-dialog";
import { ResultsList } from "@/components/poll/results-list";
import { Notice } from "@/components/ui/notice";
import { getAuthorizedPoll } from "@/lib/data/access";
import { getPublicPollView } from "@/lib/data/polls";
import { formatDate } from "@/lib/domain/format";
import { readPollDeviceIdentity } from "@/lib/security/poll-cookies";
import {
  nominateRestaurantAction,
  registerVoterAction,
  removeNominationAction,
  saveBallotAction,
} from "./actions";

export const metadata: Metadata = {
  title: "Team lunch poll",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PollPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const authorized = await getAuthorizedPoll(publicId);
  if (!authorized) notFound();

  const device = await readPollDeviceIdentity(publicId);
  const poll = await getPublicPollView(publicId, device?.deviceHash);
  if (!poll) notFound();

  const activeCandidates = poll.candidates.filter((candidate) => candidate.status === "active");
  const interactiveCandidates = activeCandidates.map((candidate) => ({
    id: candidate.id,
    placeId: candidate.placeId,
    fallbackLabel: candidate.fallbackLabel,
    previousWinnerAt: candidate.previousWinnerAt,
    canRemoveNomination: candidate.canRemoveNomination,
  }));
  const registerAction = registerVoterAction.bind(null, publicId);
  const nominateAction = nominateRestaurantAction.bind(null, publicId);
  const removeNomination = removeNominationAction.bind(null, publicId);
  const saveAction = saveBallotAction.bind(null, publicId);

  return (
    <div className="min-h-screen bg-surface-soft">
      {poll.status !== "closed" || poll.outcomeStatus === "tie" ? <AutoRefresh /> : null}
      <SiteHeader
        trailing={
          poll.currentVoter ? (
            <span className="text-sm font-semibold text-muted">
              {poll.currentVoter.displayName} · {poll.currentVoter.voterCode}
            </span>
          ) : (
            <span className="status-pill">Voting Access</span>
          )
        }
      />
      <main className="shell py-7 sm:py-10">
        <section className="panel p-5 sm:p-7">
          <div className="grid gap-7 lg:grid-cols-[1fr_390px] lg:items-end">
            <div>
              <span className="status-pill">{poll.status}</span>
              <h1 className="mt-4 text-3xl font-black tracking-[-0.045em] sm:text-5xl">{poll.title}</h1>
              <p className="mt-3 text-muted">
                {poll.status === "closed"
                  ? `Voting closed ${formatDate(poll.closedAt)}.`
                  : `Driving estimates start from ${poll.center.label}.`}
              </p>
              {poll.currentVoter && (poll.status === "nominations" || poll.status === "voting") ? (
                <PollMapDialog
                  center={{ lat: poll.center.latitude, lng: poll.center.longitude }}
                  centerLabel={poll.center.label}
                  candidates={interactiveCandidates}
                />
              ) : null}
            </div>
            <PhaseSteps status={poll.status} />
          </div>
        </section>

        {poll.status !== "closed" && !poll.currentVoter ? (
          <section className="mx-auto mt-7 max-w-xl">
            <JoinPollForm action={registerAction} />
          </section>
        ) : null}

        {poll.currentVoter && poll.status === "nominations" ? (
          <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1fr)_390px]">
            <aside className="h-fit xl:col-start-2 xl:row-start-1 xl:sticky xl:top-6">
              <NominationForm
                center={{ lat: poll.center.latitude, lng: poll.center.longitude }}
                nominationLimit={poll.nominationLimit}
                action={nominateAction}
              />
            </aside>
            <div className="min-w-0 xl:col-start-1 xl:row-start-1">
              <section>
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="eyebrow">Current shortlist</p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight">{activeCandidates.length} restaurants nominated</h2>
                  </div>
                </div>
                {activeCandidates.length ? (
                  <CandidateGallery
                    publicId={publicId}
                    candidates={interactiveCandidates}
                    removeAction={removeNomination}
                  />
                ) : (
                  <Notice title="No nominations yet">Be the first person to add a lunch option.</Notice>
                )}
              </section>
            </div>
          </div>
        ) : null}

        {poll.currentVoter && poll.status === "voting" ? (
          <section className="mt-7">
            <BallotForm
              pollId={poll.id}
              publicId={poll.publicId}
              candidates={interactiveCandidates}
              initialCandidateIds={poll.ballot?.candidateIds ?? []}
              revision={poll.ballot?.revision ?? 0}
              maxChoices={poll.maxChoices}
              saveAction={saveAction}
            />
          </section>
        ) : null}

        {poll.status === "closed" ? (
          <section className="mt-7 min-w-0">
            {poll.outcomeStatus === "no_votes" ? (
              <Notice title="No result" tone="warning">The poll closed without a submitted ballot.</Notice>
            ) : null}
            {poll.outcomeStatus === "tie" ? (
              <Notice title="The leaders are tied" tone="warning">The organizer is choosing one official winner from the tied restaurants.</Notice>
            ) : null}
            {poll.winnerCandidateId ? (
              <Notice title="We have a winner" tone="success">The official winner is highlighted below.</Notice>
            ) : null}
            <div className="mt-5">
              <ResultsList candidates={activeCandidates} winnerCandidateId={poll.winnerCandidateId} />
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
