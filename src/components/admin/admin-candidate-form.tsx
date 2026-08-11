"use client";

import { useState } from "react";
import { PlaceAutocompleteSearch } from "@/components/google";
import type { GooglePlaceDetails, LatLngLiteral } from "@/lib/google/types";
import { SubmitButton } from "@/components/ui/submit-button";

export function AdminCandidateForm({
  pollId,
  center,
  action,
  embedded = false,
}: {
  pollId: string;
  center: LatLngLiteral;
  action: (formData: FormData) => Promise<void>;
  embedded?: boolean;
}) {
  const [place, setPlace] = useState<GooglePlaceDetails | null>(null);

  return (
    <form action={action} className={embedded ? "p-5 sm:p-6" : "panel p-5"}>
      <h2 className="font-bold">Add an admin candidate</h2>
      <p className="mt-1 text-sm leading-6 text-muted">Candidates can be changed only before voting starts.</p>
      <div className="mt-4">
        <PlaceAutocompleteSearch center={center} onPlaceSelect={setPlace} />
      </div>
      <input type="hidden" name="pollId" value={pollId} />
      <input type="hidden" name="placeId" value={place?.placeId ?? ""} />
      <div className="mt-4">
        <SubmitButton disabled={!place} pendingLabel="Adding candidate…">Add candidate</SubmitButton>
      </div>
    </form>
  );
}
