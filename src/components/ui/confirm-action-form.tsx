"use client";

import { useId, useRef, type FormEvent, type ReactNode } from "react";

export function ConfirmActionForm({
  action,
  confirmMessage,
  confirmTitle = "Confirm action",
  confirmLabel = "Continue",
  tone = "default",
  className,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  confirmMessage: string;
  confirmTitle?: string;
  confirmLabel?: string;
  tone?: "default" | "danger";
  className?: string;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmedRef = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  function confirmSubmit(event: FormEvent<HTMLFormElement>) {
    if (confirmedRef.current) {
      confirmedRef.current = false;
      return;
    }

    event.preventDefault();
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function submitConfirmed() {
    confirmedRef.current = true;
    closeDialog();
    formRef.current?.requestSubmit();
  }

  return (
    <>
      <form action={action} className={className} ref={formRef} onSubmit={confirmSubmit}>
        {children}
      </form>
      <dialog
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-3xl bg-white p-0 text-ink shadow-2xl backdrop:bg-slate-950/55"
        ref={dialogRef}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}
      >
        <div className="p-6 sm:p-7">
          <p className="eyebrow">Confirmation required</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight" id={titleId}>
            {confirmTitle}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted" id={descriptionId}>
            {confirmMessage}
          </p>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="button button-secondary" type="button" onClick={closeDialog}>
              Cancel
            </button>
            <button
              className={tone === "danger" ? "button button-danger" : "button button-primary"}
              type="button"
              onClick={submitConfirmed}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
