# Averroes — Pickup File

Last session: 2026-02-13

## Current State

### What's Working
- **Phase 1 (Foundation)**: Complete — Next.js 15 + FastAPI scaffold, SQLite + FTS5, config
- **Phase 2 (Core Chat)**: Complete — SSE streaming, conversation CRUD, message rendering
- **Phase 3 (The Commentator)**: ~85% complete — nudge engine wired, panel redesigned, coaching stream works

### What Was Done This Session
1. **Created `commentator-context.tsx`** — shared state bridge between ChatPanel (page) and CommentatorPanel (layout). Manages nudges, active coaching messages, streaming, conversation ID sync, and "use refined prompt" flow.
2. **Wired nudge engine into ChatPanel** — `analyzePrompt()` runs before every send, `analyzeResponse()` runs after streaming completes. Post-response nudges replace pre-prompt nudges.
3. **Wired CommentatorPanel to context** — consumes nudges, active messages, streaming state from context. "Talk to The Commentator" triggers coaching via `/api/coach/respond` SSE endpoint. "Use in chat" button injects refined prompt into main chat input via imperative ref.
4. **ChatInput now supports `forwardRef`** with `setInput()` imperative handle for prompt injection from commentator.
5. **Redesigned CommentatorPanel** — solid colored bg (blue Freestyle, red 0→1), white text, "Observing Mode" badge, X close button, clean dormant text.
6. **Fixed bottom buttons** — "Show The Commentator" only appears below input when panel is closed. Panel has X to close. No duplication.
7. **Added markdown rendering** via `react-markdown` in assistant messages.
8. **Switched font to Geist** (Sans + Mono) from the `geist` npm package.
9. **Overhauled theme colors** to match reference designs:
   - Freestyle: `#fafafa` bg, `#6366f1` blue/periwinkle accents, solid blue panel
   - 0→1: `#0f1419` dark charcoal bg, `#dc4a4a` red/coral accents, solid red panel
   - 0→1 IS dark mode — no separate toggle
10. **Nudge engine improvements** — dynamic cap scaling with prompt length, task-specific nudges prioritized over generic scoring ones.

## Important Note

**The previous version (before this session's visual overhaul) functioned better.** The core chat, streaming, nudge display, and commentator interaction all worked more reliably. This session focused on matching reference design aesthetics (colors, panel redesign, font, markdown rendering) which introduced regressions in functionality. The visual changes may have broken some working behavior — prioritize restoring full functionality before further polish.

## Known Issues / Next Steps

### Bugs to Fix (Regressions from Visual Overhaul)
1. **Nudge relevance** — Nudges still feel generic/unrelated to the actual prompt content. The heuristic engine detects task type and missing dimensions but the nudge TEXT is about prompt structure, not the topic. Consider:
   - Making nudge text reference the detected task type more explicitly (e.g., "Your cricket question could specify: which era? which metric — wins, tactics, leadership style?")
   - Or accept that pre-prompt nudges are structural (that's their nature — zero LLM cost) and only rely on post-response nudges for content-relevance
   - Post-response nudges DO reference the actual exchange ("Long response for short prompt", "AI offered multiple approaches") but may not be triggering in all cases

2. **Markdown rendering incomplete** — From the screenshot, some markdown (like `###` headers or `**bold**`) may still render as raw text. Possible causes:
   - ReactMarkdown might not handle streaming content well (content updates character by character during streaming, which can break markdown parsing mid-token)
   - Fix: Only render through ReactMarkdown when `isStreaming` is false, use plain `whiteSpace: pre-wrap` during streaming, then switch to rendered markdown once done
   - Check if `react-markdown` needs `remarkGfm` plugin for full GitHub-flavored markdown support (`npm install remark-gfm`)

3. **Mode toggle UI** — The Freestyle ↔ 0→1 toggle exists on the welcome screen but needs to be accessible during conversation (near the panel or in the header area per CLAUDE.md spec).

### Phase 3 Remaining Work
- Nudge click → active coaching flow needs more testing
- Post-response nudge relevance needs improvement
- Consider: when user clicks a nudge, should it pre-fill the commentator input with a question about their prompt, or send the nudge text to the commentator as context?

### Phase 4 (0→1 Workshop Mode) — Not Started
- When mode is `zero_to_one`, user input should go to `/api/coach/workshop` NOT `/api/chat/stream`
- Back-and-forth workshop until `[WORKSHOP_READY]` signal
- Refined prompt returned to chat input, mode switches back to Freestyle
- Toggle is per-exchange, not per-conversation
- Backend endpoints exist and work (`/api/coach/workshop`, `/api/coach/workshop/send`)
- Frontend `streamWorkshop()` API client exists in `lib/api.ts`
- ChatPanel `handleSend` needs a mode check to route to workshop flow

### Phase 5+ (Not Started)
- Sidebar: Wire to real conversation list from `/api/conversations/`
- File handling: Upload + parse endpoints exist
- Spaces: Backend CRUD exists
- Auth: Currently hardcoded `demo-user`
- Polish: Animations, responsive, loading states

## Key Architecture

```
Layout (app/(app)/layout.tsx)
  └─ ThemeProvider (mode, theme colors, commentator state)
     └─ CommentatorProvider (nudges, coaching messages, streaming)
        └─ AppShell
           ├─ Sidebar
           ├─ <main> → ChatPanel (page-level)
           │   └─ ChatInput (forwardRef with setInput)
           └─ CommentatorPanel (consumes from context)
```

**Data flow:**
- ChatPanel calls `runPromptAnalysis()` → nudges appear in CommentatorPanel
- ChatPanel calls `runResponseAnalysis()` → post-response nudges replace pre-prompt ones
- User clicks nudge or "Talk to Commentator" → `sendToCommentator()` → streams from `/api/coach/respond`
- Commentator says something useful → user clicks "Use in chat" → `setRefinedPrompt()` → ChatInput receives it via imperative ref

## File Map (Key Files)

### Frontend
- `app/layout.tsx` — Root layout, Geist font setup
- `app/(app)/layout.tsx` — App shell: ThemeProvider > CommentatorProvider > Sidebar + main + Panel
- `app/(app)/page.tsx` — New conversation (ChatPanel with null ID)
- `app/(app)/c/[id]/page.tsx` — Existing conversation
- `components/chat/chat-panel.tsx` — Main chat, SSE streaming, nudge analysis calls
- `components/chat/chat-input.tsx` — Input with forwardRef, show/hide commentator toggle
- `components/chat/message-bubble.tsx` — Message rendering with react-markdown
- `components/chat/welcome-screen.tsx` — Welcome + mode toggle
- `components/commentator/commentator-panel.tsx` — Redesigned panel, solid bg, white text
- `components/sidebar/sidebar.tsx` — Navigation sidebar
- `lib/theme-context.tsx` — Mode, theme colors, commentator state
- `lib/commentator-context.tsx` — Nudges, coaching messages, streaming, refined prompt
- `lib/nudge-engine.ts` — 6-layer heuristic engine (zero LLM cost)
- `lib/api.ts` — All API clients including streamChat, streamCoach, streamWorkshop
- `app/globals.css` — Geist font, animations, markdown styles

### Backend
- `app/main.py` — FastAPI setup
- `app/routers/chat.py` — Main chat SSE endpoint
- `app/routers/coach.py` — Commentator coaching + workshop endpoints (working)
- `app/routers/conversations.py` — Conversation CRUD
- `app/prompts/coach.py` — System prompts for commentator + workshop
- `app/services/llm.py` — DeepSeek streaming
- `app/repositories/conversation.py` — DB access
- `app/models/schemas.py` — Pydantic models

## Design System Reference

### Colors
- **Freestyle**: bg `#fafafa`, accent `#6366f1` (blue/periwinkle), panel bg solid `#6366f1`
- **0→1**: bg `#0f1419` (dark charcoal), accent `#dc4a4a` (red/coral), panel bg solid `#dc4a4a`
- Panel text: always white
- Nudge cards: `rgba(255,255,255,0.1)` bg on colored panel

### Typography
- Font: Geist Sans (body) + Geist Mono (code)
- Sizes: 13-15px UI, 14px content
- Letter-spacing: -0.01em body, -0.02em headings

### Radii
- Input: 22px
- Message bubbles: 20px
- Buttons: 12-16px
- Nudge cards: 12px

### Animations
- Fade-in: `cubic-bezier(0.16, 1, 0.3, 1)`, 250ms
- Theme transitions: 400ms ease

## Design Brief from Previous Claude Session (Raw Material)

This was provided as reference — take what's useful, not everything.

```
## Visual Style
- Aesthetic: Apple-inspired, production-ready, premium feel
- Typography: Inter font family, tight tracking, precise spacing (we switched to Geist)
- Design Principles: Glassmorphism, subtle shadows, refined color palettes
- Spacing: Compact, breathable spacing (60-80% of default sizes)

## Freestyle Mode (Light)
- Background: #fafafa with subtle blue gradient overlay
- Primary: Blue gradients (from-blue-500 to-blue-600)
- Text: Gray-900 for primary, Gray-500 for secondary
- Surfaces: White with backdrop-blur, border-gray-200

## 0→1 Mode (Dark)
- Background: #0f1419 with gray gradient overlay
- Primary: Gray gradients (from-gray-700 to-gray-800)
- Text: White for primary, Gray-400 for secondary
- Surfaces: White/5 opacity with backdrop-blur, border-white/10

## Animation Specs
- Easing: cubic-bezier(0.16, 1, 0.3, 1) for smooth transitions
- Spring Physics: stiffness: 400-450, damping: 32-35, mass: 0.7-0.8
- Durations: 200-300ms for micro-interactions, 500-700ms for mode changes
- Scale Effects: 1.02-1.05 on hover, 0.95-0.98 on press

## Component Patterns
- Rounded corners: 20-24px for inputs, 28-32px for messages
- Shadows: Layered with color-matched glows (blue/20, black/10)
- Borders: Semi-transparent (white/10, gray-200/60)
- Padding: 12-20px (reduced from typical 16-24px)
- Font sizes: 13-15px for UI, 14px for content

## Code Patterns
// Glassmorphism
className="bg-white/80 backdrop-blur-xl border border-gray-200/60 shadow-sm shadow-black/5"

// Gradient buttons
className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md shadow-blue-500/25"

// Icons: lucide-react, strokeWidth: 2.5, size w-3.5 to w-5
```

Note: The project uses inline styles (not Tailwind classes) so these class-based patterns need translation. The `motion/react` package is NOT installed — consider adding it for spring animations if polish pass happens.

## Running the Project

```bash
# Backend
cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend && npm run dev
```

Frontend: http://localhost:3000
Backend: http://localhost:8000
API proxy: Next.js rewrites `/api/*` → `localhost:8000/api/*`
