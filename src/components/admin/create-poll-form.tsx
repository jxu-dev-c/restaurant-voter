import type { LunchCenter } from "@/lib/domain/types";
import { SubmitButton } from "@/components/ui/submit-button";

type CreatePollFormProps = {
  centers: LunchCenter[];
  action: (formData: FormData) => Promise<void>;
};

export function CreatePollForm({ centers, action }: CreatePollFormProps) {
  return (
    <form action={action} className="panel grid gap-5 p-6">
      <div>
        <label className="field-label" htmlFor="title">Poll title</label>
        <input className="field" id="title" name="title" placeholder="Friday team lunch" required maxLength={100} />
      </div>
      <div>
        <label className="field-label" htmlFor="lunchCenterId">Lunch center</label>
        <select className="field" id="lunchCenterId" name="lunchCenterId" required defaultValue="">
          <option value="" disabled>Choose a saved center</option>
          {centers.map((center) => (
            <option value={center.id} key={center.id}>{center.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label" htmlFor="voteLimit">Choices per voter</label>
        <input className="field" id="voteLimit" name="voteLimit" type="number" min={1} max={10} defaultValue={3} required />
      </div>
      <div>
        <label className="field-label" htmlFor="nominationLimit">Nominations per voter</label>
        <input className="field" id="nominationLimit" name="nominationLimit" type="number" min={1} max={50} defaultValue={5} required />
        <p className="mt-2 text-sm text-muted">Used only when voter nominations are enabled.</p>
      </div>
      <label className="flex items-start gap-3 rounded-2xl border border-line bg-surface-soft p-4">
        <input className="mt-1 h-4 w-4 accent-[#ff6f3d]" type="checkbox" name="nominationsEnabled" defaultChecked />
        <span>
          <span className="block font-bold">Allow voter nominations</span>
          <span className="mt-1 block text-sm leading-6 text-muted">The poll will run a nomination phase before the candidate list locks.</span>
        </span>
      </label>
      <SubmitButton disabled={centers.length === 0} pendingLabel="Creating poll…">
        Create draft poll
      </SubmitButton>
      {centers.length === 0 ? (
        <p className="text-sm text-warning">Add a lunch center before creating a poll.</p>
      ) : null}
    </form>
  );
}
