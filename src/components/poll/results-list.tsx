import type { CandidateView } from "@/lib/domain/types";
import { GooglePlaceName } from "@/components/google";
import { TrophyIcon } from "@/components/ui/icons";

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
        const width = topCount === 0 ? "0%" : `${Math.max(5, (count / topCount) * 100)}%`;

        // One celebratory accent surface makes the official decision unmistakable.
        if (isWinner) {
          return (
            <li
              key={candidate.id}
              className="result-winner"
            >
              <span className="flag flag-corner">Winner</span>
              <p className="eyebrow flex items-center gap-2">
                <TrophyIcon size={15} />
                The team&apos;s pick
              </p>
              <div className="mt-3 flex items-end justify-between gap-4">
                <h3 className="title-content min-w-0">
                  <GooglePlaceName
                    className="underline decoration-transparent underline-offset-4 hover:decoration-current"
                    fallbackLabel={candidate.fallbackLabel}
                    placeId={candidate.placeId}
                  />
                </h3>
                <div className="shrink-0 text-right">
                  <strong className="display-number text-5xl tabular-nums">{count}</strong>
                  <span className="mt-1 block text-xs">{count === 1 ? "vote" : "votes"}</span>
                </div>
              </div>
              <div className="result-bar result-bar-gold mt-4">
                <span style={{ width }} />
              </div>
            </li>
          );
        }

        return (
          <li key={candidate.id} className="panel p-4">
            <div className="flex items-center gap-4">
              <span className="display-number grid h-9 w-9 shrink-0 place-items-center rounded-xs bg-band text-sm text-muted">
                {displayRank}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="card-title">
                    <GooglePlaceName
                      className="underline decoration-transparent underline-offset-4 hover:decoration-current"
                      fallbackLabel={candidate.fallbackLabel}
                      placeId={candidate.placeId}
                    />
                  </h3>
                  {isTopTie ? <span className="flag">Tied leader</span> : null}
                </div>
                <div className="result-bar mt-3">
                  <span style={{ width }} />
                </div>
              </div>
              <strong className="display-number shrink-0 text-2xl tabular-nums">
                {count}
              </strong>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
