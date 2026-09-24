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
import { DateIcon, PlaceIcon } from "@/components/ui/icons";
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
    <div className="min-h-screen bg-canvas">
      {poll.status !== "closed" || poll.outcomeStatus === "tie" ? <AutoRefresh /> : null}
      <SiteHeader
        trailing={
          poll.currentVoter ? (
            <span className="min-w-0 max-w-[50%] break-words text-right text-xs font-medium text-muted sm:text-sm">
              {poll.currentVoter.displayName} · {poll.currentVoter.voterCode}
            </span>
          ) : (
            <span className="status-pill">Voting Access</span>
          )
        }
      />
      {/* Full-bleed oat band, matching the landing page's section rhythm — the
          phase steps carry the poll's phase, so no status pill repeats it. */}
      <div className="poll-masthead">
        <div className="shell">
          <section className="poll-heading">
            <div className="grid gap-7 lg:grid-cols-[1fr_390px] lg:items-end">
              <div>
                <h1 className="admin-page-title">{poll.title}</h1>
                <p className="mt-3 flex items-center gap-2 text-muted">
                  {poll.status === "closed" ? (
                    <>
                      <DateIcon className="shrink-0" size={16} />
                      {`Voting closed ${formatDate(poll.closedAt)}.`}
                    </>
                  ) : (
                    <>
                      <PlaceIcon className="shrink-0" size={16} />
                      {`Driving estimates start from ${poll.center.label}.`}
                    </>
                  )}
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
        </div>
      </div>

      <main className="shell pb-10 sm:pb-14">
        {poll.status !== "closed" && !poll.currentVoter ? (
          <section className="mx-auto mt-7 max-w-xl">
            <JoinPollForm action={registerAction} />
          </section>
        ) : null}

        {poll.currentVoter && poll.status === "nominations" ? (
          <div className="layout-rail mt-7">
            <aside className="h-fit rail-sticky xl:col-start-2 xl:row-start-1">
              <NominationForm
                center={{ lat: poll.center.latitude, lng: poll.center.longitude }}
                nominationLimit={poll.nominationLimit}
                action={nominateAction}
              />
            </aside>
            <div className="min-w-0 xl:col-start-1 xl:row-start-1">
              <section>
                <div className="poll-section-heading">
                  <div>
                    <h2 className="title-content text-2xl">{activeCandidates.length} restaurants nominated</h2>
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
            <h2 className="sr-only">Poll results</h2>
            {poll.outcomeStatus === "no_votes" ? (
              <Notice title="No result" tone="warning">The poll closed without a submitted ballot.</Notice>
            ) : null}
            {poll.outcomeStatus === "tie" ? (
              <Notice title="The leaders are tied" tone="warning">The organizer is choosing one official winner from the tied restaurants.</Notice>
            ) : null}
            <div className={poll.winnerCandidateId ? "" : "mt-5"}>
              <ResultsList candidates={activeCandidates} winnerCandidateId={poll.winnerCandidateId} />
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
