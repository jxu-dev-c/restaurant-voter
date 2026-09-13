"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { useState, type ComponentType } from "react";

import { LinkProgress } from "@/components/ui/link-pending";
import { CentersIcon, PollsIcon, WinnersIcon, type AppIconProps } from "@/components/ui/icons";

const navItems: ReadonlyArray<{
  href: string;
  label: string;
  segment: string | null;
  Icon: ComponentType<AppIconProps>;
}> = [
  { href: "/admin", label: "Polls", segment: null, Icon: PollsIcon },
  { href: "/admin/centers", label: "Lunch centers", segment: "centers", Icon: CentersIcon },
  { href: "/admin/winners", label: "Winner history", segment: "winners", Icon: WinnersIcon },
];

export function AdminNav({ compact = false }: { compact?: boolean }) {
  const activeSegment = useSelectedLayoutSegment();
  // These routes are all server-rendered, so `activeSegment` only moves once the
  // response lands. Highlighting the clicked row up front means the selection
  // answers the click instead of the round trip. The segment the click started
  // from is kept alongside it, so the guess is dropped during the render where
  // the real navigation commits rather than one effect later.
  const [pendingNav, setPendingNav] = useState<{ href: string; from: string | null } | null>(null);
  if (pendingNav && pendingNav.from !== activeSegment) {
    setPendingNav(null);
  }
  const optimisticHref = pendingNav && pendingNav.from === activeSegment ? pendingNav.href : null;

  return (
    <nav
      className={compact ? "flex min-w-max gap-1" : "grid gap-1"}
      aria-label="Admin navigation"
    >
      {navItems.map((item) => {
        const isCurrent = item.segment === null
          ? activeSegment === null || activeSegment === "polls"
          : activeSegment === item.segment;
        const isActive = optimisticHref ? optimisticHref === item.href : isCurrent;

        return (
          <Link
            aria-current={isCurrent ? "page" : undefined}
            className={`admin-nav-link ${isActive ? "admin-nav-link-active" : ""}`}
            href={item.href}
            key={item.href}
            onClick={() => setPendingNav(isCurrent ? null : { href: item.href, from: activeSegment })}
          >
            <item.Icon className="admin-nav-icon" size={18} />
            {item.label}
            <LinkProgress />
          </Link>
        );
      })}
    </nav>
  );
}
