import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { CandidateView } from "@/lib/domain/types";

import { CandidateRoster } from "./candidate-roster";

vi.mock("@/components/google/google-place-details-card", () => ({
  GooglePlaceDetailsCard: ({ fallbackLabel }: { fallbackLabel: string }) => <div>{fallbackLabel}</div>,
}));

const candidates: CandidateView[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    restaurantId: "22222222-2222-4222-8222-222222222222",
    placeId: "place-one",
    fallbackLabel: "Admin Restaurant",
    source: "admin",
    status: "active",
    previousWinnerAt: null,
    canRemoveNomination: false,
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    restaurantId: "44444444-4444-4444-8444-444444444444",
    placeId: "place-two",
    fallbackLabel: "Voter Restaurant",
    source: "voter",
    status: "removed",
    previousWinnerAt: null,
    canRemoveNomination: false,
  },
];

describe("CandidateRoster", () => {
  it("filters removed restaurants and exposes restore actions only while editable", async () => {
    const user = userEvent.setup();
    const toggleAction = vi.fn(async () => undefined);
    render(<CandidateRoster candidates={candidates} canEdit pollId="poll-id" toggleAction={toggleAction} />);

    expect(screen.getByText("Admin Restaurant")).toBeInTheDocument();
    expect(screen.queryByText("Voter Restaurant")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Removed" }));

    expect(screen.getByText("Voter Restaurant")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restore" })).toBeInTheDocument();
  });
});
