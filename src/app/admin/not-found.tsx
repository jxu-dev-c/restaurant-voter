import Link from "next/link";
import { NotFoundIcon } from "@/components/ui/icons";

export default function OrganizerNotFound() {
  return (
    <section className="admin-section grid justify-items-center p-8 text-center">
      <span className="state-icon">
        <NotFoundIcon size={22} weight="light" />
      </span>
      <p className="eyebrow mt-5">Not found</p>
      <h1 className="mt-4 admin-page-title">That lunch poll is off the menu.</h1>
      <p className="mt-3 text-muted">This poll is unavailable in your workspace.</p>
      <Link className="button button-primary mt-7" href="/admin">Back to your polls</Link>
    </section>
  );
}
