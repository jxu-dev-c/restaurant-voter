"use client";

import { useActionState, useState } from "react";
import { PlaceAutocompleteSearch } from "@/components/google";
import type { ActionState } from "@/lib/domain/types";
import { initialActionState } from "@/lib/domain/types";
import type { GooglePlaceDetails, LatLngLiteral } from "@/lib/google/types";
import { SubmitButton } from "@/components/ui/submit-button";

type NominationFormProps = {
  center: LatLngLiteral;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
};

export function NominationForm({ center, action }: NominationFormProps) {
  const [state, formAction] = useActionState(action, initialActionState);
  const [selectedPlace, setSelectedPlace] = useState<GooglePlaceDetails | null>(null);

  return (
    <form action={formAction} className="panel p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Nominate a restaurant</h2>
          <p className="mt-1 text-sm leading-6 text-muted">Up to five nominations per voter. Existing choices are deduplicated automatically.</p>
        </div>
        <span className="status-pill">Google Maps</span>
      </div>
      <div className="mt-5">
        <PlaceAutocompleteSearch
          center={center}
          onPlaceSelect={setSelectedPlace}
          onError={() => setSelectedPlace(null)}
        />
      </div>
      <input type="hidden" name="placeId" value={selectedPlace?.placeId ?? ""} />
      {state.message ? (
        <p className={`mt-4 text-sm ${state.ok ? "text-leaf" : "text-danger"}`} role="status">
          {state.message}
        </p>
      ) : null}
      <div className="mt-5">
        <SubmitButton disabled={!selectedPlace} pendingLabel="Adding nomination…">
          Nominate this restaurant
        </SubmitButton>
      </div>
    </form>
  );
}
