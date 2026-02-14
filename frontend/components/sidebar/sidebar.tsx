/**
 * Sidebar — Dark, Arc-style navigation.
 * Hidden on mobile (<768px), collapsible on desktop.
 *
 * Fetches real conversation data from the API.
 * Supports new conversation creation and navigation.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { listConversations, deleteConversation, type Conversation } from "@/lib/api";

/** Format relative timestamp — "2m ago", "3h ago", "Yesterday", etc. */
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  /* Extract current conversation ID from the URL */
  const activeConvoId = pathname.startsWith("/c/") ? pathname.slice(3) : null;

  /** Fetch conversations from the API */
  const fetchConversations = useCallback(async () => {
    try {
      const convos = await listConversations();
      setConversations(convos);
    } catch {
      /* API might not be running — fail silently */
    } finally {
      setIsLoading(false);
    }
  }, []);

  /* Fetch on mount */
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  /* Re-fetch when URL changes (new conversation created) */
  useEffect(() => {
    fetchConversations();
  }, [pathname, fetchConversations]);

  /** Navigate to new conversation */
  const handleNewConversation = () => {
    router.push("/");
  };

  /** Navigate to existing conversation */
  const handleSelectConversation = (id: string) => {
    router.push(`/c/${id}`);
  };

  /** Delete a conversation with confirmation */
  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); /* Don't navigate when clicking delete */
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      /* If we deleted the active conversation, navigate home */
      if (id === activeConvoId) {
        router.push("/");
      }
    } catch {
      /* Fail silently */
    }
  };

  if (collapsed) {
    return (
      <div
        className="hidden md:flex"
        style={{
          width: 48, background: "#0a0a0a", flexDirection: "column",
          alignItems: "center", paddingTop: 14, flexShrink: 0,
        }}
      >
        <button
          onClick={() => setCollapsed(false)}
          style={{
            width: 30, height: 30, borderRadius: 8,
            background: "#6366f1", border: "none", cursor: "pointer",
            color: "#fff", fontSize: 12, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          A
        </button>
      </div>
    );
  }

  return (
    <aside
      className="hidden md:flex"
      style={{
        width: 260, minWidth: 260, flexShrink: 0,
        background: "#0a0a0a", color: "#fff",
        flexDirection: "column", height: "100%",
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px", height: 52, borderBottom: "1px solid #1a1a1a",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "#6366f1", display: "flex",
            alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700,
          }}>A</div>
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}>Averroes</span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          style={{
            background: "none", border: "none", color: "#555",
            cursor: "pointer", padding: 4, borderRadius: 4,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Search + New */}
      <div style={{ padding: "10px 12px 4px", flexShrink: 0 }}>
        <button style={{
          width: "100%", display: "flex", alignItems: "center", gap: 8,
          padding: "8px 12px", borderRadius: 10, background: "#141414",
          border: "1px solid #1f1f1f", color: "#666", fontSize: 12,
          cursor: "pointer",
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          Search...
          <span style={{ marginLeft: "auto", fontSize: 10, color: "#444" }}>⌘K</span>
        </button>

        <button
          onClick={handleNewConversation}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 8,
            padding: "8px 12px", marginTop: 4, borderRadius: 10,
            background: "transparent", border: "none", color: "#888",
            fontSize: 12, cursor: "pointer",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New conversation
        </button>
      </div>

      {/* Conversations — real data from API */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
        <div style={{ padding: "4px 8px", fontSize: 10, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Recent
        </div>

        {/* Loading state */}
        {isLoading && (
          <p style={{ padding: "8px 10px", fontSize: 12, color: "#444" }}>Loading...</p>
        )}

        {/* Empty state */}
        {!isLoading && conversations.length === 0 && (
          <p style={{ padding: "8px 10px", fontSize: 12, color: "#444" }}>No conversations yet</p>
        )}

        {/* Conversation list */}
        {conversations.map((convo) => {
          const isActive = convo.id === activeConvoId;
          return (
            <div
              key={convo.id}
              className="sidebar-convo-item"
              style={{
                position: "relative",
                display: "flex", alignItems: "center",
                borderRadius: 8,
                transition: "all 0.1s",
              }}
              onMouseEnter={(e) => {
                const btn = e.currentTarget.querySelector("button.convo-btn") as HTMLElement;
                const del = e.currentTarget.querySelector("button.delete-btn") as HTMLElement;
                if (!isActive && btn) { btn.style.background = "#141414"; btn.style.color = "#ddd"; }
                if (del) del.style.opacity = "1";
              }}
              onMouseLeave={(e) => {
                const btn = e.currentTarget.querySelector("button.convo-btn") as HTMLElement;
                const del = e.currentTarget.querySelector("button.delete-btn") as HTMLElement;
                if (!isActive && btn) { btn.style.background = "transparent"; btn.style.color = "#999"; }
                if (del) del.style.opacity = "0";
              }}
            >
              <button
                className="convo-btn"
                onClick={() => handleSelectConversation(convo.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 10px", borderRadius: 8,
                  background: isActive ? "#1a1a1a" : "transparent",
                  border: "none",
                  color: isActive ? "#fff" : "#999",
                  fontSize: 13, cursor: "pointer",
                  textAlign: "left", transition: "all 0.1s",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: isActive ? 0.7 : 0.4, flexShrink: 0 }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {convo.title || "New conversation"}
                  </div>
                  {/* Preview + timestamp */}
                  <div style={{
                    display: "flex", justifyContent: "space-between", gap: 4,
                    fontSize: 10, color: "#555", marginTop: 1,
                  }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      {convo.last_message_preview || "Empty"}
                    </span>
                    <span style={{ flexShrink: 0 }}>{relativeTime(convo.updated_at)}</span>
                  </div>
                </div>
              </button>
              {/* Delete button — appears on hover */}
              <button
                className="delete-btn"
                onClick={(e) => handleDeleteConversation(e, convo.id)}
                style={{
                  position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                  width: 24, height: 24, borderRadius: 6,
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#666", opacity: 0,
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(220, 74, 74, 0.2)";
                  e.currentTarget.style.color = "#dc4a4a";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.color = "#666";
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                </svg>
              </button>
            </div>
          );
        })}

        <div style={{ marginTop: 20, padding: "4px 8px", fontSize: 10, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Spaces
        </div>
        <p style={{ padding: "4px 10px", fontSize: 12, color: "#444" }}>No spaces yet</p>
      </nav>

      {/* Footer */}
      <div style={{
        borderTop: "1px solid #1a1a1a", padding: "12px 16px",
        display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
      }}>
        <div style={{
          width: 24, height: 24, borderRadius: 12, background: "#1f1f1f",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, color: "#888", fontWeight: 500,
        }}>G</div>
        <span style={{ fontSize: 12, color: "#888" }}>Guest</span>
      </div>
    </aside>
  );
}
