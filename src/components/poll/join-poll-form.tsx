"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/domain/types";
import { initialActionState } from "@/lib/domain/types";
import { SubmitButton } from "@/components/ui/submit-button";

type JoinPollFormProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
};

export function JoinPollForm({ action }: JoinPollFormProps) {
  const [state, formAction] = useActionState(action, initialActionState);

  return (
    <form action={formAction} className="panel p-6 sm:p-8">
      <label className="field-label" htmlFor="displayName">Your display name</label>
      <input
        className="field"
        id="displayName"
        name="displayName"
        autoComplete="name"
        minLength={1}
        maxLength={50}
        placeholder="Alex"
        required
      />
      <p className="mt-3 text-sm leading-6 text-muted">
        This browser will remember your ballot. Your name is never shown to other voters.
      </p>
      {state.message ? <p className="mt-4 text-sm text-danger" role="alert">{state.message}</p> : null}
      <div className="mt-6">
        <SubmitButton pendingLabel="Joining poll…">Join this poll</SubmitButton>
      </div>
    </form>
  );
}
