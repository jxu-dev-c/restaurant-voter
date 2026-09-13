import type { PollStatus } from "@/lib/domain/types";

const steps: Array<{ status: PollStatus; label: string }> = [
  { status: "draft", label: "Set up" },
  { status: "nominations", label: "Nominate" },
  { status: "voting", label: "Vote" },
  { status: "closed", label: "Results" },
];

export function PhaseSteps({ status }: { status: PollStatus }) {
  const activeIndex = steps.findIndex((step) => step.status === status);

  return (
    <ol className="grid grid-cols-4 gap-1" aria-label={`Poll phase: ${status}`}>
      {steps.map((step, index) => {
        const complete = index <= activeIndex;
        const current = index === activeIndex;
        return (
          <li
            key={step.status}
            className="min-w-0"
            aria-current={current ? "step" : undefined}
          >
            <div className={`h-1.5 rounded-pill ${complete ? "bg-blue" : "bg-line"}`} />
            <span
              className={`mt-2 block truncate font-label text-xs font-semibold uppercase tracking-wide ${
                current ? "text-ink" : complete ? "text-blue" : "text-muted"
              }`}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
