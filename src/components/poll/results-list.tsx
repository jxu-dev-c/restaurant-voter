import type { CandidateView } from "@/lib/domain/types";
import { GooglePlaceName } from "@/components/google";

type ResultsListProps = {
  candidates: CandidateView[];
  winnerCandidateId: string | null;
};

export function ResultsList({ candidates, winnerCandidateId }: ResultsListProps) {
  const sorted = candidates
    .filter((candidate) => candidate.status === "active")
    .toSorted((a, b) => (b.voteCount ?? 0) - (a.voteCount ?? 0));
  const topCount = sorted[0]?.voteCount ?? 0;

  return (
    <ol className="grid gap-3">
      {sorted.map((candidate) => {
        const count = candidate.voteCount ?? 0;
        const displayRank =
          candidate.resultRank ??
          sorted.findIndex((item) => (item.voteCount ?? 0) === count) + 1;
        const isWinner = candidate.id === winnerCandidateId;
        const isTopTie = !winnerCandidateId && topCount > 0 && count === topCount;
        return (
          <li key={candidate.id} className={`panel p-5 ${isWinner ? "border-leaf bg-[#f1f8f3]" : ""}`}>
            <div className="flex items-center gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-soft text-sm font-black text-muted">
                {displayRank}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold">
                    <GooglePlaceName
                      className="underline decoration-transparent underline-offset-4 hover:decoration-current"
                      fallbackLabel={candidate.fallbackLabel}
                      placeId={candidate.placeId}
                    />
                  </h3>
                  {isWinner ? <span className="status-pill text-leaf">Winner</span> : null}
                  {isTopTie ? <span className="status-pill text-warning">Tied leader</span> : null}
                </div>
                <div className="result-bar mt-3">
                  <span style={{ width: topCount === 0 ? "0%" : `${Math.max(5, (count / topCount) * 100)}%` }} />
                </div>
              </div>
              <strong className="text-2xl tabular-nums">{count}</strong>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
