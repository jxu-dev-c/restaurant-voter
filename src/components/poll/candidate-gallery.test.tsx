import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { CandidateGallery } from "./candidate-gallery";

vi.mock("@/components/google", () => ({
  GooglePlaceDetailsCard: ({ fallbackLabel }: { fallbackLabel: string }) => (
    <div>{fallbackLabel}</div>
  ),
}));

vi.mock("./use-route-metrics", () => ({
  useRouteMetrics: () => ({ metrics: new Map(), error: null }),
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

describe("CandidateGallery", () => {
  it("confirms removal only for nominations owned by the current voter", async () => {
    const user = userEvent.setup();
    const removeAction = vi.fn(async (formData: FormData) => {
      void formData;
    });

    render(
      <CandidateGallery
        publicId="public-id"
        candidates={[
          {
            id: "11111111-1111-4111-8111-111111111111",
            placeId: "owned-place-id",
            fallbackLabel: "Owned Restaurant",
            previousWinnerAt: null,
            canRemoveNomination: true,
          },
          {
            id: "22222222-2222-4222-8222-222222222222",
            placeId: "other-place-id",
            fallbackLabel: "Other Restaurant",
            previousWinnerAt: null,
            canRemoveNomination: false,
          },
        ]}
        removeAction={removeAction}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Remove nomination for Other Restaurant" }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Remove nomination for Owned Restaurant" }),
    );

    const dialog = screen.getByRole("dialog", { name: "Remove nomination?" });
    expect(dialog).toBeVisible();
    expect(removeAction).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Remove nomination" }));

    await waitFor(() => expect(removeAction).toHaveBeenCalledOnce());
    const submittedForm = removeAction.mock.calls[0][0];
    expect(submittedForm.get("candidateId")).toBe("11111111-1111-4111-8111-111111111111");
  });
});
