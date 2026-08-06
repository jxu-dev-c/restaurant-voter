"use client";

import { useActionState, useState } from "react";
import { PlaceAutocompleteSearch } from "@/components/google";
import type { ActionState } from "@/lib/domain/types";
import { initialActionState } from "@/lib/domain/types";
import type { GooglePlaceDetails, LatLngLiteral } from "@/lib/google/types";
import { SubmitButton } from "@/components/ui/submit-button";
import { SubmissionSuccessDialog } from "./submission-success-dialog";

type NominationFormProps = {
  center: LatLngLiteral;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
};

export function NominationForm({ center, action }: NominationFormProps) {
  const [selectedPlace, setSelectedPlace] = useState<GooglePlaceDetails | null>(null);
  const [searchKey, setSearchKey] = useState(0);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [state, formAction] = useActionState(async (previousState: ActionState, formData: FormData) => {
    const nextState = await action(previousState, formData);

    if (nextState.ok) {
      setSelectedPlace(null);
      setSearchKey((currentKey) => currentKey + 1);
      setSuccessDialogOpen(true);
    }

    return nextState;
  }, initialActionState);

  return (
    <>
      <form action={formAction} className="panel p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-bold">Nominate a restaurant</h2>
          <p className="mt-1 text-sm leading-6 text-muted">Up to five nominations per voter. Existing choices are deduplicated automatically.</p>
        </div>
        <div className="mt-5">
          <PlaceAutocompleteSearch
            key={searchKey}
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
      <SubmissionSuccessDialog
        description="Your nomination was added. You can return using this same link while nominations are still open."
        open={successDialogOpen}
        title="Nomination saved"
        onClose={() => setSuccessDialogOpen(false)}
      />
    </>
  );
}
