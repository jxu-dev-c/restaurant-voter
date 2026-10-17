import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WinnerVisibilityForm } from "./winner-visibility-form";

describe("WinnerVisibilityForm", () => {
  it("submits a request to hide a visible winner", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (formData: FormData) => {
      void formData;
    });
    render(<WinnerVisibilityForm action={action} hidden={false} label="Sushi Infinity" winnerId="winner-id" />);

    await user.click(screen.getByRole("button", { name: "Hide Sushi Infinity from winner history" }));

    expect(action).toHaveBeenCalledOnce();
    const formData = action.mock.calls[0][0];
    expect(formData.get("winnerId")).toBe("winner-id");
    expect(formData.get("hidden")).toBe("true");
  });

  it("submits a request to show a hidden winner again", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (formData: FormData) => {
      void formData;
    });
    render(<WinnerVisibilityForm action={action} hidden label="Sushi Infinity" winnerId="winner-id" />);

    await user.click(screen.getByRole("button", { name: "Show Sushi Infinity in winner history" }));

    expect(action.mock.calls[0][0].get("hidden")).toBe("false");
  });
});
