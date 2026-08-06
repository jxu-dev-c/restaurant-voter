import Link from "next/link";
import type { AdminPollSummary } from "@/lib/domain/types";
import { formatDate } from "@/lib/domain/format";

export function PollCard({ poll }: { poll: AdminPollSummary }) {
  return (
    <article className="panel p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="status-pill">{poll.status}</span>
          <h2 className="mt-3 text-xl font-bold tracking-tight">{poll.title}</h2>
          <p className="mt-1 text-sm text-muted">Centered on {poll.centerLabel}</p>
        </div>
        <Link className="button button-secondary" href={`/admin/polls/${poll.id}`}>
          Manage
        </Link>
      </div>
      <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-5 sm:grid-cols-4">
        <div>
          <dt className="text-xs font-bold uppercase tracking-[0.1em] text-subtle">Candidates</dt>
          <dd className="mt-1 font-bold">{poll.activeCandidateCount}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-[0.1em] text-subtle">Ballots</dt>
          <dd className="mt-1 font-bold">{poll.submittedBallotCount}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-[0.1em] text-subtle">Choices</dt>
          <dd className="mt-1 font-bold">Up to {poll.maxChoices}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-[0.1em] text-subtle">Created</dt>
          <dd className="mt-1 font-bold">{formatDate(poll.createdAt)}</dd>
        </div>
      </dl>
    </article>
  );
}
