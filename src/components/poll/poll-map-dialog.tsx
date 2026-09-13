"use client";

import { useRef, useState } from "react";

import { RestaurantMap } from "@/components/google";
import { CloseIcon, MapIcon } from "@/components/ui/icons";
import type { InteractiveCandidateView } from "@/lib/domain/types";
import type { LatLngLiteral } from "@/lib/google/types";

type PollMapDialogProps = {
  center: LatLngLiteral;
  centerLabel: string;
  candidates: InteractiveCandidateView[];
};

export function PollMapDialog({
  center,
  centerLabel,
  candidates,
}: PollMapDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  function openDialog() {
    setIsOpen(true);
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
    setIsOpen(false);
  }

  return (
    <>
      <button
        aria-haspopup="dialog"
        className="button button-secondary mt-5"
        type="button"
        onClick={openDialog}
      >
        <MapIcon size={16} />
        View restaurant map
      </button>
      <dialog
        aria-labelledby="poll-map-title"
        className="dialog-shell max-h-[calc(100dvh-2rem)] max-w-[1000px] overflow-y-auto"
        ref={dialogRef}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}
        onClose={() => setIsOpen(false)}
      >
        {isOpen ? (
          <div className="p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="eyebrow">Restaurant locations</p>
                <h2 className="mt-2 title-content text-2xl" id="poll-map-title">
                  Map around {centerLabel}
                </h2>
              </div>
              <button
                aria-label="Close restaurant map"
                className="icon-button"
                type="button"
                onClick={closeDialog}
              >
                <CloseIcon size={16} />
              </button>
            </div>
            <RestaurantMap
              center={center}
              centerLabel={centerLabel}
              candidates={candidates}
            />
          </div>
        ) : null}
      </dialog>
    </>
  );
}
