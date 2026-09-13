import Link from "next/link";
import type { AdminPollSummary } from "@/lib/domain/types";
import { formatDate } from "@/lib/domain/format";
import {
  BallotIcon,
  CaretRightIcon,
  ChoicesIcon,
  DateIcon,
  RestaurantIcon,
} from "@/components/ui/icons";

export function PollCard({ poll }: { poll: AdminPollSummary }) {
  return (
    <article className="group px-5 py-5 transition hover:bg-band sm:px-6">
      <div className="grid gap-5 xl:grid-cols-[minmax(240px,1.35fr)_minmax(420px,1fr)_auto] xl:items-center">
        <div className="min-w-0">
          <span className="status-pill" data-status={poll.status}>{poll.status}</span>
          <h2 className="mt-2 truncate card-title">{poll.title}</h2>
          <p className="mt-1 truncate text-sm text-muted">{poll.centerLabel}</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4">
          <div>
            <dt className="admin-data-label flex items-center gap-1.5"><RestaurantIcon className="data-icon" size={15} />Restaurants</dt>
            <dd className="admin-data-value">{poll.activeCandidateCount}</dd>
          </div>
          <div>
            <dt className="admin-data-label flex items-center gap-1.5"><BallotIcon className="data-icon" size={15} />Ballots</dt>
            <dd className="admin-data-value">{poll.submittedBallotCount}</dd>
          </div>
          <div>
            <dt className="admin-data-label flex items-center gap-1.5"><ChoicesIcon className="data-icon" size={15} />Choices</dt>
            <dd className="admin-data-value">Up to {poll.maxChoices}</dd>
          </div>
          <div>
            <dt className="admin-data-label flex items-center gap-1.5"><DateIcon className="data-icon" size={15} />Created</dt>
            <dd className="admin-data-value">{formatDate(poll.createdAt)}</dd>
          </div>
        </dl>
        <Link className="button button-secondary w-full xl:w-auto" href={`/admin/polls/${poll.id}`}>
          Manage poll
          <CaretRightIcon size={14} />
        </Link>
      </div>
    </article>
  );
}
