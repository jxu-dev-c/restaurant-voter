"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Polls", segment: null },
  { href: "/admin/centers", label: "Lunch centers", segment: "centers" },
  { href: "/admin/winners", label: "Winner history", segment: "winners" },
] as const;

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
            <span className="admin-nav-dot" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
