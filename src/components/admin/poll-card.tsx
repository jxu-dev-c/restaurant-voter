import Link from "next/link";
import type { AdminPollSummary } from "@/lib/domain/types";
import { formatDate } from "@/lib/domain/format";

export function PollCard({ poll }: { poll: AdminPollSummary }) {
  return (
    <article className="group px-5 py-5 transition hover:bg-white sm:px-6">
      <div className="grid gap-5 xl:grid-cols-[minmax(240px,1.35fr)_minmax(420px,1fr)_auto] xl:items-center">
        <div className="min-w-0">
          <span className="status-pill" data-status={poll.status}>{poll.status}</span>
          <h2 className="mt-2 truncate text-lg font-bold tracking-tight">{poll.title}</h2>
          <p className="mt-1 truncate text-sm text-muted">{poll.centerLabel}</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4">
          <div><dt className="admin-data-label">Restaurants</dt><dd className="admin-data-value">{poll.activeCandidateCount}</dd></div>
          <div><dt className="admin-data-label">Ballots</dt><dd className="admin-data-value">{poll.submittedBallotCount}</dd></div>
          <div><dt className="admin-data-label">Choices</dt><dd className="admin-data-value">Up to {poll.maxChoices}</dd></div>
          <div><dt className="admin-data-label">Created</dt><dd className="admin-data-value">{formatDate(poll.createdAt)}</dd></div>
        </dl>
        <Link className="button button-secondary w-full xl:w-auto" href={`/admin/polls/${poll.id}`}>
          Manage poll
        </Link>
      </div>
    </article>
  );
}
