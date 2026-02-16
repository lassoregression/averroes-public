/**
 * Welcome Screen — shown before the first message.
 *
 * The user picks their path here:
 * - Freestyle: open-ended chat, commentator watches
 * - 0→1: back-and-forth with commentator to shape a prompt
 *
 * Features a rotating subtitle with shimmer effect that changes
 * with the selected mode. Once a prompt is sent, welcome disappears.
 *
 * Theme-aware: responds to Freestyle (light) / 0→1 (dark) mode.
 */
"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/lib/theme-context";

/* ========================================
   Rotating subtitle phrases per mode
   ======================================== */
const FREESTYLE_PHRASES = [
  "Explore freely and brainstorm without limits",
  "Ask anything — The Commentator watches and learns",
  "Your ideas, amplified by observation",
  "Think out loud — insights come as you go",
];

const ZERO_TO_ONE_PHRASES = [
  "Shape your idea into a sharp prompt",
  "A conversation before the conversation",
  "From rough thought to precise intent",
  "Talk it through — then send it out",
];

/* ========================================
   Example prompts — shown as clickable cards (Freestyle only)
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
  const phrases = mode === "freestyle" ? FREESTYLE_PHRASES : ZERO_TO_ONE_PHRASES;
  const [phraseIndex, setPhraseIndex] = useState(0);

  /* Rotate subtitle phrases every 3.5 seconds */
  useEffect(() => {
    setPhraseIndex(0);
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % phrases.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [mode, phrases.length]);

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px 24px 48px",
    }}>
      {/* ===== SPARKLE ICON ===== */}
      <div style={{ marginBottom: 24, color: theme.accent }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" />
          <path d="M19 1L19.5 3L21 3.5L19.5 4L19 6L18.5 4L17 3.5L18.5 3L19 1Z" opacity="0.5" />
        </svg>
      </div>

      {/* ===== HEADLINE ===== */}
      <h1 style={{
        fontSize: 28, fontWeight: 600, color: theme.text,
        letterSpacing: "-0.03em", marginBottom: 16,
        textAlign: "center",
      }}>
        Averroes
      </h1>

      {/* ===== ROTATING SUBTITLE with shimmer =====
          Changes when mode switches + rotates on a timer */}
      <div style={{
        height: 28, marginBottom: 28,
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}>
        <p
          key={`${mode}-${phraseIndex}`}
          style={{
            fontSize: 15, fontWeight: 500,
            letterSpacing: "-0.01em",
            textAlign: "center",
            maxWidth: 420, lineHeight: 1.6,
            /* Shimmer gradient text effect */
            background: mode === "freestyle"
              ? `linear-gradient(90deg, ${theme.textSecondary} 0%, ${theme.accent} 50%, ${theme.textSecondary} 100%)`
              : `linear-gradient(90deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.5) 100%)`,
            backgroundSize: "200% 100%",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            animation: "shimmer-text 3s ease-in-out infinite, thinking-fade 3.5s ease-in-out",
          }}
        >
          {phrases[phraseIndex]}
        </p>
      </div>

      {/* ===== MODE TOGGLE =====
          Path picker — choose your approach before starting.
          Disappears once the first message is sent. */}
      <div style={{
        display: "flex", gap: 2, padding: 3,
        background: mode === "freestyle"
          ? "rgba(0, 0, 0, 0.05)"
          : "rgba(255, 255, 255, 0.08)",
        borderRadius: 14,
        marginBottom: 44,
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

      {/* ===== EXAMPLE PROMPT CARDS (Freestyle only) ===== */}
      {mode === "freestyle" && (
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
                background: "#fff",
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
      )}

      {/* ===== 0→1 HINT =====
          In 0→1, the conversation happens in the panel */}
      {mode === "zero_to_one" && (
        <p style={{
          fontSize: 13, color: theme.textTertiary,
          textAlign: "center", lineHeight: 1.6,
          maxWidth: 340,
        }}>
          Type your idea below — The Commentator will ask you a few questions, then craft a prompt you can send to the AI.
        </p>
      )}
    </div>
  );
}
