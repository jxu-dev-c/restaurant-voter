import { render, screen } from "@testing-library/react";
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
});
