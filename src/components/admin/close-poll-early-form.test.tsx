import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ClosePollEarlyForm } from "./close-poll-early-form";

describe("ClosePollEarlyForm", () => {
  it("offers a confirmed early close for the poll", () => {
    const { container } = render(<ClosePollEarlyForm action={vi.fn()} pollId="poll-id" />);

    expect(screen.getByRole("heading", { name: "Close early" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close poll early" })).toBeEnabled();
    expect(container.querySelector("input[name=pollId]")).toHaveValue("poll-id");
  });
});
