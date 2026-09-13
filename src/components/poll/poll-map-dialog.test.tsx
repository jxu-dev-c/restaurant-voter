import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { PollMapDialog } from "./poll-map-dialog";

vi.mock("@/components/google", () => ({
  RestaurantMap: () => <div>Rendered restaurant map</div>,
}));

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

describe("PollMapDialog", () => {
  it("renders the map only while the dialog is open", async () => {
    const user = userEvent.setup();

    render(
      <PollMapDialog
        center={{ lat: 44.65, lng: -63.57 }}
        centerLabel="CB Office"
        candidates={[]}
      />,
    );

    expect(screen.queryByText("Rendered restaurant map")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "View restaurant map" }));

    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.getByText("Rendered restaurant map")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close restaurant map" }));

    expect(screen.queryByText("Rendered restaurant map")).not.toBeInTheDocument();
  });
});
