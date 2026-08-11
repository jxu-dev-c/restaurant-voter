import { CreatePollForm } from "@/components/admin/create-poll-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { createPollAction } from "@/app/admin/actions";
import { listLunchCenters } from "@/lib/data/polls";

export default async function NewPollPage() {
  const centers = await listLunchCenters();
  return (
    <div>
      <AdminPageHeader
        description="Set the center and participation rules now. You can curate restaurants safely while the poll remains a private draft."
        eyebrow="New lunch poll"
        title="Set the table"
      />
      <div className="mt-8 max-w-3xl"><CreatePollForm centers={centers} action={createPollAction} /></div>
    </div>
  );
}
