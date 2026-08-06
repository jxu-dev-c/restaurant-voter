import type { Metadata } from "next";
import { signOutAdmin } from "@/app/auth/actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth/admin";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return <AdminShell email={user.email ?? "Administrator"} signOutAction={signOutAdmin}>{children}</AdminShell>;
}
