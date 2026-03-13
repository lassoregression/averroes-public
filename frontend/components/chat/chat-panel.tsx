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
import { createConversation, streamChat, getMessages, uploadFile, type FileInfo } from "@/lib/api";
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
    signalPendingCommentary,
    runResponseAnalysis,
    refinedPrompt,
    clearRefinedPrompt,
    sendToWorkshop,
    activeMessages,
    workshopComplete,
  } = useCommentator();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [convoId, setConvoId] = useState<string | null>(initialConvoId);
  const [attachedFiles, setAttachedFiles] = useState<FileInfo[]>([]);
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

  /** When a refined prompt is set (user clicked "Use in chat"), inject it into the chat input.
   *  Workshop messages are kept visible in the panel for context.
   *  Mode stays as-is — no auto-switching to freestyle. */
  useEffect(() => {
    if (refinedPrompt && chatInputRef.current) {
      chatInputRef.current.setInput(refinedPrompt);
      clearRefinedPrompt();
      /* Don't clear workshop messages — user can scroll back for context.
         Don't switch mode — 0→1 stays as 0→1. workshopComplete flag
         ensures handleSend routes to main chat, not back to workshop. */
    }
  }, [refinedPrompt, clearRefinedPrompt]);

  /** Handle sending a message — creates conversation if needed, streams response */
  const handleSend = useCallback(async (message: string) => {
    /* In 0→1 mode before workshop completes, route to workshop.
       After workshop is done (workshopComplete), messages go to normal main chat
       even though we're still in 0→1 dark theme. */
    if (mode === "zero_to_one" && !workshopComplete) {
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

    /* Step 2b: Signal that commentary is incoming — shows shimmer in panel immediately */
    signalPendingCommentary();

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
  }, [convoId, mode, workshopComplete, signalPendingCommentary, runResponseAnalysis, messages]);

  /** Handle file attachment — creates conversation first if needed, then uploads */
  const handleFileAttach = useCallback(async (file: File) => {
    let activeConvoId = convoId;
    if (!activeConvoId) {
      try {
        const convo = await createConversation(mode === "zero_to_one" ? "zero_to_one" : "regular");
        activeConvoId = convo.id;
        setConvoId(activeConvoId);
        window.history.replaceState(null, "", `/c/${activeConvoId}`);
      } catch {
        return;
      }
    }
    try {
      const uploaded = await uploadFile(activeConvoId, file);
      setAttachedFiles((prev) => [...prev, uploaded]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      alert(msg);
    }
  }, [convoId, mode]);

  /** Remove an attached file from local state (file stays in DB but won't affect new messages) */
  const handleFileRemove = useCallback((fileId: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", minHeight: 0,
      background: theme.bg,
      transition: "background 0.4s ease",
    }}>
      {/* ===== MESSAGE AREA =====
          Scrollable container for messages or welcome screen */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto" }}>
        {/* In 0→1 mode with active workshop (not yet complete), show dimmed placeholder */}
        {messages.length === 0 && mode === "zero_to_one" && activeMessages.length > 0 && !workshopComplete ? (
          <WorkshopPlaceholder theme={theme} />
        ) : messages.length === 0 && workshopComplete ? (
          /* Clean empty state after workshop — just a hint, no welcome screen */
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            padding: 48,
          }}>
            <p style={{
              fontSize: 14, color: theme.textTertiary,
              textAlign: "center", lineHeight: 1.6,
              maxWidth: 340,
            }}>
              Review your refined prompt below, edit if needed, and send.
            </p>
          </div>
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
      <ChatInput
        ref={chatInputRef}
        onSubmit={handleSend}
        isLoading={isLoading}
        attachedFiles={attachedFiles}
        onFileAttach={handleFileAttach}
        onFileRemove={handleFileRemove}
      />
    </div>
  );
}

/** Workshop status phrases — rotate while the commentator refines the prompt.
 *  Apple setup-screen inspired: calm, purposeful, one phrase at a time. */
const WORKSHOP_PHRASES = [
  "Refining your prompt",
  "Sharpening the details",
  "Crafting something better",
  "Almost there",
];

/** Apple-style placeholder shown in the dimmed main area during 0→1 workshop.
 *  Features: subtle dim overlay, sparkle icon, rotating status text with shimmer gradient. */
function WorkshopPlaceholder({ theme }: { theme: ReturnType<typeof useTheme>["theme"] }) {
  const [phraseIndex, setPhraseIndex] = useState(0);

  /* Rotate through phrases every 4 seconds */
  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % WORKSHOP_PHRASES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      position: "relative",
      minHeight: "100%",
    }}>
      {/* Dim overlay — pushes visual focus to the red panel */}
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
      }} />

      {/* Centered content */}
      <div style={{
        position: "relative", zIndex: 1,
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: 16,
      }}>
        {/* Sparkle icon with gentle pulse */}
        <div style={{
          color: theme.accent, opacity: 0.6,
          animation: "thinking-sparkle 3s ease-in-out infinite",
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" />
          </svg>
        </div>

        {/* Rotating status text with shimmer gradient — Apple setup screen feel */}
        <div
          key={phraseIndex}
          style={{
            fontSize: 15, fontWeight: 500, letterSpacing: "-0.01em",
            textAlign: "center", lineHeight: 1.6,
            /* Shimmer gradient text effect */
            background: "linear-gradient(90deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.4) 100%)",
            backgroundSize: "200% 100%",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            animation: "shimmer-text 2.5s ease-in-out infinite, thinking-fade 4s ease-in-out",
          }}
        >
          {WORKSHOP_PHRASES[phraseIndex]}
        </div>

        {/* Subtle arrow pointing right */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}
