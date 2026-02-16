/**
 * Root Layout — Averroes Application
 *
 * This is the top-level layout that wraps every page.
 * It sets up:
 * - Geist Sans/Mono fonts (the primary typeface — clean, professional, matches Linear)
 * - Global CSS variables and Tailwind styles
 * - HTML metadata (title, description, favicon)
 *
 * All pages inherit from this layout. The (app) route group
 * adds the sidebar and main content area on top of this.
 */
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

/* SEO and browser tab metadata */
export const metadata: Metadata = {
  title: "Averroes — The New Way to Work with AI",
  description:
    "AI prompt coaching that makes every interaction better. Named after Ibn Rushd, The Commentator.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-background text-foreground antialiased" style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
