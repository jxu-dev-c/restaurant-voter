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
      <PlaceAutocompleteSearch center={center} onPlaceSelect={setPlace} />
      <input type="hidden" name="pollId" value={pollId} />
      <input type="hidden" name="placeId" value={place?.placeId ?? ""} />
      <div className="mt-4">
        <SubmitButton disabled={!place} pendingLabel="Adding candidate…">Add candidate</SubmitButton>
      </div>
    </form>
  );
}
