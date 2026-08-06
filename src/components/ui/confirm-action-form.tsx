"use client";

import type { FormEvent, ReactNode } from "react";

export function ConfirmActionForm({
  action,
  confirmMessage,
  className,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  confirmMessage: string;
  className?: string;
  children: ReactNode;
}) {
  function confirmSubmit(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm(confirmMessage)) event.preventDefault();
  }

  return (
    <form action={action} className={className} onSubmit={confirmSubmit}>
      {children}
    </form>
  );
}
