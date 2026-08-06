"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
};

export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  className = "button button-primary",
  disabled,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button className={className} type="submit" disabled={disabled || pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
