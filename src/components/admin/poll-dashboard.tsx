"use client";

import { useState } from "react";

import { PollCard } from "@/components/admin/poll-card";
import type { AdminPollSummary, PollStatus } from "@/lib/domain/types";

type DashboardFilter = "active" | PollStatus | "all";

const filters: Array<{ label: string; value: DashboardFilter }> = [
  { label: "Active", value: "active" },
  { label: "Draft", value: "draft" },
  { label: "Nominations", value: "nominations" },
  { label: "Voting", value: "voting" },
  { label: "Closed", value: "closed" },
  { label: "All", value: "all" },
];

function matchesFilter(poll: AdminPollSummary, filter: DashboardFilter) {
  if (filter === "all") return true;
  if (filter === "active") return poll.status !== "closed";
  return poll.status === filter;
}

export function PollDashboard({ polls }: { polls: AdminPollSummary[] }) {
  const [filter, setFilter] = useState<DashboardFilter>("active");
  const visiblePolls = polls.filter((poll) => matchesFilter(poll, filter));
  const counts = {
    active: polls.filter((poll) => poll.status !== "closed").length,
    draft: polls.filter((poll) => poll.status === "draft").length,
    nominations: polls.filter((poll) => poll.status === "nominations").length,
    voting: polls.filter((poll) => poll.status === "voting").length,
  };

  return (
    <div className="mt-8 space-y-5">
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Active polls", counts.active],
          ["Preparing", counts.draft],
          ["Nominating", counts.nominations],
          ["Voting now", counts.voting],
        ].map(([label, value]) => (
          <div className="admin-stat" key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <section className="admin-section overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold">Polls</h2>
            <p className="mt-1 text-sm text-muted">Focus on live work, or review the full history.</p>
          </div>
          <div className="admin-filter-group overflow-x-auto" aria-label="Filter polls">
            {filters.map((item) => (
              <button
                aria-pressed={filter === item.value}
                className="admin-filter-button"
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-line">
          {visiblePolls.length ? visiblePolls.map((poll) => (
            <PollCard poll={poll} key={poll.id} />
          )) : (
            <div className="px-6 py-12 text-center">
              <h3 className="font-bold">No polls in this view</h3>
              <p className="mt-1 text-sm text-muted">Choose another lifecycle filter to see more polls.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
