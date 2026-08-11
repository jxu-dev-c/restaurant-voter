"use client";

import { useState } from "react";
import { PlaceAutocompleteSearch } from "@/components/google";
import type { GooglePlaceDetails } from "@/lib/google/types";
import { SubmitButton } from "@/components/ui/submit-button";

export function ManualWinnerForm({
  action,
  defaultDate,
}: {
  action: (formData: FormData) => Promise<void>;
  defaultDate: string;
}) {
  const [place, setPlace] = useState<GooglePlaceDetails | null>(null);

  return (
    <form action={action} className="admin-section grid gap-5 p-5 sm:p-6">
      <div>
        <p className="eyebrow">Add history</p>
        <h2 className="mt-2 text-xl font-bold">Record a previous winner</h2>
        <p className="mt-1 text-sm leading-6 text-muted">Select the Google Place so future nominations can be matched reliably.</p>
      </div>
      <PlaceAutocompleteSearch center={null} onPlaceSelect={setPlace} />
      <input type="hidden" name="placeId" value={place?.placeId ?? ""} />
      <div>
        <label className="field-label" htmlFor="wonOn">Winning date</label>
        <input className="field" id="wonOn" name="wonOn" type="date" required defaultValue={defaultDate} />
      </div>
      <div>
        <label className="field-label" htmlFor="notes">Notes</label>
        <textarea className="field min-h-24" id="notes" name="notes" maxLength={500} placeholder="Optional context" />
      </div>
      <SubmitButton className="button button-primary w-full" disabled={!place} pendingLabel="Recording winner…">Add to winner history</SubmitButton>
    </form>
  );
}
