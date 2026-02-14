/**
 * Welcome Screen — shown before the first message.
 *
 * Layout:
 * - Sparkle icon (brand mark)
 * - "Change how you work with AI" headline
 * - Freestyle / 0→1 mode toggle (centered, pill-shaped)
 * - Subtitle that changes with mode
 * - Example prompt cards
 *
 * The toggle is centered here on the welcome screen.
 * Once conversation starts, the toggle moves near the commentator panel.
 *
 * Theme-aware: responds to Freestyle (light) / 0→1 (dark) mode.
 */
"use client";

import { useTheme } from "@/lib/theme-context";

/* ========================================
   Example prompts — shown as clickable cards
   ======================================== */
const EXAMPLE_PROMPTS = [
  { label: "Write a business email", prompt: "Help me write an email to my team about the project update" },
  { label: "Analyze a document", prompt: "Summarize this contract and highlight key risks" },
  { label: "Brainstorm ideas", prompt: "Give me some marketing ideas for my startup" },
  { label: "Technical question", prompt: "Explain how authentication works in web apps" },
];

interface WelcomeScreenProps {
  onSelectPrompt?: (prompt: string) => void;
}

export function WelcomeScreen({ onSelectPrompt }: WelcomeScreenProps) {
  const { mode, setMode, theme } = useTheme();

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px 24px 48px",
    }}>
      {/* ===== MODE TOGGLE =====
          Centered pill-shaped segmented control: Freestyle | 0→1
          Styled like the ChatGPT model selector */}
      <div style={{
        display: "flex", gap: 2, padding: 3,
        background: mode === "freestyle"
          ? "rgba(0, 0, 0, 0.05)"
          : "rgba(255, 255, 255, 0.08)",
        borderRadius: 14,
        marginBottom: 48,
      }}>
        <button
          onClick={() => setMode("freestyle")}
          style={{
            padding: "8px 22px", borderRadius: 11,
            fontSize: 13, fontWeight: 500, letterSpacing: "-0.01em",
            border: "none", cursor: "pointer",
            transition: "all 0.2s ease",
            background: mode === "freestyle" ? theme.buttonBg : "transparent",
            color: mode === "freestyle" ? theme.buttonText : theme.textTertiary,
            boxShadow: mode === "freestyle" ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
          }}
        >
          Freestyle
        </button>
        <button
          onClick={() => setMode("zero_to_one")}
          style={{
            padding: "8px 22px", borderRadius: 11,
            fontSize: 13, fontWeight: 500, letterSpacing: "-0.01em",
            border: "none", cursor: "pointer",
            transition: "all 0.2s ease",
            background: mode === "zero_to_one" ? theme.buttonBg : "transparent",
            color: mode === "zero_to_one" ? theme.buttonText : theme.textTertiary,
            boxShadow: mode === "zero_to_one" ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
          }}
        >
          0 → 1
        </button>
      </div>

      {/* ===== SPARKLE ICON =====
          Brand mark — matches the Figma reference */}
      <div style={{ marginBottom: 20, color: theme.accent }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Four-point star / sparkle */}
          <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" />
          {/* Small decorative sparkle */}
          <path d="M19 1L19.5 3L21 3.5L19.5 4L19 6L18.5 4L17 3.5L18.5 3L19 1Z" opacity="0.5" />
        </svg>
      </div>

      {/* ===== HEADLINE ===== */}
      <h1 style={{
        fontSize: 28, fontWeight: 600, color: theme.text,
        letterSpacing: "-0.03em", marginBottom: 12,
        textAlign: "center",
      }}>
        Change how you work with AI
      </h1>

      {/* ===== SUBTITLE =====
          Changes based on mode to explain what the user is about to do */}
      <p style={{
        fontSize: 14, color: theme.textSecondary,
        marginBottom: 44, textAlign: "center",
        maxWidth: 380, lineHeight: 1.6,
      }}>
        {mode === "freestyle"
          ? "Explore freely and brainstorm without limits"
          : "Switch to 0 → 1 mode for rapid, goal-driven execution"}
      </p>

      {/* ===== EXAMPLE PROMPT CARDS ===== */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: 10, maxWidth: 480, width: "100%",
      }}>
        {EXAMPLE_PROMPTS.map((ex) => (
          <button
            key={ex.label}
            onClick={() => onSelectPrompt?.(ex.prompt)}
            style={{
              padding: "14px 16px", borderRadius: 12,
              border: `1px solid ${theme.border}`,
              background: mode === "freestyle" ? "#fff" : theme.bgSecondary,
              textAlign: "left", cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = theme.accentMuted;
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = theme.border;
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 500, color: theme.text, marginBottom: 4 }}>
              {ex.label}
            </div>
            <div style={{ fontSize: 12, color: theme.textTertiary, lineHeight: 1.4 }}>
              {ex.prompt}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
