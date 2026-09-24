import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PollDashboard } from "@/components/admin/poll-dashboard";
import { listAdminPolls } from "@/lib/data/polls";
import { NewPollIcon, PollsIcon } from "@/components/ui/icons";

export default async function AdminDashboardPage() {
  const polls = await listAdminPolls();

  return (
    <div>
      <AdminPageHeader
        actions={<Link className="button button-primary" href="/admin/polls/new"><NewPollIcon size={16} />New poll</Link>}
        description="See what needs attention, move polls forward safely, and keep lunch decisions on track."
        title="Lunch polls"
      />

      {polls.length ? <PollDashboard polls={polls} /> : (
        <div className="admin-section mt-8 grid justify-items-center p-8 text-center">
            <span className="state-icon">
              <PollsIcon size={22} weight="light" />
            </span>
            <h2 className="card-title mt-4 text-xl">No lunch polls yet</h2>
            <p className="mt-2 text-muted">Add a lunch center, then create the first poll.</p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link className="button button-secondary" href="/admin/centers">Add a center</Link>
              <Link className="button button-primary" href="/admin/polls/new"><NewPollIcon size={16} />Create a poll</Link>
            </div>
        </div>
      )}
    </div>
  );
}
