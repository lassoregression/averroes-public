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
 *
 * In 0→1 mode, the panel IS the primary interaction surface — feels like
 * a text conversation, not a chatbot. Input is always visible.
 */
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTheme, type CommentatorState } from "@/lib/theme-context";
import { useCommentator } from "@/lib/commentator-context";
import type { CommentatorMessage } from "@/lib/commentator-context";
import type { Nudge } from "@/lib/nudge-engine";
import ReactMarkdown from "react-markdown";

export function CommentatorPanel() {
  const { mode, commentatorState, setCommentatorState, isPanelOpen, setPanelOpen } = useTheme();
  const {
    nudges,
    activeMessages,
    isCommentatorStreaming,
    isPendingCommentary,
    sendToCommentator,
    sendToWorkshop,
    setRefinedPrompt,
    workshopComplete,
    workshopPrompt,
  } = useCommentator();
  const [inputValue, setInputValue] = useState("");
  /* Tracks whether user clicked "Talk to Commentator" — shows the input field */
  const [isEngaged, setIsEngaged] = useState(false);
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

  /** Reset engaged state when conversation clears (e.g. new conversation) */
  useEffect(() => {
    if (activeMessages.length === 0 && nudges.length === 0) {
      setIsEngaged(false);
    }
  }, [activeMessages.length, nudges.length]);

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

  /** Handle sending a message — routes to workshop in 0→1 mode (pre-complete), coaching otherwise */
  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || isCommentatorStreaming) return;
    /* In 0→1 mode before workshop completes, send to workshop endpoint.
       After workshop is done, panel input goes to regular coaching. */
    if (mode === "zero_to_one" && !workshopComplete) {
      sendToWorkshop(trimmed);
    } else {
      sendToCommentator(trimmed);
    }
    setInputValue("");
  }, [inputValue, isCommentatorStreaming, sendToCommentator, sendToWorkshop, mode, workshopComplete]);

  /** Handle Enter key in input */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isPanelOpen) return null;

  /* In 0→1 mode, only expand/overlay DURING the workshop (not before, not after).
     Once workshop completes, panel shrinks back so main chat is fully visible. */
  const isWorkshopActive = mode === "zero_to_one" && commentatorState === "active" && !workshopComplete;
  const panelWidth = isWorkshopActive ? 380 : 320;
  /* Use liquid gradient class based on current mode */
  const liquidClass = mode === "freestyle" ? "liquid-blue" : "liquid-red";

  /* Determine if the input area should show:
     - 0→1 mode: ALWAYS show input (text conversation feel)
     - Freestyle: show when user has explicitly engaged (clicked button or sent a message) */
  const hasUserEngaged = activeMessages.some(m => m.type === "user");
  const showInput = mode === "zero_to_one" || hasUserEngaged || isEngaged;

  return (
    <div
      className={`hidden md:flex ${liquidClass}`}
      style={{
        width: panelWidth,
        minWidth: panelWidth,
        flexShrink: 0,
        height: "100%",
        flexDirection: "column",
        borderLeft: "none",
        transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        /* In 0→1 mode, panel overlays only once workshop is active */
        ...(isWorkshopActive ? {
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
      <div className="glass-overlay" style={{
        padding: "16px 16px 14px",
        background: "rgba(0, 0, 0, 0.15)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
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
          <ObservingBadge state={commentatorState} isWorkshop={mode === "zero_to_one"} />
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
        {/* Dormant state — idle message. Hidden while pending (shimmer covers it). */}
        {feed.length === 0 && commentatorState === "dormant" && !isPendingCommentary && (
          <DormantState isWorkshop={mode === "zero_to_one"} />
        )}

        {/* Thinking shimmer — shown from the moment the user sends a message until
            the commentator has produced its first token. Two cases:
            1. isPendingCommentary: main chat still streaming, commentator not started yet
            2. Streaming with empty content: commentator started but no tokens yet */}
        {(isPendingCommentary ||
          (isCommentatorStreaming &&
            activeMessages.length > 0 &&
            activeMessages[activeMessages.length - 1].type === "commentator" &&
            activeMessages[activeMessages.length - 1].content === "")) && (
          <PanelThinkingState />
        )}

        {/* Render each feed item (skip empty streaming commentator messages — shimmer handles those) */}
        {feed.map((msg, index) => {
          /* Hide empty streaming commentator messages — PanelThinkingState covers this state */
          if (msg.type === "commentator" && msg.isStreaming && msg.content === "") return null;
          /* If the workshop is complete, pass workshopPrompt as a reliable override to the
             last commentator message — avoids the card being absent if delimiter parsing fails */
          const isLastCommentator =
            workshopComplete &&
            workshopPrompt &&
            msg.type === "commentator" &&
            feed.slice(index + 1).every((m) => m.type !== "commentator");
          return (
            <FeedItem
              key={msg.id}
              message={msg}
              onNudgeClick={handleNudgeClick}
              onUsePrompt={handleUsePrompt}
              isStreaming={msg.isStreaming}
              workshopPromptOverride={isLastCommentator ? workshopPrompt : undefined}
            />
          );
        })}
      </div>

      {/* ===== INPUT AREA =====
          In 0→1 mode: ALWAYS visible — feels like a text conversation.
          In Freestyle: shown when user explicitly engages (clicks "Talk to The Commentator"). */}
      {showInput && (
        <div className="glass-overlay" style={{
          padding: "10px 14px 14px",
          background: "rgba(0, 0, 0, 0.15)",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          flexShrink: 0,
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "4px 4px 4px 12px",
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: 14,
            border: "1px solid rgba(255, 255, 255, 0.12)",
          }}>
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                mode === "zero_to_one" && !workshopComplete
                  ? "What do you want to build?"
                  : mode === "zero_to_one"
                  ? "Ask The Commentator..."
                  : "Talk to The Commentator..."
              }
              rows={1}
              style={{
                flex: 1, resize: "none", border: "none", outline: "none",
                background: "transparent", fontSize: 13, lineHeight: "20px",
                padding: "7px 0",
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
          Shown in Freestyle when user hasn't engaged the panel yet.
          Even if auto-commentator has posted observations, user still needs
          a way to start a conversation. In 0→1, input is always visible. */}
      {!showInput && (
        <div className="glass-overlay" style={{
          padding: "10px 14px 14px",
          background: "rgba(0, 0, 0, 0.15)",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          flexShrink: 0,
        }}>
          <button
            onClick={() => {
              setCommentatorState("active");
              setIsEngaged(true);
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

/** Status badge — shown in header, adapts to mode */
function ObservingBadge({ state, isWorkshop }: { state: CommentatorState; isWorkshop: boolean }) {
  const label = isWorkshop
    ? "Workshop Mode"
    : { dormant: "Observing Mode", nudging: "Observing", active: "Active" }[state];

  return (
    <div style={{
      padding: "2px 8px",
      borderRadius: 10,
      background: isWorkshop ? "rgba(255, 255, 255, 0.25)" : "rgba(255, 255, 255, 0.15)",
      fontSize: 10, fontWeight: 500,
      color: "rgba(255, 255, 255, 0.8)",
      letterSpacing: "0.02em",
    }}>
      {label}
    </div>
  );
}

/** Dormant state — clean centered idle message, adapts to mode */
function DormantState({ isWorkshop }: { isWorkshop: boolean }) {
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
        {isWorkshop
          ? "Tell me what you're thinking — we'll shape it into something sharp."
          : "I'll comment on your conversation as it unfolds."}
      </span>
    </div>
  );
}

/** Thinking shimmer — shown while waiting for the first commentator token.
 *  Rotating words with a shimmer gradient, similar to the workshop placeholder effect. */
function PanelThinkingState() {
  const words = ["Pondering...", "Reflecting...", "Thinking...", "Considering..."];
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % words.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [words.length]);

  return (
    <div className="animate-fade-in" style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "12px 14px",
    }}>
      {/* Pulsing sparkle icon */}
      <span style={{
        fontSize: 16, opacity: 0.7,
        animation: "pulse 2s ease-in-out infinite",
      }}>
        ✦
      </span>
      {/* Rotating word with shimmer effect */}
      <span
        className="shimmer-text"
        style={{
          fontSize: 13, fontWeight: 500,
          color: "rgba(255, 255, 255, 0.6)",
          letterSpacing: "-0.01em",
          transition: "opacity 0.3s ease",
        }}
      >
        {words[wordIndex]}
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
  workshopPromptOverride,
}: {
  message: CommentatorMessage;
  onNudgeClick: (nudge: Nudge) => void;
  onUsePrompt: (text: string) => void;
  isStreaming?: boolean;
  workshopPromptOverride?: string | null;
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

  /* User message in commentator chat — right-aligned like a text conversation */
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

  /* Commentator response — left-aligned like a text conversation */
  if (message.type === "commentator") {
    /* Strip [WORKSHOP_READY] marker from displayed text */
    const cleanContent = message.content.replace(/\[WORKSHOP_READY\]/g, "").trim();

    /* Parse out refined prompt if wrapped in ---PROMPT--- / ---END--- delimiters.
       Fall back to workshopPromptOverride (from context) if delimiter parsing fails —
       ensures the card always renders when the workshop completes. */
    const promptMatch = cleanContent.match(/---PROMPT---\s*([\s\S]*?)\s*---END---/);
    const refinedPrompt = workshopPromptOverride || (promptMatch ? promptMatch[1].trim() : null);
    /* Commentary is everything outside the delimiters.
       During streaming, strip partial/complete delimiter markers so they don't
       show as raw text (e.g., "---PROM" or "---PROMPT---\n..." before ---END--- arrives).
       Also strip any "REFINED PROMPT" label the model outputs before the delimiters —
       it's already represented by the card below, so showing it in the text is redundant. */
    const commentary = (refinedPrompt
      ? cleanContent.replace(/---PROMPT---[\s\S]*?---END---/, "")
      : cleanContent.replace(/---PROMPT---[\s\S]*$/, ""))
      .replace(/\*{0,2}REFINED PROMPT\*{0,2}\s*$/i, "")
      .trim();

    return (
      <div className="animate-fade-in" style={{
        maxWidth: "90%",
        display: "flex", flexDirection: "column", gap: 8,
      }}>
        {/* Commentary bubble — the conversational part, with markdown support */}
        {commentary && (
          <div
            className={`markdown-content ${isStreaming && !refinedPrompt ? "streaming-cursor" : ""}`}
            style={{
              padding: "8px 12px", borderRadius: "14px 14px 14px 4px",
              background: "rgba(0, 0, 0, 0.15)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              fontSize: 13, lineHeight: 1.5, color: "#ffffff",
            }}
          >
            {isStreaming ? (
              /* Plain text during streaming to avoid mid-token markdown glitches */
              <span style={{ whiteSpace: "pre-wrap" }}>{commentary}</span>
            ) : (
              /* Full markdown rendering when done */
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p style={{ margin: "0 0 6px 0" }}>{children}</p>,
                  strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
                  em: ({ children }) => <em>{children}</em>,
                  ul: ({ children }) => <ul style={{ margin: "4px 0", paddingLeft: 16 }}>{children}</ul>,
                  ol: ({ children }) => <ol style={{ margin: "4px 0", paddingLeft: 16 }}>{children}</ol>,
                  li: ({ children }) => <li style={{ marginBottom: 2 }}>{children}</li>,
                  code: ({ children }) => (
                    <code style={{
                      background: "rgba(255,255,255,0.1)", padding: "1px 4px",
                      borderRadius: 3, fontSize: 12,
                    }}>{children}</code>
                  ),
                }}
              >
                {commentary}
              </ReactMarkdown>
            )}
          </div>
        )}

        {/* Refined prompt card — distinct cell, only shown when a prompt was extracted */}
        {refinedPrompt && !isStreaming && (
          <div style={{
            padding: "10px 12px", borderRadius: 12,
            background: "rgba(0, 0, 0, 0.3)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            fontSize: 13, lineHeight: 1.6, color: "#ffffff",
          }}>
            {/* Label */}
            <div style={{
              fontSize: 10, fontWeight: 600, letterSpacing: "0.04em",
              color: "rgba(255, 255, 255, 0.5)",
              textTransform: "uppercase",
              marginBottom: 6,
            }}>
              Refined prompt
            </div>
            {/* The actual prompt text */}
            <div style={{ color: "rgba(255, 255, 255, 0.95)" }}>
              {refinedPrompt}
            </div>
            {/* "Use in chat" button — only here, on the prompt card */}
            <button
              onClick={() => onUsePrompt(refinedPrompt)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                marginTop: 8, padding: "6px 14px",
                borderRadius: 8,
                border: "1px solid rgba(255, 255, 255, 0.3)",
                background: "rgba(255, 255, 255, 0.15)",
                color: "#ffffff",
                fontSize: 11, fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              Use in chat
            </button>
          </div>
        )}

        {/* No ThinkingIndicator here — in the panel, the commentary text
           appears naturally as it streams in. Showing a blinking indicator
           alongside nudge cards clutters the UI. */}
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
