# Averroes — Pickup File

Last session: 2026-02-21

## Current State

### What's Working (Phase 1-5 COMPLETE)
- **Phase 1 (Foundation)**: Complete — Next.js 15 + FastAPI scaffold, SQLite + FTS5, config
- **Phase 2 (Core Chat)**: Complete — SSE streaming, conversation CRUD, message rendering with react-markdown
- **Phase 3 (The Commentator)**: Complete — nudge engine, panel UI, auto-commentator after every exchange, coaching stream
- **Phase 4 (0→1 Workshop)**: Complete — workshop back-and-forth, `[WORKSHOP_READY]` signal, refined prompt card, persistent 0→1 mode
- **Phase 5 (Sidebar)**: Complete — real conversation data, navigation, delete, titles, state clearing

### Last Changed (2026-02-21)

#### Commentator Panel — Shimmer from Send, No Pre-Response Nudges
1. **Removed all pre-response heuristic nudge cards** (MISSING, TIP, etc.) in Freestyle. They appeared before the AI even responded and felt broken/template-y.
2. **Shimmer shows from the moment user sends**: `signalPendingCommentary()` is called in `chat-panel.tsx` on send — sets `isPendingCommentary=true`, immediately shows "Pondering..." shimmer in the panel.
3. **Continuous shimmer**: `isPendingCommentary` covers the gap while main chat is streaming. Once `autoTriggerCommentator` fires (after main chat done), it clears `isPendingCommentary` and the streaming empty-message state picks up the shimmer until first token arrives.
4. **"Talk to Commentator" button fixed**: Added `isEngaged` local state. Button sets both `commentatorState="active"` AND `isEngaged=true`, which makes `showInput` true. Previously button clicked but input never appeared.
5. **`runPromptAnalysis` removed entirely** from context, interface, and `chat-panel.tsx`. The heuristic nudge engine is still in `lib/nudge-engine.ts` but not called in Freestyle.

#### Commentator Voice Rewrite
- `COMMENTATOR_SYSTEM_PROMPT` rewritten: sharp intellectual peer, thinks out loud, direct opinions, no hedging.
- Removed "choose ONE approach" rubric. Replaced with: react to the exchange honestly, say what you think.
- Natural length (short when there's not much, longer when genuinely interesting).
- No bullet/numbered list format, no "here's what I noticed" framing.

#### ⚠️ App Broken — Details Pending
User mentioned breaking the app during testing but the session ended before they could share the screenshots. **At the start of the next session, ask the user: "What did you break? You mentioned images — share them and we'll fix it."**

---

## 🗄️ Database Overview

SQLite with 6 tables — all schema defined in `backend/app/models/database.py`:

| Table | What it stores |
|---|---|
| `conversations` | Chat sessions — id, title, mode (regular/zero_to_one), user_id |
| `messages` | Every chat message — role (user/assistant/system), content, conversation_id |
| `coach_messages` | Every commentator response — coach_type (auto/manual/workshop), the response text, which user message triggered it. **Every auto-commentator response is already saved here with a `coach_message_id` sent in the SSE done event.** |
| `ratings` | Thumbs up/down on a coach_message — linked by `coach_message_id`. Table ready, backend endpoint exists. |
| `files` | Uploaded docs — extracted text, file type, size (Phase 6) |
| `spaces` | Project folders / workspaces (Phase 7) |

Plus FTS5 virtual tables on `conversations.title` and `messages.content` for full-text search.

---

## 🔜 Features to Discuss / Build Next

### ⭐ Rate Coaching (Priority)
**What**: Thumbs up / thumbs down on each commentator observation.
**Why it matters**: Closes the feedback loop — we can see which observations landed and which didn't. Data for improving the prompt over time.
**What's already built**:
- `ratings` table in DB — `coach_message_id`, `rating` (+1/-1), optional `feedback` text
- Backend endpoint: `POST /api/coach/rate` (in `backend/app/routers/coach.py`)
- Frontend API function: `rateCoaching()` in `frontend/lib/api.ts`
- The SSE stream already returns `coach_message_id` in the `done` event — we just need to store it and attach thumbs buttons
- ⚠️ Bug: the `/rate` endpoint has a TODO — `conversation_id=""` is hardcoded, needs to be resolved from the coach_message record. Fix this when building the UI.
**What's needed**: Thumbs up/down buttons on each commentator message bubble in the panel. Store the `coach_message_id` from the SSE done event and pass it on rating.

### 📋 Get Coach Messages (Discuss)
**What**: `GET /api/coach/{conversation_id}/messages` — fetches all commentator observations for a past conversation.
**Use cases to decide between**:
1. **History view**: When you open an old conversation, the panel could replay what The Commentator said at each step
2. **Analytics feed**: A separate "coaching history" view across all conversations
3. **Skip it for now**: The panel already shows the latest observation; past ones aren't accessible but the data is there if we want it later
**Status**: Backend endpoint fully built. Frontend `getCoachMessages()` in `api.ts` is ready. No UI yet. Need to decide if/how to surface this.

---

## 0→1 Workshop Flow (Current Design)

1. User switches to 0→1 mode (toggle on **welcome screen**)
2. Theme changes to dark mode + red panel
3. User types idea in **main chat input** → routes to `sendToWorkshop` (because `workshopComplete === false`)
4. Main area shows dimmed placeholder with shimmer text
5. **Exchange 1**: Workshop asks 2-3 clarifying questions
6. User answers in **commentator panel input** → routes to `sendToWorkshop`
7. **Exchange 2**: Workshop produces refined prompt with `[WORKSHOP_READY]` + delimiters
8. Prompt card appears with "Use in chat" button. `workshopComplete = true`. Panel shrinks back to normal width.
9. User clicks "Use in chat" → prompt injected into chat input. Mode stays 0→1.
10. User sends → main chat responds → commentator auto-observes

## Key Architecture

```
Layout (app/(app)/layout.tsx)
  └─ ThemeProvider (mode, theme colors, commentator state)
     └─ CommentatorProvider (nudges, coaching messages, streaming, workshop state)
        └─ AppShell
           ├─ Sidebar (conversation list, nav, delete)
           ├─ <main> → ChatPanel (page-level)
           │   └─ ChatInput (forwardRef with setInput)
           └─ CommentatorPanel (consumes from context)
```

**Data flow:**
- ChatPanel calls `signalPendingCommentary()` on send → `isPendingCommentary=true` → shimmer shows in panel
- ChatPanel calls `runResponseAnalysis()` → `autoTriggerCommentator()` → clears `isPendingCommentary` → streams commentator LLM response
- User clicks "Talk to Commentator" → `isEngaged=true` → input appears → `sendToCommentator()` → streams from `/api/coach/respond`
- In 0→1 mode (pre-workshop-complete), input routes to `sendToWorkshop()`
- Workshop produces refined prompt → stored in `workshopPrompt` → prompt card shown → user clicks "Use in chat" → `setRefinedPrompt()` → ChatInput receives it
- After workshop complete, messages go to main chat (`workshopComplete` flag)

## File Map (Key Files)

### Frontend
- `app/layout.tsx` — Root layout, Geist Sans/Mono font setup
- `app/(app)/layout.tsx` — App shell: ThemeProvider > CommentatorProvider > Sidebar + main + Panel
- `components/chat/chat-panel.tsx` — Main chat, workshop routing with `workshopComplete` check
- `components/chat/chat-input.tsx` — Claude.ai style input pill
- `components/chat/message-bubble.tsx` — Message rendering, ThinkingIndicator
- `components/chat/welcome-screen.tsx` — Mode toggle path picker + rotating shimmer subtitle
- `components/commentator/commentator-panel.tsx` — Panel UI, prompt cards, text conversation input
- `components/sidebar/sidebar.tsx` — Navigation with state clearing
- `lib/theme-context.tsx` — Mode, theme colors, commentator state
- `lib/commentator-context.tsx` — `workshopPrompt`, `workshopComplete`, `isPendingCommentary`, streaming
- `lib/nudge-engine.ts` — 6-layer heuristic engine (zero LLM cost, not called in Freestyle currently)
- `lib/api.ts` — All API clients

### Backend
- `app/prompts/coach.py` — Commentator (sharp peer voice) + Workshop system prompts
- `app/routers/coach.py` — Coaching + workshop endpoints
- `app/routers/chat.py` — Main chat SSE endpoint
- `app/services/llm.py` — DeepSeek streaming

## Running the Project

```bash
# Backend
cd /Users/jeeb/ccode/averroes/backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000

# Frontend
cd /Users/jeeb/ccode/averroes/frontend && npm run dev
```

Frontend: http://localhost:3000 | Backend: http://localhost:8000
