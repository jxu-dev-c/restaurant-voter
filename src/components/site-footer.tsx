import Link from "next/link";

const columns = [
  {
    heading: "Product",
    links: [
      { label: "How it works", href: "/#how-it-works" },
      { label: "Organizer sign in", href: "/admin/login" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-band">
      <div className="shell grid gap-10 py-12 sm:grid-cols-[1.4fr_repeat(2,minmax(0,1fr))] sm:py-14">
        <div>
          <Link href="/" className="brand-mark" aria-label="LunchPick home">
            <span aria-hidden="true">LP</span>
            <span>LunchPick</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-6 text-muted">
            Built for small teams and decisive lunches.
          </p>
        </div>
        {columns.map((column) => (
          <nav key={column.heading} aria-label={column.heading}>
            <p className="eyebrow">{column.heading}</p>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    className="text-sm text-muted transition-colors hover:text-ink"
                    href={link.href}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line-strong/60">
        <p className="shell py-5 text-xs text-muted">
          © {new Date().getFullYear()} LunchPick
        </p>
      </div>
    </footer>
  );
}
