import Link from "next/link";
import { PollCard } from "@/components/admin/poll-card";
import { listAdminPolls } from "@/lib/data/polls";

export default async function AdminDashboardPage() {
  const polls = await listAdminPolls();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Admin dashboard</p>
          <h1 className="section-title mt-3">Lunch polls</h1>
          <p className="mt-3 text-muted">Create the shortlist, share a referral link, and close the vote when the team is ready.</p>
        </div>
        <Link className="button button-primary" href="/admin/polls/new">New poll</Link>
      </div>

      <div className="mt-8 grid gap-4">
        {polls.length ? polls.map((poll) => <PollCard poll={poll} key={poll.id} />) : (
          <div className="panel p-8 text-center">
            <h2 className="text-xl font-bold">No lunch polls yet</h2>
            <p className="mt-2 text-muted">Add a lunch center, then create the first poll.</p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link className="button button-secondary" href="/admin/centers">Add a center</Link>
              <Link className="button button-primary" href="/admin/polls/new">Create a poll</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
