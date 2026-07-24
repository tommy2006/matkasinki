import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });

export const metadata: Metadata = {
  title: "Matkasinki — HSL journey planner",
  description:
    "Plan the best path across the Helsinki region (HSL zones A–C) using trains, metro, trams, buses and ferries — weather-aware, on the interactive Digitransit HSL map.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body>
        <nav className="nav">
          <div className="nav__inner">
            <Link href="/" className="nav__brand">
              🚇 Matkasinki
            </Link>
            <div className="nav__links">
              <Link href="/" className="nav__link">Home</Link>
              <Link href="/journey" className="nav__link">Journey</Link>
              <Link href="/routes" className="nav__link">Routes</Link>
              <Link href="/chat" className="nav__link">Chat</Link>
              <span className="nav__link nav__link--muted">HSL zones A–C</span>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
