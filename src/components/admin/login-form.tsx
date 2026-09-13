"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/domain/types";
import { initialActionState } from "@/lib/domain/types";
import { SubmitButton } from "@/components/ui/submit-button";
import { EmailIcon } from "@/components/ui/icons";

type LoginFormProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
};

export function LoginForm({ action }: LoginFormProps) {
  const [state, formAction] = useActionState(action, initialActionState);

  return (
    <form action={formAction} className="panel p-6 sm:p-8">
      <div>
        <label className="field-label" htmlFor="email">Email address</label>
        <input className="field" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {state.message ? (
        <p className={`mt-4 text-sm ${state.ok ? "text-leaf" : "text-danger"}`} role="status">
          {state.message}
        </p>
      ) : null}
      <div className="mt-6">
        <SubmitButton pendingLabel="Sending sign-in link…">
          <EmailIcon size={16} />
          Email me a sign-in link
        </SubmitButton>
      </div>
    </form>
  );
}
