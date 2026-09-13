import Image from "next/image";
import Link from "next/link";
import { AdminNav } from "@/components/admin/admin-nav";
import { NewPollIcon, SignOutIcon } from "@/components/ui/icons";
import teamBranding from "@/config/team-branding.json";

type AdminShellProps = {
  children: React.ReactNode;
  email: string;
  signOutAction: () => Promise<void>;
  teamName: string;
  teamSlug: string;
};

type TeamBranding = {
  name: string;
  icon: string;
  iconAlt: string;
};

function TeamIdentity({
  name,
  slug,
  compact = false,
}: {
  name: string;
  slug: string;
  compact?: boolean;
}) {
  const branding = (teamBranding as Record<string, TeamBranding>)[slug];
  const displayName = branding?.name ?? name;

  return (
    <div className="flex min-w-0 items-center gap-3">
      {branding ? (
        <span
          className={`grid shrink-0 place-items-center border border-line bg-surface ${compact ? "size-8 p-1" : "size-11 p-1.5"}`}
        >
          <Image
            alt={branding.iconAlt}
            className="size-full object-contain"
            height={compact ? 24 : 32}
            src={branding.icon}
            width={compact ? 24 : 32}
          />
        </span>
      ) : null}
      <div className="min-w-0">
        <p className="eyebrow">Team workspace</p>
        <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
      </div>
    </div>
  );
}

export function AdminShell({
  children,
  email,
  signOutAction,
  teamName,
  teamSlug,
}: AdminShellProps) {
  return (
    <div className="admin-root min-h-screen">
      <header className="admin-mobile-header">
        <Link href="/admin" className="brand-mark" aria-label="LunchPick admin home">
          <span aria-hidden="true">LP</span>
          <span>LunchPick</span>
        </Link>
        <div className="flex items-center gap-2">
          {/* No icons on this row: brand mark + both buttons already fill 390px,
              and .button is nowrap, so any extra width overflows the viewport. */}
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

      <div className="admin-mobile-team border-b border-line bg-canvas px-4 py-2 lg:hidden">
        <TeamIdentity compact name={teamName} slug={teamSlug} />
      </div>

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
            <NewPollIcon size={16} />
            New poll
          </Link>
          <div className="mt-auto pt-5">
            <TeamIdentity name={teamName} slug={teamSlug} />
            <div className="mt-5 border-t border-line pt-5">
              <p className="eyebrow">Signed in as</p>
              <p className="mt-1 truncate text-sm font-medium text-ink">{email}</p>
              <form action={signOutAction} className="mt-4">
                <button className="button button-secondary w-full" type="submit">
                  <SignOutIcon size={16} />
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </aside>
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
