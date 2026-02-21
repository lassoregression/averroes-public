/**
 * Commentator Context — Shared state between ChatPanel and CommentatorPanel.
 *
 * Bridges the gap between the chat (page-level) and commentator panel (layout-level)
 * by providing shared state and handlers for:
 * - Auto-triggered prompt suggestions after each chat exchange
 * - Active coaching conversation (messages + streaming)
 * - "Use refined prompt" flow (commentator → chat input)
 * - Conversation ID tracking (so commentator knows which convo to coach)
 * - Workshop mode (0→1) for guided prompt refinement
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
import type { Nudge } from "@/lib/nudge-engine";
import { streamCoach, streamWorkshop, createConversation } from "@/lib/api";
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

  /** Workshop-extracted prompt — displayed as card, NOT auto-injected.
   *  User must click "Use in chat" to move it to refinedPrompt → chat input. */
  workshopPrompt: string | null;

  /** Whether the workshop has completed (prompt card shown, waiting for user action) */
  workshopComplete: boolean;

  /** True from when user sends a message until the auto-commentator starts streaming.
   *  Used to show the "Pondering..." shimmer while the main chat is still responding. */
  isPendingCommentary: boolean;

  /** Signal that commentary is incoming — shows shimmer in the panel immediately. */
  signalPendingCommentary: () => void;

  /**
   * Run post-response analysis (after LLM responds).
   * Auto-triggers the commentator to generate a prompt suggestion.
   */
  runResponseAnalysis: (prompt: string, response: string) => void;

  /** Send a message to the commentator (Active coaching) */
  sendToCommentator: (message: string) => Promise<void>;

  /** Clear all nudges (e.g. when starting a new conversation) */
  clearNudges: () => void;

  /** Clear the active conversation */
  clearActiveConversation: () => void;

  /** Send a message to the 0→1 workshop (creates conversation if needed) */
  sendToWorkshop: (message: string) => Promise<void>;
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
  const { setCommentatorState, setMode } = useTheme();
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [activeMessages, setActiveMessages] = useState<CommentatorMessage[]>([]);
  const [isCommentatorStreaming, setIsCommentatorStreaming] = useState(false);
  /* True from message send until auto-commentator starts — drives the panel shimmer */
  const [isPendingCommentary, setIsPendingCommentary] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [refinedPrompt, setRefinedPrompt] = useState<string | null>(null);
  /* Workshop-extracted prompt — shown as prompt card, user must click "Use in chat" to inject */
  const [workshopPrompt, setWorkshopPrompt] = useState<string | null>(null);
  /* Whether the workshop flow has completed (prompt delivered, ready for main chat) */
  const [workshopComplete, setWorkshopComplete] = useState(false);

  /* Ref to track the latest conversation ID in async callbacks */
  const convoIdRef = useRef<string | null>(null);
  convoIdRef.current = conversationId;

  /** Signal that commentary is incoming — shows the panel shimmer immediately.
   *  Called when the user sends a message, before the main chat even responds. */
  const signalPendingCommentary = useCallback(() => {
    setIsPendingCommentary(true);
    setCommentatorState("active");
  }, [setCommentatorState]);

  /**
   * Auto-trigger the commentator after each chat exchange.
   * Calls the backend /coach/respond endpoint which sends the full conversation
   * context to the LLM. The commentator generates a brief observation + a refined
   * prompt suggestion displayed as a prompt card in the panel.
   */
  const autoTriggerCommentator = useCallback(
    async (userPrompt: string) => {
      const cId = convoIdRef.current;
      if (!cId) return;

      /* Clear pending shimmer and previous messages — fresh observation for each exchange */
      setIsPendingCommentary(false);
      setActiveMessages([]);
      setNudges([]);

      /* Add empty commentator message for streaming */
      const commentatorId = `auto-coach-${Date.now()}`;
      const commentatorMsg: CommentatorMessage = {
        id: commentatorId,
        type: "commentator",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      };

      setActiveMessages([commentatorMsg]);
      setIsCommentatorStreaming(true);
      setCommentatorState("active");

      try {
        for await (const event of streamCoach(cId, userPrompt, "auto")) {
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
        /* Commentator failure shouldn't break the main chat — fail silently */
        setActiveMessages((prev) =>
          prev.map((m) =>
            m.id === commentatorId
              ? { ...m, content: "", isStreaming: false }
              : m,
          ),
        );
      } finally {
        setIsCommentatorStreaming(false);
      }
    },
    [setCommentatorState],
  );

  /** Analyze an LLM response and auto-trigger commentator for prompt suggestion.
   *  We skip setting heuristic nudges here because autoTriggerCommentator immediately
   *  clears them anyway — setting then clearing causes a distracting flash. */
  const runResponseAnalysis = useCallback(
    (prompt: string, _response: string) => {
      /* Auto-trigger the commentator to generate a prompt suggestion (LLM call).
         This clears nudges and replaces them with a shimmer → streaming commentary. */
      autoTriggerCommentator(prompt);
    },
    [autoTriggerCommentator],
  );

  /** Send a message to the commentator for active coaching (user-initiated) */
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

  /** Send a message to the 0→1 workshop for prompt refinement */
  const sendToWorkshop = useCallback(
    async (message: string) => {
      let cId = convoIdRef.current;

      /* Create a conversation if one doesn't exist yet */
      if (!cId) {
        try {
          const convo = await createConversation("zero_to_one");
          cId = convo.id;
          convoIdRef.current = cId;
          setConversationId(cId);
          /* Update URL without remounting */
          window.history.replaceState(null, "", `/c/${cId}`);
        } catch {
          return;
        }
      }

      /* Add user message to commentator feed */
      const userMsg: CommentatorMessage = {
        id: `workshop-user-${Date.now()}`,
        type: "user",
        content: message,
        timestamp: new Date(),
      };

      /* Add empty commentator message for streaming */
      const commentatorId = `workshop-resp-${Date.now()}`;
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
        for await (const event of streamWorkshop(cId, message)) {
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

            /* If workshop says prompt is ready, extract and store as workshopPrompt.
               User must click "Use in chat" to inject into main chat input.
               Mode stays in 0→1 — no auto-switching. */
            if (event.workshop_ready) {
              setActiveMessages((prev) => {
                const finalMsg = prev.find((m) => m.id === commentatorId);
                if (finalMsg) {
                  /* Extract prompt from ---PROMPT---/---END--- delimiters */
                  const promptMatch = finalMsg.content.match(/---PROMPT---\s*([\s\S]*?)\s*---END---/);
                  const extracted = promptMatch
                    ? promptMatch[1].trim()
                    : finalMsg.content.replace(/\[WORKSHOP_READY\]/g, "").trim();
                  setWorkshopPrompt(extracted);
                  setWorkshopComplete(true);
                }
                return prev;
              });
            }
          } else if (event.type === "title") {
            /* Title generated for workshop conversation — notify sidebar */
            window.dispatchEvent(new CustomEvent("conversation-updated"));
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
    [setCommentatorState, setConversationId],
  );

  const clearNudges = useCallback(() => {
    setNudges([]);
    setCommentatorState("dormant");
  }, [setCommentatorState]);

  const clearActiveConversation = useCallback(() => {
    setActiveMessages([]);
    setIsCommentatorStreaming(false);
    setIsPendingCommentary(false);
    setWorkshopPrompt(null);
    setWorkshopComplete(false);
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
        workshopPrompt,
        workshopComplete,
        isPendingCommentary,
        signalPendingCommentary,
        runResponseAnalysis,
        sendToCommentator,
        clearNudges,
        clearActiveConversation,
        sendToWorkshop,
      }}
    >
      {children}
    </CommentatorContext.Provider>
  );
}
