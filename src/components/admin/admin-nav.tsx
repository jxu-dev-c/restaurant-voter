"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import type { ComponentType } from "react";

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

  return (
    <nav
      className={compact ? "flex min-w-max gap-1" : "grid gap-1"}
      aria-label="Admin navigation"
    >
      {navItems.map((item) => {
        const isActive = item.segment === null
          ? activeSegment === null || activeSegment === "polls"
          : activeSegment === item.segment;

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`admin-nav-link ${isActive ? "admin-nav-link-active" : ""}`}
            href={item.href}
            key={item.href}
          >
            <item.Icon className="admin-nav-icon" size={18} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
