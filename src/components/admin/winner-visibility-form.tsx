"use client";

import { useFormStatus } from "react-dom";

import { HideIcon, ShowIcon } from "@/components/ui/icons";

function VisibilityButton({ hidden, label }: { hidden: boolean; label: string }) {
  const { pending } = useFormStatus();
  const actionLabel = hidden ? `Show ${label} in winner history` : `Hide ${label} from winner history`;

  return (
    <button
      aria-label={actionLabel}
      className="icon-button"
      disabled={pending}
      title={hidden ? "Show winner" : "Hide winner"}
      type="submit"
    >
      {hidden ? <ShowIcon size={16} /> : <HideIcon size={16} />}
    </button>
  );
}

/** Hidden winners stay on record but no longer flag the restaurant on ballots. */
export function WinnerVisibilityForm({
  action,
  hidden,
  label,
  winnerId,
}: {
  action: (formData: FormData) => Promise<void>;
  hidden: boolean;
  label: string;
  winnerId: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="winnerId" value={winnerId} />
      <input type="hidden" name="hidden" value={hidden ? "false" : "true"} />
      <VisibilityButton hidden={hidden} label={label} />
    </form>
  );
}
