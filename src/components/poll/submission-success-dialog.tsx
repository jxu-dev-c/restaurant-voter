"use client";

import { useEffect, useId, useRef } from "react";

import { SuccessIcon } from "@/components/ui/icons";

type SubmissionSuccessDialogProps = {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
};

export function SubmissionSuccessDialog({
  open,
  title,
  description,
  onClose,
}: SubmissionSuccessDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    } else if (!open && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  }, [open]);

  return (
    <dialog
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      className="dialog-shell"
      ref={dialogRef}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onClose={onClose}
    >
      <div className="p-6 text-center sm:p-8">
        <div className="state-icon state-icon-round state-icon-success mx-auto h-14 w-14">
          <SuccessIcon size={26} weight="light" />
        </div>
        <p className="eyebrow mt-5">Saved</p>
        <h2 className="mt-2 title-content text-2xl" id={titleId}>
          {title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted" id={descriptionId}>
          {description}
        </p>
        <button autoFocus className="button button-primary mt-6 w-full" type="button" onClick={onClose}>
          Done
        </button>
      </div>
    </dialog>
  );
}
