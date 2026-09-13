# LunchPick application visual review

Reviewed September 12, 2026. Scope: organizer workspace, nominations, voting, and results.

## Design assessment

The previous screenshots borrow the cream and blue palette, but much of the character of [LocalFinds](https://localfinds.webflow.io/) comes from its composition: readable fine rules, distinctive image silhouettes, restrained typography, and food photography. Color matching alone leaves LunchPick looking like a collection of pale administrative panels.

The supplied Oink crop shows a second useful detail alongside the requested hairlines: the image pinches inward at the center of its top and bottom edges. That silhouette provides a recognizable motif without adding more icons or shadows.

| Finding in the supplied screenshots | Implemented refinement |
| --- | --- |
| Dividers disappear against the warm surfaces. | Two clearer 1px line tones: `#cec5b9` for everyday separation and `#918679` for mastheads and controls. |
| Public poll titles sit in another white box. | An open cream canvas with a ruled masthead, larger poll title, compact introduction, and phase-specific status color. |
| Restaurant cards repeat generic rectangular placeholders. | A reusable curved SVG mask for public restaurant media, with restrained oat, sage, and blue fallback treatments and a plate-like outline around the existing restaurant icon. |
| Nomination cards become too narrow beside the form. | A two-column desktop shortlist with clear rules separating image, name, and driving information. |
| Checkboxes are small and the selected state depends heavily on color. | Larger checkmarks, explicit “Select” / “Selected” labels, the existing blue selected surface, and visible keyboard focus. |
| Dashboard totals are four equally weighted beige blocks. | A connected statistics strip, with blue reserved for the active total and rules separating the supporting counts. |
| Results spread attention across a success alert, gold panel, and bright flag. | One blue winner panel with oversized restaurant name, an explicit vote label, a restrained circular motif, and the existing bright winner accent. Removed the redundant success alert. |
| Large empty spacing separates the ballot from its save control. | A tighter sticky action bar with mobile safe-area spacing. Confirmed that the final card can scroll fully above it. |

The existing Federo display and Space Grotesk label fonts are preserved. This pass adjusts size, tracking, hierarchy, and wrapping. Placeholder colors are decorative and do not imply cuisine, quality, or availability.

## Before and after

| Screen | Supplied screenshot | Updated screenshot |
| --- | --- | --- |
| Organizer dashboard | [Before](../ux-review-screenshots-icons/08-admin-dashboard-desktop.png) | [After](../ux-review-screenshots-refinement/08-admin-dashboard-desktop.png) |
| Nominations | [Before](../ux-review-screenshots-icons/20-public-nominations-participant-desktop.png) | [After](../ux-review-screenshots-refinement/20-public-nominations-participant-desktop.png) |
| Voting | [Before](../ux-review-screenshots-icons/22-public-voting-participant-desktop.png) | [After](../ux-review-screenshots-refinement/22-public-voting-participant-desktop.png) |
| Winner | [Before](../ux-review-screenshots-icons/23-public-results-winner-desktop.png) | [After](../ux-review-screenshots-refinement/23-public-results-winner-desktop.png) |
| Mobile winner | [Before](../ux-review-screenshots-icons/23-public-results-winner-mobile.png) | [After](../ux-review-screenshots-refinement/23-public-results-winner-mobile.png) |

Additional desktop and mobile captures are in `ux-review-screenshots-refinement`. These screenshot folders are excluded from Git by the project's existing rules.

## Verification

- Reviewed the supplied desktop and mobile screenshot collection and the live reference site.
- Captured 16 application screens at 1440px and 390px: dashboard, centers, winner history, creation form, poll phases, unavailable poll, nominations, voting, winner, tie, and no-vote results. No page overflow was found at those sizes.
- Checked voting at 320px and 768px. Fixed the organizer header so its actions wrap cleanly at 320px.
- Checked mouse selection, keyboard Space selection, a visible 2px focus outline, and disabling the remaining choice after reaching the three-choice limit. No ballot was submitted.
- At the bottom of the mobile ballot, the last card ends at 694px and the save bar begins at 718px, leaving the card fully visible.
- Application source/configuration lint, TypeScript, all 91 existing tests across 28 files, and the production build pass.
- Rechecked dashboard, voting, and winner pages on the production server at both desktop and mobile widths. The compiled styles retain the intended line colors and layout, with no horizontal overflow.

The root `pnpm lint` command also traverses generated output in an unrelated, untracked `.claude/worktrees` checkout and fails there. The application files were linted directly; no unrelated worktree files were changed.

## Remaining visual limitation

The local fixtures have no configured Google Maps browser key, so restaurant details, photos, and driving estimates fall back to their unavailable states. The shared media mask applies to loaded photos as well, but live Google photo rendering and photo-to-fallback mixtures have not been visually verified. Authentic restaurant imagery is still the largest remaining difference from the reference. The app does not substitute invented photos for real restaurants.

No homepage layout, copy, or assets were changed. Shared typography and line tokens also affect components wherever they are reused. No database reset, deployment, or commit was performed.
