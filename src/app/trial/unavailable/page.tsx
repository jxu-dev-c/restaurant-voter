import Link from "next/link";
import { Notice } from "@/components/ui/notice";

export default function TrialUnavailablePage() {
  return (
    <main className="shell py-16">
      <Notice title="The trial is temporarily unavailable" tone="warning">
        Please try again in a moment.
      </Notice>
      <Link className="button button-secondary mt-6" href="/#try-it">Back to the trial</Link>
    </main>
  );
}
