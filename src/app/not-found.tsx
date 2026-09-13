import Link from "next/link";
import { NotFoundIcon } from "@/components/ui/icons";

export default function NotFound() {
  return (
    <main className="shell grid min-h-[70vh] place-items-center py-16">
      <div className="panel grid max-w-lg justify-items-center p-8 text-center">
        <span className="state-icon">
          <NotFoundIcon size={22} weight="light" />
        </span>
        <p className="eyebrow mt-5">Not found</p>
        <h1 className="mt-4 admin-page-title">That lunch poll is off the menu.</h1>
        <p className="mt-3 leading-7 text-muted">The link may be incomplete, expired, rotated, or archived.</p>
        <Link className="button button-primary mt-7" href="/">Back home</Link>
      </div>
    </main>
  );
}
