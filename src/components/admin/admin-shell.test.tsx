import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AdminShell } from "./admin-shell";

vi.mock("next/navigation", () => ({
  useSelectedLayoutSegment: () => null,
}));

const signOutAction = vi.fn(async () => undefined);

describe("AdminShell team identity", () => {
  it("shows the mapped NRG name and official icon in desktop and mobile chrome", () => {
    render(
      <AdminShell
        email="organizer@example.com"
        signOutAction={signOutAction}
        teamName="NRG Energy"
        teamSlug="nrg"
      >
        <p>Workspace content</p>
      </AdminShell>,
    );

    expect(screen.getAllByText("NRG")).toHaveLength(2);
    expect(screen.getAllByAltText("NRG logo")).toHaveLength(2);
  });

  it("shows the mapped JCB name and official icon in desktop and mobile chrome", () => {
    render(
      <AdminShell
        email="organizer@example.com"
        signOutAction={signOutAction}
        teamName="J.C. Bamford Excavators"
        teamSlug="jcb"
      >
        <p>Workspace content</p>
      </AdminShell>,
    );

    expect(screen.getAllByText("JCB")).toHaveLength(2);
    expect(screen.getAllByAltText("JCB logo")).toHaveLength(2);
  });

  it("falls back to the database team name when no icon is configured", () => {
    render(
      <AdminShell
        email="organizer@example.com"
        signOutAction={signOutAction}
        teamName="Field Operations"
        teamSlug="field-operations"
      >
        <p>Workspace content</p>
      </AdminShell>,
    );

    expect(screen.getAllByText("Field Operations")).toHaveLength(2);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
