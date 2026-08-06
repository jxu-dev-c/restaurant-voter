import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

const navItems = [
  { href: "/admin", label: "Polls" },
  { href: "/admin/centers", label: "Lunch centers" },
  { href: "/admin/winners", label: "Winner history" },
];

type AdminShellProps = {
  children: React.ReactNode;
  email: string;
  signOutAction: () => Promise<void>;
};

export function AdminShell({ children, email, signOutAction }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-surface-soft">
      <SiteHeader
        backHref="/admin"
        backLabel="Admin"
        trailing={
          <form action={signOutAction}>
            <button className="button button-secondary" type="submit">
              Sign out
            </button>
          </form>
        }
      />
      <div className="shell grid gap-6 py-6 lg:grid-cols-[230px_1fr] lg:py-10">
        <aside className="panel h-fit p-3">
          <div className="border-b border-line px-3 pb-4 pt-2">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-subtle">Signed in as</p>
            <p className="mt-1 truncate text-sm font-semibold">{email}</p>
          </div>
          <nav className="mt-2 grid gap-1" aria-label="Admin navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-muted hover:bg-surface-soft hover:text-ink"
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
