/**
 * Chat Panel — The main chat experience.
 *
 * Manages the full chat flow:
 * 1. Shows welcome screen when no messages exist
 * 2. Renders message history with proper bubbles
 * 3. Streams AI responses with a blinking cursor
 * 4. Auto-scrolls to latest message
 * 5. Provides the chat input at the bottom
 * 6. Feeds prompts into the nudge engine for the commentator panel
 *
 * Theme-aware: responds to Freestyle (light) / 0→1 (dark) mode.
 */
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { WelcomeScreen } from "./welcome-screen";
import { ChatInput, type ChatInputHandle } from "./chat-input";
import { MessageBubble } from "./message-bubble";
import { createConversation, streamChat, getMessages } from "@/lib/api";
import { useTheme } from "@/lib/theme-context";
import { useCommentator } from "@/lib/commentator-context";

/** Local message type for UI state (before/during persistence) */
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

interface ChatPanelProps {
  /** Conversation ID — null means new conversation (show welcome) */
  conversationId: string | null;
  /** Initial messages loaded from the API (for existing conversations) */
  initialMessages?: ChatMessage[];
}

export function ChatPanel({
  conversationId: initialConvoId,
  initialMessages = [],
}: ChatPanelProps) {
  const { mode, theme } = useTheme();
  const {
    setConversationId,
    runPromptAnalysis,
    runResponseAnalysis,
    clearNudges,
    refinedPrompt,
    clearRefinedPrompt,
    sendToWorkshop,
    clearActiveConversation,
    activeMessages,
  } = useCommentator();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [convoId, setConvoId] = useState<string | null>(initialConvoId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<ChatInputHandle>(null);

  /** Load existing messages when navigating to a conversation */
  useEffect(() => {
    if (initialConvoId && initialMessages.length === 0) {
      getMessages(initialConvoId)
        .then((msgs) => {
          setMessages(
            msgs
              .filter((m) => m.role !== "system")
              .map((m) => ({
                id: m.id,
                role: m.role as "user" | "assistant",
                content: m.content,
              })),
          );
        })
        .catch(() => {
          /* API might not be running */
        });
    }
  }, [initialConvoId, initialMessages.length]);

  /** Auto-scroll to the bottom when messages change */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  /** Sync conversation ID to commentator context */
  useEffect(() => {
    setConversationId(convoId);
  }, [convoId, setConversationId]);

  /** When commentator produces a refined prompt, inject it into the chat input */
  useEffect(() => {
    if (refinedPrompt && chatInputRef.current) {
      chatInputRef.current.setInput(refinedPrompt);
      clearRefinedPrompt();
      /* Clear workshop messages and return commentator to dormant state */
      clearActiveConversation();
    }
  }, [refinedPrompt, clearRefinedPrompt, clearActiveConversation]);

  /** Handle sending a message — creates conversation if needed, streams response */
  const handleSend = useCallback(async (message: string) => {
    /* In 0→1 mode, route to workshop — sendToWorkshop handles its own
       conversation creation, so we skip it here to avoid a race condition
       where React state hasn't synced the new conversation ID yet. */
    if (mode === "zero_to_one") {
      sendToWorkshop(message);
      return;
    }

    let activeConvoId = convoId;

    /* Step 1: Create conversation if this is the first message */
    if (!activeConvoId) {
      try {
        const convo = await createConversation("regular");
        activeConvoId = convo.id;
        setConvoId(activeConvoId);
        /* Update URL bar without remounting the component.
           router.push() would navigate to /c/[id] and mount a NEW ChatPanel,
           losing our in-progress messages and stream. replaceState keeps
           this component alive while showing the correct URL. */
        window.history.replaceState(null, "", `/c/${activeConvoId}`);
      } catch {
        setMessages((prev) => [
          ...prev,
          { id: `err-${Date.now()}`, role: "assistant", content: "Failed to create conversation. Is the backend running?" },
        ]);
        return;
      }
    }

    /* Step 2b: Run nudge analysis on the prompt (zero cost, heuristic only) */
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    clearNudges();
    runPromptAnalysis(message, history);

    /* Step 3: Add user message to UI immediately */
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: message,
    };
    setMessages((prev) => [...prev, userMsg]);

    /* Step 4: Add empty assistant message (will be filled by stream) */
    const assistantId = `asst-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", isStreaming: true },
    ]);
    setIsLoading(true);

    /* Step 5: Stream the response from the backend */
    let fullResponse = "";
    try {
      for await (const event of streamChat(activeConvoId, message)) {
        if (event.type === "chunk" && event.content) {
          fullResponse += event.content;
          /* Append each token to the streaming message */
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content + event.content }
                : m
            )
          );
        } else if (event.type === "done") {
          /* Mark streaming complete */
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, isStreaming: false, id: event.message_id || m.id }
                : m
            )
          );
          /* Step 6: Run post-response analysis (heuristic, zero cost) */
          runResponseAnalysis(message, fullResponse);
        } else if (event.type === "title" && event.title) {
          /* Title generated — notify sidebar to refetch */
          window.dispatchEvent(new CustomEvent("conversation-updated"));
        } else if (event.type === "error") {
          /* Show error in the assistant bubble */
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: event.message || "Something went wrong.", isStreaming: false }
                : m
            )
          );
        }
      }
    } catch {
      /* Network error — update the assistant bubble */
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "Connection error. Check that the backend is running on port 8000.", isStreaming: false }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [convoId, mode, clearNudges, runPromptAnalysis, runResponseAnalysis, messages]);

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", minHeight: 0,
      background: theme.bg,
      transition: "background 0.4s ease",
    }}>
      {/* ===== MESSAGE AREA =====
          Scrollable container for messages or welcome screen */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto" }}>
        {/* In 0→1 mode with active workshop, show a minimal placeholder instead of welcome screen */}
        {messages.length === 0 && mode === "zero_to_one" && activeMessages.length > 0 ? (
          <WorkshopPlaceholder theme={theme} />
        ) : messages.length === 0 ? (
          /* Show welcome screen when no messages */
          <WelcomeScreen onSelectPrompt={handleSend} />
        ) : (
          /* Render message history */
          <div style={{
            maxWidth: 720, margin: "0 auto",
            padding: "24px 16px",
            display: "flex", flexDirection: "column", gap: 24,
          }}>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                role={msg.role}
                content={msg.content}
                isStreaming={msg.isStreaming}
              />
            ))}
          </div>
        )}
      </div>

      {/* ===== CHAT INPUT =====
          Always pinned to the bottom of the panel */}
      <ChatInput ref={chatInputRef} onSubmit={handleSend} isLoading={isLoading} />
    </div>
  );
}

/** Minimal placeholder shown in the main area while 0→1 workshop is active in the panel */
function WorkshopPlaceholder({ theme }: { theme: ReturnType<typeof useTheme>["theme"] }) {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px", gap: 12,
    }}>
      {/* Sparkle icon */}
      <div style={{ color: theme.accent, opacity: 0.5 }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" />
        </svg>
      </div>
      <p style={{
        fontSize: 14, color: theme.textSecondary,
        textAlign: "center", maxWidth: 280, lineHeight: 1.6,
      }}>
        Refining your prompt in The Commentator panel →
      </p>
    </div>
  );
}
