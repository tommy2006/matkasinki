import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });

export const metadata: Metadata = {
  title: "Airport Cup — where is worth going?",
  description:
    "An AI travel planner that finds where's worth traveling, plans the trip, and builds your football club from the places you actually visit.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body>
        <nav className="nav">
          <div className="nav__inner">
            <Link href="/discover" className="nav__brand">
              ✈️ Airport Cup
            </Link>
            <div className="nav__links">
              <Link href="/discover" className="nav__link">Discover</Link>
              <Link href="/plan" className="nav__link">Plan</Link>
              <Link href="/routes" className="nav__link">Routes</Link>
              <Link href="/activities" className="nav__link">Activities</Link>
              <Link href="/packing" className="nav__link">Packing</Link>
              <Link href="/budget" className="nav__link">Budget</Link>
              <Link href="/guide" className="nav__link">Guide</Link>
              <Link href="/away" className="nav__link">Away</Link>
              <Link href="/club" className="nav__link nav__link--club">⚽ Club</Link>
              <Link href="/leagues" className="nav__link nav__link--club">Leagues</Link>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
