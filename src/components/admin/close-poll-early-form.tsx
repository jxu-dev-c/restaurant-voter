import { ConfirmActionForm } from "@/components/ui/confirm-action-form";
import { SubmitButton } from "@/components/ui/submit-button";

/** Before voting opens, an organizer can close a poll with no winner. */
export function ClosePollEarlyForm({
  action,
  pollId,
}: {
  action: (formData: FormData) => Promise<void>;
  pollId: string;
}) {
  return (
    <div className="mt-5 border-t border-line pt-4">
      <h3 className="card-title">Close early</h3>
      <p className="mt-1 mb-3 text-sm text-muted">
        Made by mistake or no longer needed? Close it now without a winner.
      </p>
      <ConfirmActionForm
        action={action}
        confirmLabel="Close poll"
        confirmMessage="Close this poll now? No winner is recorded and it cannot reopen. You can still duplicate it as a new draft."
        confirmTitle="Close this poll early?"
        tone="danger"
      >
        <input type="hidden" name="pollId" value={pollId} />
        <SubmitButton className="button button-danger button-compact" pendingLabel="Closing poll…">
          Close poll early
        </SubmitButton>
      </ConfirmActionForm>
    </div>
  );
}
