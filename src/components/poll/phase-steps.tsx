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
        return (
          <li key={step.status} className="min-w-0">
            <div className={`h-1.5 rounded-full ${complete ? "bg-accent" : "bg-line"}`} />
            <span className={`mt-2 block truncate text-xs font-bold ${complete ? "text-ink" : "text-subtle"}`}>
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
