import type { Metadata } from "next";
import { signOutAdmin } from "@/app/auth/actions";
import { AdminShell } from "@/components/admin/admin-shell";
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
      email={organizer.email}
      signOutAction={signOutAdmin}
      teamName={organizer.teamName}
      teamSlug={organizer.teamSlug}
    >
      {children}
    </AdminShell>
  );
}
