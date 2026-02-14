/**
 * App Shell Layout — sidebar + main content + commentator panel.
 *
 * Structure: [Sidebar] [Main Content] [Commentator Panel]
 *
 * The ThemeProvider wraps everything so all children can access
 * the current mode (Freestyle/0→1), theme colors, and commentator state.
 *
 * Uses dvh for proper mobile viewport height.
 */
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
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
        {/* Header bar with mode toggle — visible in conversation */}
        <ConversationHeader />
        {children}
      </main>

      {/* Right — The Commentator panel (always visible, Twitch-style) */}
      <CommentatorPanel />
    </div>
  );
}

/**
 * ConversationHeader — Compact mode toggle for in-conversation use.
 * Only renders in conversation pages (URL contains /c/).
 * On the welcome screen (/), the toggle lives centered in WelcomeScreen.
 */
function ConversationHeader() {
  const { mode, setMode, theme } = useTheme();
  const pathname = usePathname();

  /* Only show when in a conversation (URL has /c/) — welcome screen has its own toggle */
  const isInConversation = pathname?.includes("/c/") ?? false;

  if (!isInConversation) return null;

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "8px 16px",
      borderBottom: `1px solid ${theme.borderSubtle}`,
      flexShrink: 0,
    }}>
      {/* Compact pill toggle — same concept as welcome screen but smaller */}
      <div style={{
        display: "flex", gap: 1, padding: 2,
        background: mode === "freestyle"
          ? "rgba(0, 0, 0, 0.04)"
          : "rgba(255, 255, 255, 0.06)",
        borderRadius: 10,
      }}>
        <button
          onClick={() => setMode("freestyle")}
          style={{
            padding: "4px 14px", borderRadius: 8,
            fontSize: 12, fontWeight: 500, letterSpacing: "-0.01em",
            border: "none", cursor: "pointer",
            transition: "all 0.2s ease",
            background: mode === "freestyle" ? theme.buttonBg : "transparent",
            color: mode === "freestyle" ? theme.buttonText : theme.textTertiary,
            boxShadow: mode === "freestyle" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
          }}
        >
          Freestyle
        </button>
        <button
          onClick={() => setMode("zero_to_one")}
          style={{
            padding: "4px 14px", borderRadius: 8,
            fontSize: 12, fontWeight: 500, letterSpacing: "-0.01em",
            border: "none", cursor: "pointer",
            transition: "all 0.2s ease",
            background: mode === "zero_to_one" ? theme.buttonBg : "transparent",
            color: mode === "zero_to_one" ? theme.buttonText : theme.textTertiary,
            boxShadow: mode === "zero_to_one" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
          }}
        >
          0 → 1
        </button>
      </div>
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
