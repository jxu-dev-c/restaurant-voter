import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PollDashboard } from "@/components/admin/poll-dashboard";
import { listAdminPolls } from "@/lib/data/polls";

export default async function AdminDashboardPage() {
  const polls = await listAdminPolls();

  return (
    <div>
      <AdminPageHeader
        actions={<Link className="button button-primary" href="/admin/polls/new">New poll</Link>}
        description="See what needs attention, move polls forward safely, and keep lunch decisions on track."
        eyebrow="Admin dashboard"
        title="Lunch polls"
      />

      {polls.length ? <PollDashboard polls={polls} /> : (
        <div className="admin-section mt-8 p-8 text-center">
            <h2 className="text-xl font-bold">No lunch polls yet</h2>
            <p className="mt-2 text-muted">Add a lunch center, then create the first poll.</p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link className="button button-secondary" href="/admin/centers">Add a center</Link>
              <Link className="button button-primary" href="/admin/polls/new">Create a poll</Link>
            </div>
        </div>
      )}
    </div>
  );
}
