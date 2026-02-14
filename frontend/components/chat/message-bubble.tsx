/**
 * Message Bubble — single chat message.
 *
 * User messages: right-aligned, muted background, rounded corners.
 * Assistant messages: left-aligned with avatar, markdown rendered.
 *
 * Theme-aware: adapts to Freestyle (light) / 0→1 (dark) modes.
 */
"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTheme } from "@/lib/theme-context";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export function MessageBubble({ role, content, isStreaming }: MessageBubbleProps) {
  const { theme, mode } = useTheme();
  const isUser = role === "user";

  return (
    <div
      className="animate-fade-in"
      style={{ display: "flex", gap: 12, justifyContent: isUser ? "flex-end" : "flex-start" }}
    >
      {/* Assistant avatar */}
      {!isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: 14, flexShrink: 0,
          background: theme.accent,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 11, fontWeight: 600, marginTop: 2,
        }}>
          A
        </div>
      )}

      {/* Message content */}
      <div style={{
        maxWidth: "75%",
        padding: isUser ? "10px 16px" : "12px 16px",
        ...(isUser ? {
          background: mode === "freestyle" ? "#f0f0f2" : "rgba(255,255,255,0.08)",
          borderRadius: "20px 20px 4px 20px",
        } : {
          background: mode === "freestyle" ? "#ffffff" : "rgba(255,255,255,0.05)",
          borderRadius: "20px 20px 20px 4px",
          border: `1px solid ${mode === "freestyle" ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"}`,
          boxShadow: mode === "freestyle" ? "0 1px 3px rgba(0,0,0,0.03)" : "none",
        }),
      }}>
        {isUser ? (
          /* User messages — plain text */
          <div style={{
            fontSize: 14, lineHeight: 1.6,
            color: theme.text,
          }}>
            {content || "..."}
          </div>
        ) : (
          /* Assistant messages — plain text while streaming, markdown when done */
          <div
            className={`markdown-content ${isStreaming ? "streaming-cursor" : ""}`}
            style={{
              fontSize: 14, lineHeight: 1.7,
              color: theme.text,
            }}
          >
            {content ? (
              isStreaming ? (
                /* During streaming: plain text to avoid mid-token markdown glitches */
                <span style={{ whiteSpace: "pre-wrap" }}>{content}</span>
              ) : (
                /* After streaming: full markdown rendering with GFM support */
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    /* Style markdown elements inline for theme compatibility */
                    p: ({ children }) => (
                      <p style={{ margin: "0 0 8px 0" }}>{children}</p>
                    ),
                    h1: ({ children }) => (
                      <h1 style={{ fontSize: 18, fontWeight: 700, margin: "16px 0 8px 0", letterSpacing: "-0.02em" }}>{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 style={{ fontSize: 16, fontWeight: 700, margin: "14px 0 6px 0", letterSpacing: "-0.01em" }}>{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 style={{ fontSize: 15, fontWeight: 600, margin: "12px 0 4px 0" }}>{children}</h3>
                    ),
                    strong: ({ children }) => (
                      <strong style={{ fontWeight: 600 }}>{children}</strong>
                    ),
                    ul: ({ children }) => (
                      <ul style={{ margin: "4px 0 8px 0", paddingLeft: 18 }}>{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol style={{ margin: "4px 0 8px 0", paddingLeft: 18 }}>{children}</ol>
                    ),
                    li: ({ children }) => (
                      <li style={{ marginBottom: 2 }}>{children}</li>
                    ),
                    code: ({ children, className }) => {
                      const isBlock = className?.includes("language-");
                      if (isBlock) {
                        return (
                          <pre style={{
                            background: mode === "freestyle" ? "#f5f5f7" : "rgba(255,255,255,0.06)",
                            borderRadius: 10, padding: "10px 14px",
                            margin: "8px 0", overflow: "auto",
                            fontSize: 13, lineHeight: 1.5,
                            border: `1px solid ${mode === "freestyle" ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"}`,
                          }}>
                            <code style={{ fontFamily: "'SF Mono', 'Fira Code', monospace" }}>{children}</code>
                          </pre>
                        );
                      }
                      return (
                        <code style={{
                          background: mode === "freestyle" ? "#f0f0f2" : "rgba(255,255,255,0.08)",
                          padding: "1px 5px", borderRadius: 4,
                          fontSize: 13, fontFamily: "'SF Mono', 'Fira Code', monospace",
                        }}>
                          {children}
                        </code>
                      );
                    },
                    /* Table support via remark-gfm */
                    table: ({ children }) => (
                      <div style={{ overflowX: "auto", margin: "8px 0" }}>
                        <table style={{
                          borderCollapse: "collapse", width: "100%", fontSize: 13,
                          border: `1px solid ${mode === "freestyle" ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"}`,
                        }}>{children}</table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th style={{
                        padding: "6px 10px", textAlign: "left", fontWeight: 600, fontSize: 12,
                        borderBottom: `2px solid ${mode === "freestyle" ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)"}`,
                        background: mode === "freestyle" ? "#f5f5f7" : "rgba(255,255,255,0.04)",
                      }}>{children}</th>
                    ),
                    td: ({ children }) => (
                      <td style={{
                        padding: "6px 10px",
                        borderBottom: `1px solid ${mode === "freestyle" ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"}`,
                      }}>{children}</td>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote style={{
                        borderLeft: `3px solid ${theme.accent}`,
                        margin: "8px 0", padding: "4px 12px",
                        color: theme.textSecondary,
                      }}>
                        {children}
                      </blockquote>
                    ),
                  }}
                >
                  {content}
                </ReactMarkdown>
              )
            ) : (
              isStreaming ? "" : "..."
            )}
          </div>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: 14, flexShrink: 0,
          background: mode === "freestyle" ? "#e5e5e7" : "rgba(255,255,255,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: theme.textTertiary, fontSize: 11, fontWeight: 600, marginTop: 2,
        }}>
          U
        </div>
      )}
    </div>
  );
}
