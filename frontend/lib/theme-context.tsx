/**
 * Theme & Mode Context — Global state for Freestyle/0→1 mode and theme.
 *
 * This context manages:
 * - Current mode: "freestyle" (light theme) or "zero_to_one" (dark theme)
 * - Commentator panel state: dormant, nudging, active
 * - Theme switching with smooth transitions
 *
 * The theme changes ARE the UX — dark mode = 0→1 is active,
 * light mode = you're in Freestyle. It's a visual cue, not a preference.
 */
"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

/* ========================================
   Types
   ======================================== */

/** The two modes of Averroes */
export type AppMode = "freestyle" | "zero_to_one";

/** Commentator panel states — controls what the panel shows and whether LLM calls happen */
export type CommentatorState = "dormant" | "nudging" | "active";

interface ThemeContextValue {
  /** Current mode — determines theme colors */
  mode: AppMode;
  /** Switch to a specific mode */
  setMode: (mode: AppMode) => void;
  /** Toggle between modes */
  toggleMode: () => void;

  /** Current commentator state */
  commentatorState: CommentatorState;
  /** Update commentator state */
  setCommentatorState: (state: CommentatorState) => void;

  /** Whether the commentator panel is expanded (visible vs collapsed) */
  isPanelOpen: boolean;
  /** Toggle panel visibility */
  togglePanel: () => void;
  /** Explicitly set panel open/closed */
  setPanelOpen: (open: boolean) => void;

  /** Theme colors derived from current mode */
  theme: ThemeColors;
}

/** Theme color tokens — derived from the current mode */
export interface ThemeColors {
  /* Backgrounds */
  bg: string;              /* Main page background */
  bgSecondary: string;     /* Secondary surfaces (cards, inputs) */
  bgPanel: string;         /* Commentator panel background */
  bgPanelOverlay: string;  /* Panel overlay in 0→1 mode */

  /* Text */
  text: string;            /* Primary text */
  textSecondary: string;   /* Secondary/muted text */
  textTertiary: string;    /* Subtle text (timestamps, hints) */

  /* Accents */
  accent: string;          /* Primary accent (blue/periwinkle in Freestyle, red/coral in 0→1) */
  accentMuted: string;     /* Muted accent for borders, subtle highlights */

  /* Borders */
  border: string;          /* Default border */
  borderSubtle: string;    /* Lighter border */

  /* Interactive */
  buttonBg: string;        /* Primary button background */
  buttonText: string;      /* Primary button text */
  hoverBg: string;         /* Hover state background */

  /* Sidebar */
  sidebarBg: string;       /* Sidebar background (stays dark always) */
  sidebarText: string;     /* Sidebar text */

  /* Commentator panel specific */
  panelAccent: string;     /* Panel accent color (blue in Freestyle, red in 0→1) */
  nudgeBg: string;         /* Nudge message background */
  nudgeText: string;       /* Nudge message text */
  nudgeBorder: string;     /* Nudge message border */
}

/* ========================================
   Theme Definitions
   ======================================== */

/** Freestyle — light mode. Blue/periwinkle accents. Apple-level polish. */
const FREESTYLE_THEME: ThemeColors = {
  bg: "#fafafa",
  bgSecondary: "#f0f0f2",
  bgPanel: "#6366f1",                        /* Solid blue/periwinkle panel */
  bgPanelOverlay: "#5558e6",

  text: "#111827",            /* Gray-900 */
  textSecondary: "#6b7280",   /* Gray-500 */
  textTertiary: "#9ca3af",    /* Gray-400 */

  accent: "#6366f1",          /* Blue/periwinkle — primary accent */
  accentMuted: "#a5b4fc",     /* Muted indigo */

  border: "rgba(209, 213, 219, 0.6)",   /* Gray-200/60 */
  borderSubtle: "rgba(229, 231, 235, 0.5)",

  buttonBg: "#111827",
  buttonText: "#ffffff",
  hoverBg: "#f3f4f6",

  sidebarBg: "#0a0a0a",
  sidebarText: "#ffffff",

  panelAccent: "#6366f1",     /* Blue/periwinkle — panel accent */
  nudgeBg: "rgba(255, 255, 255, 0.15)",
  nudgeText: "#ffffff",
  nudgeBorder: "rgba(255, 255, 255, 0.2)",
};

/** 0→1 — dark mode. Red/coral accents. */
const ZERO_TO_ONE_THEME: ThemeColors = {
  bg: "#0f1419",              /* Dark charcoal */
  bgSecondary: "#1a1f28",
  bgPanel: "#dc4a4a",                        /* Solid red/coral panel */
  bgPanelOverlay: "#c94242",

  text: "#f9fafb",            /* White */
  textSecondary: "#9ca3af",   /* Gray-400 */
  textTertiary: "#6b7280",    /* Gray-500 */

  accent: "#dc4a4a",          /* Red/coral — primary accent */
  accentMuted: "#8b3535",     /* Muted red */

  border: "rgba(255, 255, 255, 0.1)",    /* White/10 */
  borderSubtle: "rgba(255, 255, 255, 0.06)",

  buttonBg: "#374151",        /* Gray-700 */
  buttonText: "#f9fafb",
  hoverBg: "rgba(255, 255, 255, 0.05)",  /* White/5 */

  sidebarBg: "#0a0d12",
  sidebarText: "#ffffff",

  panelAccent: "#dc4a4a",     /* Red/coral — panel accent */
  nudgeBg: "rgba(255, 255, 255, 0.12)",
  nudgeText: "#ffffff",
  nudgeBorder: "rgba(255, 255, 255, 0.18)",
};

/* ========================================
   Context
   ======================================== */

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Hook to access theme and mode state */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

/* ========================================
   Provider
   ======================================== */

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppMode>("freestyle");
  const [commentatorState, setCommentatorState] = useState<CommentatorState>("dormant");
  const [isPanelOpen, setPanelOpen] = useState(true); /* Panel visible by default */

  /** Toggle between Freestyle and 0→1 */
  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === "freestyle" ? "zero_to_one" : "freestyle"));
  }, []);

  /** Toggle panel open/closed */
  const togglePanel = useCallback(() => {
    setPanelOpen((prev) => !prev);
  }, []);

  /** Derive theme colors from current mode */
  const theme = mode === "freestyle" ? FREESTYLE_THEME : ZERO_TO_ONE_THEME;

  return (
    <ThemeContext.Provider
      value={{
        mode,
        setMode,
        toggleMode,
        commentatorState,
        setCommentatorState,
        isPanelOpen,
        togglePanel,
        setPanelOpen,
        theme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
