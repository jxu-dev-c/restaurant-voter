import { leaveTrial } from "@/app/trial/actions";

export function TrialNotice({ resetsAt, organizer = false }: { resetsAt: string; organizer?: boolean }) {
  const resetDate = new Intl.DateTimeFormat("en", {
    dateStyle: "medium", timeStyle: "short", timeZone: "UTC",
  }).format(new Date(resetsAt));
  return (
    <aside className="border border-gold-ink/25 bg-band px-4 py-3 text-sm leading-6" aria-label="Trial workspace">
      <p className="font-semibold">You’re trying LunchPick in a shared trial team</p>
      <p className="text-muted">Use sample information. Everyone trying the app can see and change this team’s data. It resets {resetDate} UTC.</p>
      <p className="text-muted">Sample restaurant profiles and driving estimates are fictional.</p>
      {organizer ? (
        <form action={leaveTrial} className="mt-2">
          <button className="font-semibold text-blue underline underline-offset-4" type="submit">Leave trial</button>
        </form>
      ) : null}
    </aside>
  );
}
