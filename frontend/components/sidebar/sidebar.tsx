/**
 * Sidebar — Dark, Arc-style navigation.
 * Hidden on mobile (<768px), collapsible on desktop.
 */
"use client";

import { useState } from "react";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

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

        <button style={{
          width: "100%", display: "flex", alignItems: "center", gap: 8,
          padding: "8px 12px", marginTop: 4, borderRadius: 10,
          background: "transparent", border: "none", color: "#888",
          fontSize: 12, cursor: "pointer",
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New conversation
        </button>
      </div>

      {/* Conversations */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
        <div style={{ padding: "4px 8px", fontSize: 10, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Recent
        </div>
        {["Welcome to Averroes", "Marketing strategy draft", "Code review notes"].map((title) => (
          <button
            key={title}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "8px 10px", borderRadius: 8, background: "transparent",
              border: "none", color: "#999", fontSize: 13, cursor: "pointer",
              textAlign: "left", transition: "all 0.1s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#141414";
              e.currentTarget.style.color = "#ddd";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#999";
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4, flexShrink: 0 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
          </button>
        ))}

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
