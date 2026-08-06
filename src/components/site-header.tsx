import Link from "next/link";

type SiteHeaderProps = {
  backHref?: string;
  backLabel?: string;
  trailing?: React.ReactNode;
};

export function SiteHeader({ backHref, backLabel, trailing }: SiteHeaderProps) {
  return (
    <header className="border-b border-line bg-canvas/90 backdrop-blur">
      <div className="shell flex min-h-18 items-center justify-between gap-4 py-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="brand-mark" aria-label="LunchPick home">
            <span aria-hidden="true">LP</span>
            <span>LunchPick</span>
          </Link>
          {backHref && backLabel ? (
            <>
              <span className="hidden text-line sm:inline" aria-hidden="true">/</span>
              <Link className="hidden text-sm font-semibold text-muted sm:inline" href={backHref}>
                {backLabel}
              </Link>
            </>
          ) : null}
        </div>
        {trailing}
      </div>
    </header>
  );
}
