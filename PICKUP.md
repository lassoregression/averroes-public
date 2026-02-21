# Averroes — Pickup File

Last session: 2026-02-21

## Current State

### What's Working (Phase 1-5 COMPLETE)
- **Phase 1 (Foundation)**: Complete — Next.js 15 + FastAPI scaffold, SQLite + FTS5, config
- **Phase 2 (Core Chat)**: Complete — SSE streaming, conversation CRUD, message rendering with react-markdown
- **Phase 3 (The Commentator)**: Complete — nudge engine, panel UI, auto-commentator after every exchange, coaching stream
- **Phase 4 (0→1 Workshop)**: Complete — workshop back-and-forth, `[WORKSHOP_READY]` signal, refined prompt card, persistent 0→1 mode
- **Phase 5 (Sidebar)**: Complete — real conversation data, navigation, delete, titles, state clearing

### What Was Changed This Session (2026-02-21)

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

#### Session Before (2026-02-15)
### What Was Changed This Session (2026-02-15)

#### 0→1 Mode Redesign — Persistent Mode with User Control
1. **0→1 is now persistent**: Mode no longer auto-switches back to Freestyle after workshop completes. Dark theme stays.
2. **Manual "Use in chat"**: Workshop completion stores prompt in `workshopPrompt` state. User must click "Use in chat" on the prompt card to inject it into the chat input.
3. **Post-workshop main chat**: After clicking "Use in chat" and sending, messages go to normal main chat (routed via `workshopComplete` flag). Commentator auto-observes after each response.
4. **Workshop messages preserved**: Panel keeps workshop messages visible after "Use in chat" — user can scroll back for context.
5. **Clean empty state**: After "Use in chat" with no messages yet, shows a clean hint instead of the full welcome screen.
6. **Panel shrinks back**: After workshop completes, panel returns to normal width (was staying at 380px overlay).

#### Mode Toggle — Welcome Screen Path Picker
- **Toggle on welcome screen**: Mode toggle (Freestyle | 0→1) is the path picker on the welcome screen. Once a mode is picked and the first prompt is sent, the toggle disappears. User starts a new conversation to pick a different path.
- **ConversationHeader deleted**: No toggle in header bar.
- **No toggle in panel**: Panel adapts to whatever mode was picked.
- **Welcome headline**: Changed to "Averroes" with rotating shimmer subtitle phrases per mode.

#### Commentator Panel Changes
- **0→1 input always visible**: In 0→1 mode, panel input is always shown (text conversation feel). No "Talk to Commentator" button needed.
- **Freestyle "Talk to Commentator" fixed**: Button now shows even after auto-commentator has posted observations (was hidden because state was "active").
- **Removed panel ThinkingIndicator**: The blinking sparkle+word indicator that appeared in the panel alongside nudge cards was removed — commentary text appears naturally as it streams.

#### Commentator Prompt Upgraded
- System prompt rewritten to be a **thought partner**, not a teacher.
- Observations now focus on the actual topic: blind spots, assumptions, non-obvious insights.
- No more generic advice like "add more context" or "be more specific."

### Previous Session Changes (2026-02-14)
- 0→1 Workshop: 3 critical bugs fixed (panel routing, mode switching, sidebar state leaking)
- Font consistency: Geist Mono for code blocks
- UI/UX polish: Claude.ai-style input, thinking indicator, workshop placeholder, commentator markdown
- Workshop system prompt tightened (short questions only, no answering)
- Thinking indicator (pulsing dots → sparkle + rotating words)
- "New Conversation" button fixed
- Auto-commentator after every exchange (LLM call)
- Prompt cards with "Use in chat" button
- Cost model: 2 DeepSeek calls per exchange (chat + commentator)

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
- User clicks nudge or "Talk to Commentator" → `sendToCommentator()` → streams from `/api/coach/respond`
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
- `lib/commentator-context.tsx` — `workshopPrompt`, `workshopComplete`, nudges, streaming
- `lib/nudge-engine.ts` — 6-layer heuristic engine (zero LLM cost)
- `lib/api.ts` — All API clients

### Backend
- `app/prompts/coach.py` — Commentator (thought partner) + Workshop system prompts
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
