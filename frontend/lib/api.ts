/**
 * HTTP client for the FastAPI app.
 *
 * All `/api/...` requests use an absolute base URL (`NEXT_PUBLIC_API_URL`,
 * default `http://localhost:8000`). SSE streams hit that host directly so they
 * are not cut off by short Next/Vercel serverless limits. There are no API
 * rewrites in `next.config.js` for this setup.
 */

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api`;

/* ========================================
   Types (mirror backend Pydantic models)
   ======================================== */

/** Conversation object from the backend */
export interface Conversation {
  id: string;
  title: string;
  space_id: string | null;
  user_id: string;
  mode: "regular" | "zero_to_one";
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message_preview: string | null;
}

/** A single chat message */
export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

/** A coaching message from The Commentator */
export interface CoachMessage {
  id: string;
  conversation_id: string;
  coach_type: "auto" | "manual" | "workshop";
  user_prompt: string | null;
  coach_response: string;
  created_at: string;
}

/** A space (folder/project for organizing conversations) */
export interface Space {
  id: string;
  name: string;
  user_id: string;
  auto_generated: boolean;
  created_at: string;
  conversation_count: number;
}

/** A parsed uploaded file */
export interface FileInfo {
  id: string;
  conversation_id: string;
  name: string;
  file_type: string;
  size_bytes: number;
  created_at: string;
}

/* ========================================
   Generic Fetch Wrapper
   ======================================== */

/**
 * Fetch wrapper with error handling.
 * Throws a descriptive error if the response is not OK.
 */
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `API error: ${res.status}`);
  }

  return res.json();
}

/* ========================================
   Conversations API
   ======================================== */

/** Create a new conversation */
export async function createConversation(
  mode: "regular" | "zero_to_one" = "regular",
  spaceId?: string,
): Promise<Conversation> {
  return apiFetch("/conversations", {
    method: "POST",
    body: JSON.stringify({ mode, space_id: spaceId }),
  });
}

/** List all conversations, optionally filtered by space */
export async function listConversations(
  spaceId?: string,
): Promise<Conversation[]> {
  const params = spaceId ? `?space_id=${spaceId}` : "";
  return apiFetch(`/conversations${params}`);
}

/** Get a single conversation by ID */
export async function getConversation(id: string): Promise<Conversation> {
  return apiFetch(`/conversations/${id}`);
}

/** Update a conversation (rename, move to space) */
export async function updateConversation(
  id: string,
  updates: { title?: string; space_id?: string | null },
): Promise<Conversation> {
  return apiFetch(`/conversations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

/** Delete a conversation and all its messages */
export async function deleteConversation(id: string): Promise<void> {
  await apiFetch(`/conversations/${id}`, { method: "DELETE" });
}

/** Search across all conversations */
export async function searchConversations(
  query: string,
  limit = 20,
): Promise<{ conversation_id: string; conversation_title: string; snippet: string }[]> {
  return apiFetch("/conversations/search", {
    method: "POST",
    body: JSON.stringify({ query, limit }),
  });
}

/* ========================================
   Messages API
   ======================================== */

/** Get all messages for a conversation */
export async function getMessages(conversationId: string): Promise<Message[]> {
  return apiFetch(`/chat/${conversationId}/messages`);
}

/* ========================================
   Chat Streaming (SSE)
   ======================================== */

/**
 * Parsed SSE payload (`data: {...}\\n\\n` from FastAPI).
 *
 * Chat stream (`/api/chat/stream`): `chunk`, then `done` with `message_id`;
 * optional `title` after the first exchange.
 *
 * Coach (`/api/coach/respond`): `chunk`, then `done` with `coach_message_id`
 * and `refined_prompt` (nullable).
 *
 * Workshop (`/api/coach/workshop`): same chunks; `done` adds `workshop_ready`;
 * optional `title` on the first workshop turn.
 *
 * All three emit `error` with `message` on failure. See `docs/ARCHITECTURE.md`.
 */
export interface SSEEvent {
  type: "chunk" | "done" | "error" | "title";
  content?: string;
  message_id?: string;
  coach_message_id?: string;
  workshop_ready?: boolean;
  refined_prompt?: string | null;
  message?: string;
  title?: string;
}

/**
 * Stream a chat response via SSE (Server-Sent Events).
 *
 * Usage:
 *   for await (const event of streamChat(convoId, message)) {
 *     if (event.type === "chunk") appendToUI(event.content);
 *     if (event.type === "done") markComplete();
 *   }
 */
export async function* streamChat(
  conversationId: string,
  message: string,
): AsyncGenerator<SSEEvent> {
  const res = await fetch(`${API_BASE}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversation_id: conversationId, message }),
  });

  if (!res.ok || !res.body) {
    throw new Error("Failed to start chat stream");
  }

  /* Parse SSE stream from the response body */
  yield* parseSSEStream(res.body);
}

/**
 * Stream a coaching response from The Commentator via SSE.
 * Used in Regular Mode for real-time coaching.
 */
export async function* streamCoach(
  conversationId: string,
  message: string,
  coachType: "auto" | "manual" = "manual",
): AsyncGenerator<SSEEvent> {
  const res = await fetch(`${API_BASE}/coach/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversation_id: conversationId,
      message,
      coach_type: coachType,
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error("Failed to start coach stream");
  }

  yield* parseSSEStream(res.body);
}

/**
 * Stream a workshop (0-to-1) response from The Commentator via SSE.
 * Returns events including a `workshop_ready` flag when the prompt is refined.
 */
export async function* streamWorkshop(
  conversationId: string,
  message: string,
): AsyncGenerator<SSEEvent> {
  const res = await fetch(`${API_BASE}/coach/workshop`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversation_id: conversationId,
      message,
      coach_type: "workshop",
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error("Failed to start workshop stream");
  }

  yield* parseSSEStream(res.body);
}

/* ========================================
   SSE Stream Parser
   ======================================== */

/**
 * Parse a ReadableStream of SSE data into typed events.
 *
 * The backend sends events in the format:
 *   data: {"type": "chunk", "content": "Hello"}\n\n
 *
 * This generator yields parsed SSEEvent objects.
 */
async function* parseSSEStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<SSEEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      /* Append decoded chunk to buffer */
      buffer += decoder.decode(value, { stream: true });

      /* Split on double newline (SSE event boundary) */
      const events = buffer.split("\n\n");
      /* Keep the last incomplete chunk in the buffer */
      buffer = events.pop() || "";

      for (const event of events) {
        /* Extract the data payload from "data: {...}" */
        const dataLine = event
          .split("\n")
          .find((line) => line.startsWith("data: "));

        if (dataLine) {
          const json = dataLine.slice(6); /* Remove "data: " prefix */
          try {
            yield JSON.parse(json) as SSEEvent;
          } catch {
            /* Skip malformed events */
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/* ========================================
   Spaces API
   ======================================== */

/** Create a new space */
export async function createSpace(name: string): Promise<Space> {
  return apiFetch("/spaces", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

/** List all spaces for the current user */
export async function listSpaces(): Promise<Space[]> {
  return apiFetch("/spaces");
}

/** Rename a space */
export async function updateSpace(
  id: string,
  name: string,
): Promise<Space> {
  return apiFetch(`/spaces/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

/** Delete a space (conversations are unlinked, not deleted) */
export async function deleteSpace(id: string): Promise<void> {
  await apiFetch(`/spaces/${id}`, { method: "DELETE" });
}

/* ========================================
   Coach Messages API
   ======================================== */

/** Get all coaching messages for a conversation */
export async function getCoachMessages(
  conversationId: string,
): Promise<CoachMessage[]> {
  return apiFetch(`/coach/${conversationId}/messages`);
}

/** Rate a coaching message (thumbs up/down) */
export async function rateCoaching(
  coachMessageId: string,
  rating: 1 | -1,
  feedback?: string,
): Promise<void> {
  await apiFetch("/coach/rate", {
    method: "POST",
    body: JSON.stringify({
      coach_message_id: coachMessageId,
      rating,
      feedback,
    }),
  });
}

/* ========================================
   Health Check
   ======================================== */

/** Check if the backend is running */
export async function healthCheck(): Promise<{ status: string }> {
  return apiFetch("/health");
}

/* ========================================
   Files API
   ======================================== */

/** Upload a file (PDF, DOCX, TXT) and attach it to a conversation */
export async function uploadFile(conversationId: string, file: File): Promise<FileInfo> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(
    `${API_BASE}/files/upload?conversation_id=${conversationId}`,
    { method: "POST", body: formData },
    // Note: do NOT set Content-Type; browser sets multipart boundary automatically
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `Upload error: ${res.status}`);
  }
  return res.json();
}
