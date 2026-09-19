import type { Metadata } from "next";
import { Federo, Geist_Mono, Inter, Space_Grotesk } from "next/font/google";
import { GitHubIcon } from "@/components/ui/icons";
import "./globals.css";

// Two display faces, split by size. Federo carries the large editorial type —
// hero and section headings, card titles, big numbers — where its wide, light
// caps are the point and there is enough size to carry them.
const federo = Federo({
  variable: "--font-federo",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

// Space Grotesk carries everything under ~1rem — eyebrows, field labels, pills,
// buttons, metric labels. Federo has one 400 weight and a small x-height, so at
// 11-12px tracked caps it went thin and washed out; this face has a variable
// 300-700 axis and a much larger x-height, so small labels can hold 600.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "LunchPick — Restaurant voting for teams",
    template: "%s · LunchPick",
  },
  description:
    "Create referral-only restaurant polls, compare driving distance, and choose the next team lunch together.",
  applicationName: "LunchPick",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${federo.variable} ${spaceGrotesk.variable} ${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-canvas text-body flex flex-col">
        {children}
        <a
          aria-label="GitHub repository (opens in a new tab)"
          className="icon-button feedback-link size-11 shrink-0 self-end rounded-full text-ink"
          href="https://github.com/jxu-dev-c/restaurant-voter"
          rel="noopener noreferrer"
          target="_blank"
        >
          <GitHubIcon size={22} />
        </a>
      </body>
    </html>
  );
}
