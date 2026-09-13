import type { LunchCenter } from "@/lib/domain/types";
import { SubmitButton } from "@/components/ui/submit-button";

type CreatePollFormProps = {
  centers: LunchCenter[];
  action: (formData: FormData) => Promise<void>;
};

export function CreatePollForm({ centers, action }: CreatePollFormProps) {
  return (
    <form action={action} className="admin-section overflow-hidden">
      <section className="grid gap-5 p-5 sm:p-7">
        <div>
          <p className="eyebrow">1 · Basics</p>
          <h2 className="mt-2 card-title text-xl">Name the lunch and choose its center</h2>
        </div>
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
          <p className="mt-2 text-sm text-muted">Restaurant search will be centered around this location.</p>
        </div>
      </section>

      <section className="grid gap-5 border-t border-line p-5 sm:grid-cols-2 sm:p-7">
        <div className="sm:col-span-2">
          <p className="eyebrow">2 · Voting rules</p>
          <h2 className="mt-2 card-title text-xl">Set simple limits for the team</h2>
        </div>
        <div>
          <label className="field-label" htmlFor="voteLimit">Choices per voter</label>
          <input className="field" id="voteLimit" name="voteLimit" type="number" min={1} max={10} defaultValue={3} required />
          <p className="mt-2 text-sm text-muted">The final shortlist must contain at least this many restaurants.</p>
        </div>
        <div>
          <label className="field-label" htmlFor="nominationLimit">Nominations per voter</label>
          <input className="field" id="nominationLimit" name="nominationLimit" type="number" min={1} max={50} defaultValue={5} required />
          <p className="mt-2 text-sm text-muted">Used only when voter nominations are enabled.</p>
        </div>
      </section>

      <section className="grid gap-5 border-t border-line p-5 sm:p-7">
        <div>
          <p className="eyebrow">3 · Nominations</p>
          <h2 className="mt-2 card-title text-xl">Choose who builds the shortlist</h2>
        </div>
        <label className="flex items-start gap-3 rounded-2xl border border-line bg-surface-soft p-4">
          <input className="mt-1 h-4 w-4 accent-blue" type="checkbox" name="nominationsEnabled" defaultChecked />
          <span>
            <span className="block font-bold">Allow voter nominations</span>
            <span className="mt-1 block text-sm leading-6 text-muted">The draft will move through nominations before voting. Turn this off for an admin-managed shortlist.</span>
          </span>
        </label>
      </section>

      <div className="border-t border-line bg-surface-soft/65 p-5 sm:flex sm:items-center sm:justify-between sm:gap-5 sm:p-7">
        <p className="mb-4 text-sm leading-6 text-muted sm:mb-0">The new poll stays private as a draft until you explicitly open its next phase.</p>
        <div className="shrink-0">
          <SubmitButton disabled={centers.length === 0} pendingLabel="Creating poll…">
            Create draft poll
          </SubmitButton>
        </div>
        {centers.length === 0 ? (
          <p className="mt-3 text-sm font-semibold text-warning sm:mt-0">Add a lunch center first.</p>
        ) : null}
      </div>
    </form>
  );
}
