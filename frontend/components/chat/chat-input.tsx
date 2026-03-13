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
import type { FileInfo } from "@/lib/api";

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  /** Pre-filled value (used when commentator returns a refined prompt) */
  prefillValue?: string;
  /** Files currently attached to this conversation */
  attachedFiles?: FileInfo[];
  /** Called when user selects a file to attach */
  onFileAttach?: (file: File) => Promise<void>;
  /** Called when user removes an attached file chip */
  onFileRemove?: (fileId: string) => void;
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
  attachedFiles = [],
  onFileAttach,
  onFileRemove,
}, ref) {
  const { theme, isPanelOpen, togglePanel, mode } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
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

  /** Handle file selection from the hidden input */
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onFileAttach) return;
    setIsUploading(true);
    try {
      await onFileAttach(file);
    } finally {
      setIsUploading(false);
      /* Reset input so same file can be re-selected */
      e.target.value = "";
    }
  }, [onFileAttach]);

  return (
    <div style={{
      borderTop: `1px solid ${theme.border}`,
      background: theme.bg,
      padding: "14px 16px 10px",
      transition: "background 0.4s ease, border-color 0.4s ease",
    }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* Hidden file input — triggered by the paperclip button */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        {/* ===== ATTACHED FILE CHIPS =====
            Shown above the input pill when files are attached. */}
        {attachedFiles.length > 0 && (
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 6,
            marginBottom: 8,
          }}>
            {attachedFiles.map((f) => (
              <div key={f.id} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 10px 4px 8px",
                borderRadius: 20,
                background: mode === "freestyle" ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.1)",
                border: `1px solid ${mode === "freestyle" ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.15)"}`,
                fontSize: 12, color: theme.text,
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ opacity: 0.5 }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {f.name}
                </span>
                <button
                  onClick={() => onFileRemove?.(f.id)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    padding: 0, display: "flex", alignItems: "center",
                    color: theme.textTertiary, lineHeight: 1,
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

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

          {/* Paperclip button — triggers hidden file input */}
          {onFileAttach && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              title="Attach PDF, DOCX, or TXT"
              style={{
                width: 32, height: 32, borderRadius: 12,
                border: "none", flexShrink: 0,
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "transparent",
                color: isUploading ? theme.accent : theme.textTertiary,
                transition: "all 0.15s",
              }}
            >
              {isUploading ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                  style={{ animation: "spin 1s linear infinite" }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              )}
            </button>
          )}

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
