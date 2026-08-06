import { SubmitButton } from "@/components/ui/submit-button";

type CenterFormProps = {
  action: (formData: FormData) => Promise<void>;
};

export function CenterForm({ action }: CenterFormProps) {
  return (
    <form action={action} className="panel grid gap-5 p-6 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="field-label" htmlFor="name">Center name</label>
        <input className="field" id="name" name="name" placeholder="Downtown office" required maxLength={80} />
      </div>
      <div className="sm:col-span-2">
        <label className="field-label" htmlFor="addressLabel">Address label</label>
        <input className="field" id="addressLabel" name="addressLabel" placeholder="1800 Argyle Street, Halifax" maxLength={180} />
      </div>
      <div>
        <label className="field-label" htmlFor="latitude">Latitude</label>
        <input className="field" id="latitude" name="latitude" type="number" step="any" min={-90} max={90} required />
      </div>
      <div>
        <label className="field-label" htmlFor="longitude">Longitude</label>
        <input className="field" id="longitude" name="longitude" type="number" step="any" min={-180} max={180} required />
      </div>
      <input type="hidden" name="googlePlaceId" value="" />
      <div className="sm:col-span-2">
        <SubmitButton pendingLabel="Adding center…">Add lunch center</SubmitButton>
      </div>
    </form>
  );
}
