/**
 * App Shell Layout — sidebar + main content + commentator panel.
 *
 * Structure: [Sidebar] [Main Content] [Commentator Panel]
 *
 * The ThemeProvider wraps everything so all children can access
 * the current mode (Freestyle/0→1), theme colors, and commentator state.
 *
 * Mode toggle lives in the Commentator Panel (panel "owns" the mode).
 *
 * Uses dvh for proper mobile viewport height.
 */
"use client";

import { useEffect } from "react";
import { Sidebar } from "@/components/sidebar/sidebar";
import { CommentatorPanel } from "@/components/commentator/commentator-panel";
import { ThemeProvider, useTheme } from "@/lib/theme-context";
import { CommentatorProvider } from "@/lib/commentator-context";

/** Inner layout that reads from ThemeContext */
function AppShell({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  /* Set CSS variable for streaming cursor color so it matches the current mode accent */
  useEffect(() => {
    document.documentElement.style.setProperty("--cursor-color", theme.accent);
  }, [theme.accent]);

  return (
    <div style={{
      display: "flex",
      height: "100dvh",
      overflow: "hidden",
      background: theme.bg,
      color: theme.text,
      /* Smooth transition when switching between Freestyle (light) and 0→1 (dark) */
      transition: "background 0.4s ease, color 0.4s ease",
      /* Relative positioning so 0→1 panel can overlay */
      position: "relative",
    }}>
      {/* Left — Navigation sidebar (always dark) */}
      <Sidebar />

      {/* Center — Main chat content area */}
      <main style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        overflow: "hidden",
      }}>
        {children}
      </main>

      {/* Right — The Commentator panel (always visible, Twitch-style) */}
      <CommentatorPanel />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <CommentatorProvider>
        <AppShell>{children}</AppShell>
      </CommentatorProvider>
    </ThemeProvider>
  );
}
