import { CreatePollForm } from "@/components/admin/create-poll-form";
import { createPollAction } from "@/app/admin/actions";
import { listLunchCenters } from "@/lib/data/polls";

export default async function NewPollPage() {
  const centers = await listLunchCenters();
  return (
    <div className="mx-auto max-w-2xl">
      <p className="eyebrow">New lunch poll</p>
      <h1 className="section-title mt-3">Set the table.</h1>
      <p className="mt-3 text-muted">The draft remains private until you open nominations or voting.</p>
      <div className="mt-8"><CreatePollForm centers={centers} action={createPollAction} /></div>
    </div>
  );
}
