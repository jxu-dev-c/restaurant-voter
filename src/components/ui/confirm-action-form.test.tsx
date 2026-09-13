import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { ConfirmActionForm } from "./confirm-action-form";

const originalShowModal = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  "showModal",
);
const originalClose = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  "close",
);

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value() {
      this.open = true;
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value() {
      this.open = false;
      this.dispatchEvent(new Event("close"));
    },
  });
});

afterAll(() => {
  if (originalShowModal) {
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", originalShowModal);
  } else {
    Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  }
  if (originalClose) {
    Object.defineProperty(HTMLDialogElement.prototype, "close", originalClose);
  } else {
    Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
  }
});

describe("ConfirmActionForm", () => {
  it("requires modal confirmation before submitting a destructive action", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => undefined);

    render(
      <ConfirmActionForm
        action={action}
        confirmLabel="Delete voter"
        confirmMessage="This permanently removes the voter and ballot."
        confirmTitle="Delete Alex?"
        tone="danger"
      >
        <input type="hidden" name="voterId" value="voter-id" />
        <button type="submit">Delete voter</button>
      </ConfirmActionForm>,
    );

    await user.click(screen.getByRole("button", { name: "Delete voter" }));

    const dialog = screen.getByRole("dialog", { name: "Delete Alex?" });
    expect(dialog).toBeVisible();
    expect(action).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(dialog).not.toHaveAttribute("open");
    expect(action).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Delete voter" }));
    await user.click(within(dialog).getByRole("button", { name: "Delete voter" }));

    await waitFor(() => expect(action).toHaveBeenCalledOnce());
  });
});
