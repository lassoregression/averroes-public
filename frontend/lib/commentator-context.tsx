/**
 * Commentator Context — Shared state between ChatPanel and CommentatorPanel.
 *
 * Bridges the gap between the chat (page-level) and commentator panel (layout-level)
 * by providing shared state and handlers for:
 * - Nudges from the heuristic engine
 * - Active coaching conversation (messages + streaming)
 * - "Use refined prompt" flow (commentator → chat input)
 * - Conversation ID tracking (so commentator knows which convo to coach)
 */
"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { analyzePrompt, analyzeResponse, type Nudge } from "@/lib/nudge-engine";
import { streamCoach } from "@/lib/api";
import { useTheme } from "@/lib/theme-context";

/* ========================================
   Types
   ======================================== */

/** A message in the commentator's active conversation */
export interface CommentatorMessage {
  id: string;
  type: "nudge" | "user" | "commentator" | "system";
  content: string;
  timestamp: Date;
  nudge?: Nudge;
  isStreaming?: boolean;
}

interface CommentatorContextValue {
  /** Current nudges from heuristic analysis */
  nudges: Nudge[];

  /** Messages in active coaching conversation */
  activeMessages: CommentatorMessage[];

  /** Whether the commentator is streaming a response */
  isCommentatorStreaming: boolean;

  /** Current conversation ID (set by ChatPanel) */
  conversationId: string | null;

  /** Set the conversation ID (called by ChatPanel when convo is created) */
  setConversationId: (id: string | null) => void;

  /** Refined prompt from the commentator, ready to use in main chat */
  refinedPrompt: string | null;

  /** Clear the refined prompt after ChatPanel consumes it */
  clearRefinedPrompt: () => void;

  /** Set a refined prompt (from commentator → chat input) */
  setRefinedPrompt: (prompt: string) => void;

  /**
   * Run nudge analysis on a user prompt (before sending).
   * Returns the nudges so the caller can also use them if needed.
   */
  runPromptAnalysis: (
    prompt: string,
    conversationHistory: Array<{ role: string; content: string }>,
  ) => Nudge[];

  /**
   * Run post-response analysis (after LLM responds).
   * Appends any new nudges to existing ones.
   */
  runResponseAnalysis: (prompt: string, response: string) => void;

  /** Send a message to the commentator (Active coaching) */
  sendToCommentator: (message: string) => Promise<void>;

  /** Clear all nudges (e.g. when starting a new exchange) */
  clearNudges: () => void;

  /** Clear the active conversation */
  clearActiveConversation: () => void;
}

/* ========================================
   Context
   ======================================== */

const CommentatorContext = createContext<CommentatorContextValue | null>(null);

/** Hook to access commentator state and actions */
export function useCommentator(): CommentatorContextValue {
  const ctx = useContext(CommentatorContext);
  if (!ctx) throw new Error("useCommentator must be used within CommentatorProvider");
  return ctx;
}

/* ========================================
   Provider
   ======================================== */

export function CommentatorProvider({ children }: { children: ReactNode }) {
  const { setCommentatorState } = useTheme();
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [activeMessages, setActiveMessages] = useState<CommentatorMessage[]>([]);
  const [isCommentatorStreaming, setIsCommentatorStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [refinedPrompt, setRefinedPrompt] = useState<string | null>(null);

  /* Ref to track the latest conversation ID in async callbacks */
  const convoIdRef = useRef<string | null>(null);
  convoIdRef.current = conversationId;

  /** Analyze a prompt before sending — returns nudges and updates state */
  const runPromptAnalysis = useCallback(
    (prompt: string, conversationHistory: Array<{ role: string; content: string }>) => {
      const result = analyzePrompt(prompt, conversationHistory);
      if (result.shouldNudge) {
        setNudges(result.nudges);
        setCommentatorState("nudging");
      }
      return result.nudges;
    },
    [setCommentatorState],
  );

  /** Analyze an LLM response — replaces pre-prompt nudges with post-response observations */
  const runResponseAnalysis = useCallback(
    (prompt: string, response: string) => {
      const result = analyzeResponse(prompt, response);
      if (result.shouldNudge) {
        /* Replace pre-prompt nudges entirely — post-response observations
           are more relevant since they're about the actual exchange */
        setNudges(result.nudges);
        setCommentatorState("nudging");
      }
      /* If no post-response nudges, keep pre-prompt ones visible */
    },
    [setCommentatorState],
  );

  /** Send a message to the commentator for active coaching */
  const sendToCommentator = useCallback(
    async (message: string) => {
      const cId = convoIdRef.current;
      if (!cId) return;

      /* Add user message to feed */
      const userMsg: CommentatorMessage = {
        id: `coach-user-${Date.now()}`,
        type: "user",
        content: message,
        timestamp: new Date(),
      };

      /* Add empty commentator message for streaming */
      const commentatorId = `coach-resp-${Date.now()}`;
      const commentatorMsg: CommentatorMessage = {
        id: commentatorId,
        type: "commentator",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      };

      setActiveMessages((prev) => [...prev, userMsg, commentatorMsg]);
      setIsCommentatorStreaming(true);
      setCommentatorState("active");

      try {
        for await (const event of streamCoach(cId, message)) {
          if (event.type === "chunk" && event.content) {
            setActiveMessages((prev) =>
              prev.map((m) =>
                m.id === commentatorId
                  ? { ...m, content: m.content + event.content }
                  : m,
              ),
            );
          } else if (event.type === "done") {
            setActiveMessages((prev) =>
              prev.map((m) =>
                m.id === commentatorId ? { ...m, isStreaming: false } : m,
              ),
            );
          } else if (event.type === "error") {
            setActiveMessages((prev) =>
              prev.map((m) =>
                m.id === commentatorId
                  ? { ...m, content: event.message || "Something went wrong.", isStreaming: false }
                  : m,
              ),
            );
          }
        }
      } catch {
        setActiveMessages((prev) =>
          prev.map((m) =>
            m.id === commentatorId
              ? { ...m, content: "Connection error. Is the backend running?", isStreaming: false }
              : m,
          ),
        );
      } finally {
        setIsCommentatorStreaming(false);
      }
    },
    [setCommentatorState],
  );

  const clearNudges = useCallback(() => {
    setNudges([]);
    setCommentatorState("dormant");
  }, [setCommentatorState]);

  const clearActiveConversation = useCallback(() => {
    setActiveMessages([]);
    setIsCommentatorStreaming(false);
    setCommentatorState("dormant");
  }, [setCommentatorState]);

  const clearRefinedPrompt = useCallback(() => {
    setRefinedPrompt(null);
  }, []);

  return (
    <CommentatorContext.Provider
      value={{
        nudges,
        activeMessages,
        isCommentatorStreaming,
        conversationId,
        setConversationId,
        refinedPrompt,
        clearRefinedPrompt,
        setRefinedPrompt,
        runPromptAnalysis,
        runResponseAnalysis,
        sendToCommentator,
        clearNudges,
        clearActiveConversation,
      }}
    >
      {children}
    </CommentatorContext.Provider>
  );
}
