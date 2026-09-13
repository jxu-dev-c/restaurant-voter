/**
 * The app's icon vocabulary — one semantic name per idea, resolved here to a
 * Phosphor glyph. Call sites import `RestaurantIcon`, never `ForkKnife`, so a
 * glyph can be swapped in one line without touching a dozen components.
 *
 * Phosphor is the fit for the LocalFinds language: its `light` weight is a
 * ~1px hairline at 16px, matching the 1px rules, and `regular` holds its own
 * beside the 600-weight label caps at ~0.72rem label sizes where a 2px set
 * (Lucide, Tabler) would look bolder than the type beside it.
 *
 * Imports are per-icon and from `/dist/ssr`:
 *   - deep paths, because the barrel pulls ~9k modules and Next does not
 *     optimize `@phosphor-icons/react` by default (see Next's
 *     `01-app/02-guides/local-development.md`, "Icon libraries");
 *   - the SSR build, because the CSR build is a Client Component — it reads
 *     `IconContext`. The SSR build is a plain forwardRef'd <svg>, so it renders
 *     in Server Components and Client Components alike.
 */
import type { ComponentType, ReactElement } from "react";
import type { Icon, IconProps } from "@phosphor-icons/react/dist/lib/types";

import { ArrowRightIcon as PhArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { ArrowUpRightIcon as PhArrowUpRight } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import { ArrowsClockwiseIcon as PhArrowsClockwise } from "@phosphor-icons/react/dist/ssr/ArrowsClockwise";
import { CalendarBlankIcon as PhCalendarBlank } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { CarSimpleIcon as PhCarSimple } from "@phosphor-icons/react/dist/ssr/CarSimple";
import { CaretRightIcon as PhCaretRight } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { CheckIcon as PhCheck } from "@phosphor-icons/react/dist/ssr/Check";
import { CheckCircleIcon as PhCheckCircle } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { CheckSquareIcon as PhCheckSquare } from "@phosphor-icons/react/dist/ssr/CheckSquare";
import { ClockIcon as PhClock } from "@phosphor-icons/react/dist/ssr/Clock";
import { CopyIcon as PhCopy } from "@phosphor-icons/react/dist/ssr/Copy";
import { EnvelopeSimpleIcon as PhEnvelopeSimple } from "@phosphor-icons/react/dist/ssr/EnvelopeSimple";
import { ForkKnifeIcon as PhForkKnife } from "@phosphor-icons/react/dist/ssr/ForkKnife";
import { HandPointingIcon as PhHandPointing } from "@phosphor-icons/react/dist/ssr/HandPointing";
import { InfoIcon as PhInfo } from "@phosphor-icons/react/dist/ssr/Info";
import { LinkBreakIcon as PhLinkBreak } from "@phosphor-icons/react/dist/ssr/LinkBreak";
import { LinkSimpleIcon as PhLinkSimple } from "@phosphor-icons/react/dist/ssr/LinkSimple";
import { ListChecksIcon as PhListChecks } from "@phosphor-icons/react/dist/ssr/ListChecks";
import { MagnifyingGlassIcon as PhMagnifyingGlass } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { MapPinIcon as PhMapPin } from "@phosphor-icons/react/dist/ssr/MapPin";
import { MapPinAreaIcon as PhMapPinArea } from "@phosphor-icons/react/dist/ssr/MapPinArea";
import { MapTrifoldIcon as PhMapTrifold } from "@phosphor-icons/react/dist/ssr/MapTrifold";
import { PencilSimpleLineIcon as PhPencilSimpleLine } from "@phosphor-icons/react/dist/ssr/PencilSimpleLine";
import { PlusIcon as PhPlus } from "@phosphor-icons/react/dist/ssr/Plus";
import { SignOutIcon as PhSignOut } from "@phosphor-icons/react/dist/ssr/SignOut";
import { StarIcon as PhStar } from "@phosphor-icons/react/dist/ssr/Star";
import { StorefrontIcon as PhStorefront } from "@phosphor-icons/react/dist/ssr/Storefront";
import { TicketIcon as PhTicket } from "@phosphor-icons/react/dist/ssr/Ticket";
import { TrophyIcon as PhTrophy } from "@phosphor-icons/react/dist/ssr/Trophy";
import { UsersIcon as PhUsers } from "@phosphor-icons/react/dist/ssr/Users";
import { WarningIcon as PhWarning } from "@phosphor-icons/react/dist/ssr/Warning";
import { XIcon as PhX } from "@phosphor-icons/react/dist/ssr/X";
import { XCircleIcon as PhXCircle } from "@phosphor-icons/react/dist/ssr/XCircle";

export type AppIconProps = IconProps;

/**
 * Icons here sit next to their own label, so they are decorative by default and
 * must not add a second announcement. Pass `aria-hidden={false}` with an `alt`
 * on the rare icon that carries meaning on its own.
 */
function decorative(
  Source: Icon,
  displayName: string,
  defaults: Partial<IconProps> = {},
): ComponentType<AppIconProps> {
  function AppIcon(props: AppIconProps): ReactElement {
    return <Source aria-hidden="true" weight="regular" {...defaults} {...props} />;
  }
  AppIcon.displayName = displayName;
  return AppIcon;
}

/* Chrome and navigation ---------------------------------------------------- */

export const PollsIcon = decorative(PhListChecks, "PollsIcon");
export const CentersIcon = decorative(PhMapPinArea, "CentersIcon");
export const WinnersIcon = decorative(PhTrophy, "WinnersIcon");
export const SignOutIcon = decorative(PhSignOut, "SignOutIcon");
export const NewPollIcon = decorative(PhPlus, "NewPollIcon", { weight: "bold" });

/* Poll domain -------------------------------------------------------------- */

export const RestaurantIcon = decorative(PhForkKnife, "RestaurantIcon");
export const StorefrontIcon = decorative(PhStorefront, "StorefrontIcon");
export const BallotIcon = decorative(PhTicket, "BallotIcon");
export const ChoicesIcon = decorative(PhCheckSquare, "ChoicesIcon");
export const DateIcon = decorative(PhCalendarBlank, "DateIcon");
export const DriveIcon = decorative(PhCarSimple, "DriveIcon");
export const PlaceIcon = decorative(PhMapPin, "PlaceIcon");
export const MapIcon = decorative(PhMapTrifold, "MapIcon");
export const VotersIcon = decorative(PhUsers, "VotersIcon");
export const DraftIcon = decorative(PhPencilSimpleLine, "DraftIcon");
export const TrophyIcon = decorative(PhTrophy, "TrophyIcon");
export const VoteIcon = decorative(PhHandPointing, "VoteIcon");
/** Ratings read better as a solid star; an outline star looks like "unrated". */
export const RatingIcon = decorative(PhStar, "RatingIcon", { weight: "fill" });

/* Feedback and status ------------------------------------------------------ */

export const InfoIcon = decorative(PhInfo, "InfoIcon");
export const WarningIcon = decorative(PhWarning, "WarningIcon");
export const DangerIcon = decorative(PhXCircle, "DangerIcon");
export const SuccessIcon = decorative(PhCheckCircle, "SuccessIcon");
export const CheckIcon = decorative(PhCheck, "CheckIcon", { weight: "bold" });
export const PendingIcon = decorative(PhClock, "PendingIcon");
export const NotFoundIcon = decorative(PhMagnifyingGlass, "NotFoundIcon");
export const BrokenLinkIcon = decorative(PhLinkBreak, "BrokenLinkIcon");

/* Actions ------------------------------------------------------------------ */

export const CopyIcon = decorative(PhCopy, "CopyIcon");
export const RotateIcon = decorative(PhArrowsClockwise, "RotateIcon");
export const LinkIcon = decorative(PhLinkSimple, "LinkIcon");
export const EmailIcon = decorative(PhEnvelopeSimple, "EmailIcon");
export const SearchIcon = decorative(PhMagnifyingGlass, "SearchIcon");
export const CloseIcon = decorative(PhX, "CloseIcon", { weight: "bold" });
export const ArrowRightIcon = decorative(PhArrowRight, "ArrowRightIcon");
export const ExternalLinkIcon = decorative(PhArrowUpRight, "ExternalLinkIcon");
export const CaretRightIcon = decorative(PhCaretRight, "CaretRightIcon", { weight: "bold" });
