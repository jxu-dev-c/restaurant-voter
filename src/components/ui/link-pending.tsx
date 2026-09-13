"use client";

import { useLinkStatus } from "next/link";

/**
 * Feedback for links whose destination is rendered on the server.
 *
 * Both indicators render at a fixed size and animate in after a delay from a
 * zero-opacity start, so a prefetched (instant) navigation never flashes a
 * spinner — only a transition that genuinely waits on the server shows one.
 * Must be rendered inside a `<Link>`: `useLinkStatus` reads the nearest one.
 */

/** A hairline bar that fills along the bottom edge of a nav row. */
export function LinkProgress() {
  const { pending } = useLinkStatus();
  return <span aria-hidden className={`link-progress${pending ? " is-pending" : ""}`} />;
}

/**
 * Swaps a button's trailing glyph for a spinner in the same box. The glyph is
 * never unmounted, so the button's width does not move when it goes pending.
 */
export function LinkBusySwap({
  children,
  size = 14,
}: {
  children: React.ReactNode;
  size?: number;
}) {
  const { pending } = useLinkStatus();

  return (
    <span
      className={`link-busy-swap${pending ? " is-pending" : ""}`}
      style={{ "--link-busy-size": `${size}px` } as React.CSSProperties}
    >
      <span aria-hidden className="link-busy-glyph">{children}</span>
      <span aria-hidden className="link-busy-spinner" />
      {pending ? <span className="sr-only" role="status">Opening…</span> : null}
    </span>
  );
}
