# Averroes — Pickup File

Last session: 2026-03-03

## Current State

### What's Working (Phase 1-5 COMPLETE)
- **Phase 1 (Foundation)**: Complete — Next.js 15 + FastAPI scaffold, SQLite + FTS5, config
- **Phase 2 (Core Chat)**: Complete — SSE streaming, conversation CRUD, message rendering with react-markdown
- **Phase 3 (The Commentator)**: Complete — nudge engine, panel UI, auto-commentator after every exchange, coaching stream
- **Phase 4 (0→1 Workshop)**: Complete — workshop back-and-forth, `[WORKSHOP_READY]` signal, refined prompt card, persistent 0→1 mode
- **Phase 5 (Sidebar)**: Complete — real conversation data, navigation, delete, titles, state clearing

### Last Changed (2026-03-03)

#### ngrok — Public Tunnel for Sharing the App
- **Added `ngrok.yml`** at project root — defines the `averroes` tunnel on port 3000. Frontend proxies API calls server-side, so only port 3000 needs tunneling.
- **Updated `docker-compose.yml`** — added `ngrok` service under the `tunnel` profile. Not started by default; opt-in with `--profile tunnel`.
- **Updated `.env.example`** — `NGROK_AUTHTOKEN` documented (required for Docker Compose tunnel profile).
- **Updated `.gitignore`** — `ngrok.local.yml` excluded (for local customisations that shouldn't be committed).
- **Updated `next.config.js`** — added `allowedDevOrigins` for `*.ngrok-free.app`, `*.ngrok-free.dev`, `*.ngrok.io`, `*.ngrok.app` to allow Next.js dev server to accept cross-origin requests from ngrok domains.

**To start with ngrok (local, not Docker):**
```bash
# One-time setup
ngrok config add-authtoken <your_token>

# Start everything
cd backend && uvicorn app.main:app --reload --port 8000   # terminal 1
cd frontend && npm run dev                                  # terminal 2
cd .. && ngrok start averroes --config "$HOME/Library/Application Support/ngrok/ngrok.yml" --config ngrok.yml  # terminal 3
```

#### Trailing-Slash 307 Redirect Fix — External Access via ngrok
- **Root cause**: Next.js 15 strips trailing slashes from paths before applying rewrites. Frontend called `/api/conversations/` → Next.js sent `/api/conversations` to FastAPI → FastAPI issued a `307 Temporary Redirect` to `http://localhost:8000/api/conversations/`. External browsers (via ngrok) can't reach `localhost:8000`, so the redirect failed silently. The bug didn't appear locally because local browsers *can* follow the redirect.
- **Fix (3 files)**:
  1. `backend/app/main.py` — `FastAPI(..., redirect_slashes=False)` — stops all 307 redirects.
  2. `backend/app/routers/conversations.py` — collection routes changed from `@router.post("/")` / `@router.get("/")` to `@router.post("")` / `@router.get("")` — accessible at `/api/conversations` (no trailing slash).
  3. `backend/app/routers/spaces.py` — same change as above for spaces.
  4. `frontend/lib/api.ts` — `/conversations/` → `/conversations` and `/spaces/` → `/spaces` in all collection calls.

#### Security Audit — No Issues Found
- Audited all backend routes for env var / API key leakage. No route serialises the `settings` object or exposes `.env` contents.
- `.gitignore` already excluded `.env` files.
- File uploads validate extension (whitelist) and size — no path traversal risk.
- FastAPI auto-docs (`/docs`, `/openapi.json`) are enabled — expose API schema but no credentials. Acceptable for dev prototype.

---

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

#### Duplicate "REFINED PROMPT" Label — FIXED (2026-03-01)
- **Issue**: Model outputs `REFINED PROMPT` as a text label before the `---PROMPT---` delimiters. Frontend strips the delimiter block into the card but left the label sitting in the commentary — showing it twice (once in bold text, once as the card header).
- **Fix**: `commentator-panel.tsx` — added `.replace(/\*{0,2}REFINED PROMPT\*{0,2}\s*$/i, "")` after stripping the delimiter block. Catches plain, bold (`**...**`), and any case variant. Commentary now ends cleanly before the card.

#### Commentator Full Context ("The Mind") — IMPLEMENTED (2026-03-01)
- **What changed**: Commentator now receives its own prior outputs as context, not just the main chat history.
- **`prompts/coach.py`**: Added `commentator_messages` param to `build_coach_prompt()`. New `_build_commentator_history()` helper formats prior auto + manual coach outputs as `<commentator_history>` XML block — distinct from `<conversation_context>` so the model knows its own voice vs. the main chat's.
- **`routers/coach.py`**: Fetches full coach history. Auto calls capped at last 4 entries (cost control — high frequency). Manual calls get last 10. Both `settings.coach_model` wired through.
- **`llm.py`**: `stream_chat()` and `chat()` accept optional `model` param (defaults to `settings.llm_model`) — infrastructure for per-call model override.
- **`config.py`**: `coach_model` setting added (currently `"deepseek-chat"` — was briefly `"deepseek-reasoner"`, reverted).

#### Commentator Prompt Rewrite + Model Revert — IMPLEMENTED (2026-03-01)
- **Model**: Reverted commentator back to `deepseek-chat` (V3). R1 caused severe latency (thinking phase before first token) and over-engineered observations. Timeout back to 30s.
- **`llm.py`**: `stream_chat()` and `chat()` retain optional `model` param — infrastructure stays, just defaulting to V3 for both.
- **`prompts/coach.py`**: Full rewrite of `COMMENTATOR_SYSTEM_PROMPT` based on Anthropic prompt engineering best practices:
  - Context blocks moved ABOVE task instructions (Anthropic long-context best practice — improves response quality up to 30%)
  - Three `<example>` tags with `<bad_observation>`/`<good_observation>` contrast — examples are the most reliable steering tool
  - Observation framed as coaching: name what was missing, explain the effect it had
  - Refined prompt mandate kept ("always output one") but reframed positively: "fill in what was genuinely absent, make implicit things explicit"
  - "Length scales with need" replaces any word cap
  - WHY embedded in instructions — Claude generalises from reasoning, not just rules
- **Full context history** (auto + manual commentator messages) still passes in via `{{COMMENTATOR_HISTORY}}`

#### Commentator Context Bug — FIXED (2026-02-28)
**Root cause**: After 0→1 workshop completes, panel input routes to `/api/coach/respond`. That endpoint fetched only main chat messages (`messages` table) — which are empty before the user sends the workshop prompt to main chat. Empty context → model hallucinated, regurgitated its own system prompt, including `---PROMPT---`/`---END---` delimiters → parser extracted the system prompt as a "refined prompt" card.

**Two fixes applied:**
1. `backend/app/prompts/coach.py` — Removed literal `---PROMPT---`/`---END---` example block from `COMMENTATOR_SYSTEM_PROMPT` instructions (replaced with prose description). Added `workshop_messages` param to `build_coach_prompt()`. Added `_build_workshop_context()` helper that formats workshop exchange as `<workshop_context>` block.
2. `backend/app/routers/coach.py` — `coach_respond()` now fetches workshop history from `coach_message_repo` (filtered to `coach_type="workshop"`) and passes it to `build_coach_prompt()`.

**Result**: Post-workshop commentator engagement now has full context (workshop exchange visible) even before any main chat messages exist. Option B — commentator can discuss the workshop prompt.

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

# ngrok (optional — share publicly)
cd /Users/jeeb/ccode/averroes && ngrok start averroes --config "$HOME/Library/Application Support/ngrok/ngrok.yml" --config ngrok.yml
```

Frontend: http://localhost:3000 | Backend: http://localhost:8000 | ngrok inspector: http://localhost:4040
