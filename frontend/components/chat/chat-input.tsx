/**
 * Chat Input — Claude.ai-inspired minimal input pinned to bottom.
 *
 * Clean pill shape, subtle shadow, transparent textarea.
 * Auto-resizing, Enter to send, Shift+Enter for newline.
 * Theme-aware: adapts to Freestyle (light) and 0→1 (dark) modes.
 */
"use client";

import { useState, useRef, useCallback, useImperativeHandle, forwardRef, type KeyboardEvent } from "react";
import { useTheme } from "@/lib/theme-context";

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  /** Pre-filled value (used when commentator returns a refined prompt) */
  prefillValue?: string;
}

/** Imperative handle for parent components to inject text into the input */
export interface ChatInputHandle {
  setInput: (text: string) => void;
}

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(function ChatInput({
  onSubmit,
  isLoading = false,
  placeholder = "Message Averroes...",
  prefillValue,
}, ref) {
  const { theme, isPanelOpen, togglePanel, mode } = useTheme();
  const [value, setValue] = useState(prefillValue || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /** Expose setInput so parent can inject refined prompts */
  useImperativeHandle(ref, () => ({
    setInput: (text: string) => {
      setValue(text);
      /* Resize after next render */
      setTimeout(() => adjustHeight(), 0);
      /* Focus the textarea so user can review/edit */
      textareaRef.current?.focus();
    },
  }));

  /** Auto-resize textarea to fit content, max 120px */
  const adjustHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, []);

  /** Enter sends, Shift+Enter adds newline */
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  /** Submit the message and reset input */
  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSubmit(trimmed);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const hasValue = value.trim().length > 0;

  return (
    <div style={{
      borderTop: `1px solid ${theme.border}`,
      background: theme.bg,
      padding: "14px 16px 10px",
      transition: "background 0.4s ease, border-color 0.4s ease",
    }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* ===== INPUT CONTAINER =====
            Claude.ai-inspired: rounded-2xl, subtle shadow, minimal padding.
            The container is the visual pill; textarea inside is transparent. */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "4px 4px 4px 16px",
            border: `1px solid ${mode === "freestyle" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`,
            borderRadius: 16,
            background: mode === "freestyle" ? "#ffffff" : theme.bgSecondary,
            boxShadow: mode === "freestyle"
              ? "0 4px 20px rgba(0,0,0,0.035)"
              : "0 4px 20px rgba(0,0,0,0.2)",
            transition: "box-shadow 0.2s, border-color 0.2s, background 0.4s",
          }}
        >
          {/* Textarea — transparent, vertically centered via padding */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => { setValue(e.target.value); adjustHeight(); }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            rows={1}
            style={{
              flex: 1, resize: "none", border: "none", outline: "none",
              background: "transparent",
              fontSize: 14, lineHeight: "22px",
              padding: "9px 0",
              color: theme.text, fontFamily: "inherit",
              opacity: isLoading ? 0.5 : 1,
            }}
          />

          {/* Send button — sits flush inside the pill */}
          <button
            onClick={handleSubmit}
            disabled={!hasValue || isLoading}
            style={{
              width: 32, height: 32, borderRadius: 12,
              border: "none", flexShrink: 0,
              cursor: hasValue && !isLoading ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
              background: hasValue && !isLoading ? theme.accent : "transparent",
              color: hasValue && !isLoading ? "#fff" : theme.textTertiary,
            }}
          >
            {isLoading ? (
              /* Spinner */
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                style={{ animation: "spin 1s linear infinite" }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              /* Send arrow */
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>

        {/* ===== SHOW COMMENTATOR TOGGLE =====
            Only visible when panel is closed. Panel has its own X to close. */}
        {!isPanelOpen && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            marginTop: 8, marginBottom: 2,
          }}>
            <button
              onClick={togglePanel}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 20,
                border: `1px solid ${theme.borderSubtle}`,
                background: "transparent",
                color: theme.textTertiary,
                fontSize: 12, fontWeight: 500,
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Show The Commentator
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
