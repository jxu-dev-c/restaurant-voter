import type { Metadata } from "next";
import { signOutAdmin } from "@/app/auth/actions";
import { leaveTrial } from "@/app/trial/actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { TrialNotice } from "@/components/trial-notice";
import { requireOrganizerPage } from "@/lib/data/ownership";

export const metadata: Metadata = {
  title: "Organizer",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const organizer = await requireOrganizerPage({ returnTo: "/admin" });
  return (
    <AdminShell
      email={organizer.trialResetsAt ? "Trial organizer" : organizer.email}
      signOutAction={organizer.trialResetsAt ? leaveTrial : signOutAdmin}
      teamName={organizer.teamName}
      teamSlug={organizer.teamSlug}
    >
      {organizer.trialResetsAt ? <div className="mb-6"><TrialNotice organizer resetsAt={organizer.trialResetsAt} /></div> : null}
      {children}
    </AdminShell>
  );
}
