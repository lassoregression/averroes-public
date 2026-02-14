/**
 * Commentator Panel — Always-visible side panel for The Commentator.
 *
 * Solid colored background (blue in Freestyle, red in 0→1).
 * White text throughout. Matches the reference design closely.
 *
 * States:
 * - Dormant: "Observing Mode" badge, sparkle icon, idle message
 * - Nudging: Nudge cards scroll in
 * - Active: Full conversation with The Commentator (LLM calls)
 */
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTheme, type CommentatorState } from "@/lib/theme-context";
import { useCommentator } from "@/lib/commentator-context";
import type { CommentatorMessage } from "@/lib/commentator-context";
import type { Nudge } from "@/lib/nudge-engine";

export function CommentatorPanel() {
  const { theme, mode, commentatorState, setCommentatorState, isPanelOpen, setPanelOpen } = useTheme();
  const {
    nudges,
    activeMessages,
    isCommentatorStreaming,
    sendToCommentator,
    setRefinedPrompt,
  } = useCommentator();
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /** Combine nudges and active messages into a unified feed */
  const feed: CommentatorMessage[] = [
    ...nudges.map((n) => ({
      id: n.id,
      type: "nudge" as const,
      content: n.text,
      timestamp: new Date(),
      nudge: n,
    })),
    ...activeMessages,
  ];

  /** Auto-scroll when new messages appear */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [feed.length, activeMessages]);

  /** Handle clicking a nudge — activates the commentator with nudge as context */
  const handleNudgeClick = useCallback((clickedNudge: Nudge) => {
    setCommentatorState("active");
    setInputValue(clickedNudge.text);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [setCommentatorState]);

  /** Handle "Use this prompt" — sends text to main chat input */
  const handleUsePrompt = useCallback((text: string) => {
    setRefinedPrompt(text);
  }, [setRefinedPrompt]);

  /** Handle sending a message to the commentator */
  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || isCommentatorStreaming) return;
    sendToCommentator(trimmed);
    setInputValue("");
  }, [inputValue, isCommentatorStreaming, sendToCommentator]);

  /** Handle Enter key in input */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isPanelOpen) return null;

  const panelWidth = mode === "zero_to_one" ? 380 : 320;

  return (
    <div
      className="hidden md:flex"
      style={{
        width: panelWidth,
        minWidth: panelWidth,
        flexShrink: 0,
        height: "100%",
        flexDirection: "column",
        /* Solid colored background — matches reference */
        background: theme.bgPanel,
        borderLeft: "none",
        transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        /* In 0→1 mode, panel overlays */
        ...(mode === "zero_to_one" ? {
          position: "absolute" as const,
          right: 0,
          top: 0,
          bottom: 0,
          zIndex: 20,
          boxShadow: "-8px 0 32px rgba(0,0,0,0.2)",
        } : {}),
      }}
    >
      {/* ===== PANEL HEADER ===== */}
      <div style={{
        padding: "16px 16px 14px",
        borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}>
        {/* Left: Title + mode badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            fontSize: 14, fontWeight: 600, color: "#ffffff",
            letterSpacing: "-0.01em",
          }}>
            The Commentator
          </span>
          <ObservingBadge state={commentatorState} />
        </div>

        {/* Right: Close button */}
        <button
          onClick={() => setPanelOpen(false)}
          style={{
            width: 24, height: 24, borderRadius: 8,
            background: "rgba(255, 255, 255, 0.12)",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "rgba(255, 255, 255, 0.7)",
            transition: "all 0.15s",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* ===== MESSAGE FEED ===== */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {/* Dormant state — sparkle icon + idle message */}
        {feed.length === 0 && commentatorState === "dormant" && (
          <DormantState />
        )}

        {/* Render each feed item */}
        {feed.map((msg) => (
          <FeedItem
            key={msg.id}
            message={msg}
            onNudgeClick={handleNudgeClick}
            onUsePrompt={handleUsePrompt}
            isStreaming={msg.isStreaming}
          />
        ))}
      </div>

      {/* ===== INPUT AREA =====
          Shown when commentator is Active or in 0→1 mode */}
      {(commentatorState === "active" || mode === "zero_to_one") && (
        <div style={{
          padding: "10px 14px 14px",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          flexShrink: 0,
        }}>
          <div style={{
            display: "flex", alignItems: "flex-end", gap: 8,
            padding: "8px 12px",
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: 14,
            border: "1px solid rgba(255, 255, 255, 0.12)",
          }}>
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Talk to The Commentator..."
              rows={1}
              style={{
                flex: 1, resize: "none", border: "none", outline: "none",
                background: "transparent", fontSize: 13, lineHeight: 1.5,
                color: "#ffffff", fontFamily: "inherit",
              }}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isCommentatorStreaming}
              style={{
                width: 28, height: 28, borderRadius: 8,
                border: "none",
                cursor: inputValue.trim() ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: inputValue.trim()
                  ? "rgba(255, 255, 255, 0.25)"
                  : "rgba(255, 255, 255, 0.08)",
                color: inputValue.trim() ? "#fff" : "rgba(255, 255, 255, 0.4)",
                transition: "all 0.15s",
                flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ===== ENGAGE BUTTON =====
          Shown in dormant/nudging state so user can start active coaching */}
      {commentatorState !== "active" && mode !== "zero_to_one" && (
        <div style={{
          padding: "10px 14px 14px",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          flexShrink: 0,
        }}>
          <button
            onClick={() => {
              setCommentatorState("active");
              setTimeout(() => inputRef.current?.focus(), 100);
            }}
            style={{
              width: "100%", padding: "9px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255, 255, 255, 0.2)",
              background: "rgba(255, 255, 255, 0.1)",
              color: "#ffffff",
              fontSize: 12, fontWeight: 500,
              cursor: "pointer", transition: "all 0.15s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Talk to The Commentator
          </button>
        </div>
      )}
    </div>
  );
}

/* ========================================
   Sub-Components
   ======================================== */

/** "Observing Mode" badge — shown in header */
function ObservingBadge({ state }: { state: CommentatorState }) {
  const labels = {
    dormant: "Observing Mode",
    nudging: "Observing",
    active: "Active",
  };

  return (
    <div style={{
      padding: "2px 8px",
      borderRadius: 10,
      background: "rgba(255, 255, 255, 0.15)",
      fontSize: 10, fontWeight: 500,
      color: "rgba(255, 255, 255, 0.8)",
      letterSpacing: "0.02em",
    }}>
      {labels[state]}
    </div>
  );
}

/** Dormant state — clean centered idle message */
function DormantState() {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 6, padding: "20px 0",
    }}>
      <span style={{
        fontSize: 14, fontWeight: 500,
        color: "rgba(255, 255, 255, 0.7)",
        textAlign: "center", lineHeight: 1.6, maxWidth: 220,
        letterSpacing: "-0.01em",
      }}>
        I'll comment on your conversation as it unfolds.
      </span>
    </div>
  );
}

/** Individual feed item — renders nudges, user messages, commentator responses */
function FeedItem({
  message,
  onNudgeClick,
  onUsePrompt,
  isStreaming,
}: {
  message: CommentatorMessage;
  onNudgeClick: (nudge: Nudge) => void;
  onUsePrompt: (text: string) => void;
  isStreaming?: boolean;
}) {
  /* Nudge cards — white on transparent, actionable */
  if (message.type === "nudge" && message.nudge) {
    return (
      <button
        onClick={() => onNudgeClick(message.nudge!)}
        className="animate-fade-in"
        style={{
          display: "block", width: "100%", textAlign: "left",
          padding: "10px 12px", borderRadius: 12,
          background: "rgba(255, 255, 255, 0.1)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          cursor: "pointer", transition: "all 0.15s",
          fontSize: 12, lineHeight: 1.5, color: "#ffffff",
        }}
      >
        {/* Category label */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6, marginBottom: 4,
        }}>
          <div style={{
            width: 4, height: 4, borderRadius: 2,
            background: message.nudge.severity === "strong"
              ? "#ffffff"
              : message.nudge.severity === "medium"
              ? "rgba(255, 255, 255, 0.7)"
              : "rgba(255, 255, 255, 0.4)",
          }} />
          <span style={{
            fontSize: 10, fontWeight: 600,
            color: "rgba(255, 255, 255, 0.55)",
            textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            {message.nudge.category === "anti_pattern" ? "Tip"
              : message.nudge.category === "post_response" ? "Observation"
              : message.nudge.category === "missing_dimension" ? "Missing"
              : "Insight"}
          </span>
        </div>
        {message.content}
      </button>
    );
  }

  /* User message in commentator chat */
  if (message.type === "user") {
    return (
      <div className="animate-fade-in" style={{
        alignSelf: "flex-end", maxWidth: "85%",
        padding: "8px 12px", borderRadius: "14px 14px 4px 14px",
        background: "rgba(255, 255, 255, 0.2)",
        color: "#ffffff",
        fontSize: 13, lineHeight: 1.5,
      }}>
        {message.content}
      </div>
    );
  }

  /* Commentator response */
  if (message.type === "commentator") {
    return (
      <div className="animate-fade-in" style={{
        maxWidth: "90%",
        padding: "8px 12px", borderRadius: "14px 14px 14px 4px",
        background: "rgba(0, 0, 0, 0.15)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        fontSize: 13, lineHeight: 1.5, color: "#ffffff",
      }}>
        <span className={isStreaming ? "streaming-cursor" : ""}>
          {message.content || (isStreaming ? "" : "...")}
        </span>
        {/* "Use in chat" button — shown after streaming completes */}
        {!isStreaming && message.content && (
          <button
            onClick={() => onUsePrompt(message.content)}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              marginTop: 6, padding: "3px 8px",
              borderRadius: 6,
              border: "1px solid rgba(255, 255, 255, 0.15)",
              background: "rgba(255, 255, 255, 0.08)",
              color: "rgba(255, 255, 255, 0.7)",
              fontSize: 10, fontWeight: 500, cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
            Use in chat
          </button>
        )}
      </div>
    );
  }

  /* System messages */
  return (
    <div style={{
      textAlign: "center", fontSize: 11,
      color: "rgba(255, 255, 255, 0.5)",
      padding: "4px 0",
    }}>
      {message.content}
    </div>
  );
}
