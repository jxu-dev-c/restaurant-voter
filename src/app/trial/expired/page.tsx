import { leaveTrial, tryOrganizer } from "@/app/trial/actions";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";

export default function TrialExpiredPage() {
  return (
    <main className="shell py-16">
      <Notice title="Your trial session has ended">
        The trial team resets weekly. Start a new trial to explore the latest sample data.
      </Notice>
      <div className="mt-6 flex flex-wrap gap-3">
        <form action={tryOrganizer}><SubmitButton pendingLabel="Opening trial…">Restart organizer trial</SubmitButton></form>
        <form action={leaveTrial}><SubmitButton className="button button-secondary">Leave trial</SubmitButton></form>
      </div>
    </main>
  );
}
