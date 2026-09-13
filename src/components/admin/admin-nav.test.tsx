import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AdminNav } from "./admin-nav";

vi.mock("next/navigation", () => ({
  useSelectedLayoutSegment: () => "centers",
}));

describe("AdminNav", () => {
  it("marks the current admin section", () => {
    render(<AdminNav />);

    expect(screen.getByRole("link", { name: "Lunch centers" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Polls" })).not.toHaveAttribute("aria-current");
  });

  it("highlights a clicked section before the server responds", async () => {
    const user = userEvent.setup();
    // There is no app router in jsdom, so let the anchor's default action be
    // cancelled before Link sees it rather than letting jsdom try to navigate.
    render(
      <div onClickCapture={(event) => event.preventDefault()}>
        <AdminNav />
      </div>,
    );

    const polls = screen.getByRole("link", { name: "Polls" });
    const centers = screen.getByRole("link", { name: "Lunch centers" });

    await user.click(polls);

    expect(polls.className).toContain("admin-nav-link-active");
    expect(centers.className).not.toContain("admin-nav-link-active");
    // The guess only moves the highlight; the announced current page still
    // tracks the route, which has not changed yet.
    expect(centers).toHaveAttribute("aria-current", "page");
    expect(polls).not.toHaveAttribute("aria-current");
  });
});
