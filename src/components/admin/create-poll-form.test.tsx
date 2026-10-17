import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CreatePollForm, OPTIMAL_NOMINATION_LIMIT, OPTIMAL_VOTE_LIMIT } from "./create-poll-form";

describe("CreatePollForm", () => {
  it("prefills the optimal voting preset and says so", () => {
    render(<CreatePollForm action={vi.fn()} centers={[]} />);

    expect(screen.getByLabelText("Choices per voter")).toHaveValue(OPTIMAL_VOTE_LIMIT);
    expect(screen.getByLabelText("Nominations per voter")).toHaveValue(OPTIMAL_NOMINATION_LIMIT);
    expect(OPTIMAL_VOTE_LIMIT).toBe(2);
    expect(OPTIMAL_NOMINATION_LIMIT).toBe(3);
    expect(
      screen.getByText("These defaults are already the optimal setting for your team size."),
    ).toBeInTheDocument();
  });
});
