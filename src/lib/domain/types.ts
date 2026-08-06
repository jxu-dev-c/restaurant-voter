export const pollStatuses = ["draft", "nominations", "voting", "closed"] as const;
export type PollStatus = (typeof pollStatuses)[number];

export const outcomeStatuses = ["pending", "no_votes", "unique_winner", "tie", "resolved_tie"] as const;
export type OutcomeStatus = (typeof outcomeStatuses)[number];

export type LunchCenter = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
};

export type CandidateView = {
  id: string;
  restaurantId: string;
  placeId: string;
  fallbackLabel: string;
  source: "admin" | "voter";
  status: "active" | "removed";
  previousWinnerAt: string | null;
  canRemoveNomination: boolean;
  voteCount?: number;
  resultRank?: number;
};

export type InteractiveCandidateView = Pick<
  CandidateView,
  "id" | "placeId" | "fallbackLabel" | "previousWinnerAt" | "canRemoveNomination"
>;

export type CurrentVoter = {
  id: string;
  displayName: string;
  voterCode: string;
};

export type BallotView = {
  revision: number;
  candidateIds: string[];
  submittedAt: string | null;
};

export type PublicPollView = {
  id: string;
  publicId: string;
  title: string;
  status: PollStatus;
  outcomeStatus: OutcomeStatus;
  allowsVoterNominations: boolean;
  nominationLimit: number;
  maxChoices: number;
  center: {
    label: string;
    latitude: number;
    longitude: number;
  };
  candidates: CandidateView[];
  currentVoter: CurrentVoter | null;
  ballot: BallotView | null;
  winnerCandidateId: string | null;
  closedAt: string | null;
};

export type AdminPollSummary = {
  id: string;
  publicId: string;
  title: string;
  status: PollStatus;
  outcomeStatus: OutcomeStatus;
  activeCandidateCount: number;
  submittedBallotCount: number;
  maxChoices: number;
  centerLabel: string;
  createdAt: string;
  closedAt: string | null;
};

export type AdminVoterView = {
  id: string;
  displayName: string;
  voterCode: string;
  submittedAt: string | null;
  candidateIds?: string[];
};

export type AdminPollDetail = PublicPollView & {
  accessVersion: number;
  voters: AdminVoterView[];
  createdAt: string;
};

export type WinnerHistoryView = {
  id: string;
  restaurantId: string;
  placeId: string;
  fallbackLabel: string;
  source: "automatic" | "tie_break" | "manual";
  sourcePollId: string | null;
  wonOn: string;
  notes: string | null;
};

export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  conflict?: boolean;
};

export const initialActionState: ActionState = { ok: false };
