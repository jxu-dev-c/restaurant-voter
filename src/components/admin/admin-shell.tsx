import Link from "next/link";
import { AdminNav } from "@/components/admin/admin-nav";

type AdminShellProps = {
  children: React.ReactNode;
  email: string;
  signOutAction: () => Promise<void>;
};

export function AdminShell({ children, email, signOutAction }: AdminShellProps) {
  return (
    <div className="admin-root min-h-screen">
      <header className="admin-mobile-header">
        <Link href="/admin" className="brand-mark" aria-label="LunchPick admin home">
          <span aria-hidden="true">LP</span>
          <span>LunchPick</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link className="button button-primary button-compact" href="/admin/polls/new">
            New poll
          </Link>
          <form action={signOutAction}>
            <button className="button button-secondary button-compact" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="admin-mobile-nav overflow-x-auto">
        <AdminNav compact />
      </div>

      <div className="admin-shell">
        <aside className="admin-sidebar">
          <Link href="/admin" className="brand-mark" aria-label="LunchPick admin home">
            <span aria-hidden="true">LP</span>
            <span>LunchPick</span>
          </Link>
          <div className="mt-8">
            <AdminNav />
          </div>
          <Link className="button button-primary mt-5 w-full" href="/admin/polls/new">
            New poll
          </Link>
          <div className="mt-auto border-t border-line pt-5">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-subtle">Signed in as</p>
            <p className="mt-1 truncate text-sm font-semibold">{email}</p>
            <form action={signOutAction} className="mt-4">
              <button className="button button-secondary w-full" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </aside>
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
