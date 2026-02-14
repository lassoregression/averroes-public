# Averroes — Change How You Work with AI

Named after Ibn Rushd (12th-century philosopher known as "The Commentator"), Averroes is a dual-panel AI workspace where The Commentator watches, nudges, and coaches — a permanent co-pilot that makes every AI interaction better without burning credits.

## Core Concept

**Two separate LLM streams. One-way data flow. Cost-efficient by design.**

```
User input ──────────────────────────→ Main Chat (DeepSeek)
    │                                       │
    │ (observes)                    (observes response)
    ▼                                       ▼
Commentator (DeepSeek, separate call) ──→ Side Panel UI
    │
    └─ (0→1 only) places refined prompt into chat input, doesn't send
```

- **Main Chat**: Unaware of the commentator. Standard LLM conversation.
- **The Commentator**: Observes both user prompts and LLM responses. Judges the interaction. Never interacts with the main LLM directly.
- **Only one is "talking" at a time**: When commentator is active (engaged), main LLM is silent. When main LLM is active, commentator is dormant/nudging only.
- **Cost principle**: Commentator uses ZERO LLM calls in dormant/nudging states. Only Active (engaged) state costs credits. Nudges are heuristic-based.

## Two Modes

### Freestyle (Default — Light Mode)
The main chat works normally. Commentator sits in the side panel in a dormant "Watching..." state.

**Commentator States in Freestyle:**
1. **Dormant** — "Watching..." — Zero LLM calls. Always visible in side panel.
2. **Nudging** — Heuristic-triggered tips appear in the panel. No LLM calls. User can ignore or tap to engage.
3. **Active** — User explicitly engages commentator. LLM calls happen. Main chat pauses. Back-and-forth workshop. Refined prompt placed in chat input. Commentator returns to dormant.

**Nudges appear like a Twitch-style chat sidebar** — the commentator's observations scroll in the panel. Minimal, not overwhelming.

### 0→1 Mode (Dark Mode)
Per-exchange toggle. When activated:
1. Theme switches to **dark mode** as a visual cue that something different is happening
2. Commentator panel **opens wider, overlays the main conversation**
3. User's message goes to commentator, NOT main LLM
4. Back-and-forth workshop until prompt is refined
5. Refined prompt placed in chat input (not sent automatically)
6. User reviews/edits, sends to main LLM
7. Theme switches back to **light mode (Freestyle)**
8. Toggle disappears for this exchange — conversation continues in Freestyle
9. User can toggle 0→1 again for any future message if needed

**0→1 is per-exchange, NOT per-conversation.** After workshop completes, you're in Freestyle.

## Commentator Panel

**Always visible. Twitch-style sidebar. Apple liquid glass aesthetic.**

- Right side panel, always present
- Dormant state: Minimal, shows "Watching..." or similar
- Nudges scroll in like Twitch chat messages — brief, contextual, actionable
- User can click a nudge or type in the panel to activate full engagement
- In 0→1 mode: Panel expands/overlays, becomes primary interaction surface
- Same panel structure in both modes, just different accent colors

**Panel color by mode:**
- Freestyle: Blue/periwinkle (#6366f1) accents on solid blue panel background
- 0→1: Red/coral (#dc4a4a) accents on solid red panel background

## Nudge Heuristics Engine (Zero LLM Cost)

### Layer 1 — Task Type Detection
Regex/keyword matching to classify what the user is trying to do:
| Task Type | Keywords | Missing Dimensions to Check |
|---|---|---|
| Code | "write", "build", "function", "implement", "code" | Language? Framework? I/O spec? Edge cases? |
| Writing | "draft", "email", "blog", "essay", "write" | Audience? Tone? Length? Format? Purpose? |
| Analysis | "analyze", "compare", "review", "evaluate" | Criteria? Data source? Output format? |
| Creative | "story", "poem", "imagine", "creative" | Style? Constraints? Perspective? Length? |
| Research | "explain", "what is", "how does", "why" | Depth? Scope? Prior knowledge? Use case? |

### Layer 2 — Missing Dimension Scoring
Per task type, check for presence of key dimensions. Nudge is specific:
- "Code prompt without a language — which language are you targeting?"
- "Writing prompt with no audience — who's reading this?"
- "Analysis without criteria — what are you evaluating against?"

### Layer 3 — Anti-Pattern Detection
| Pattern | Nudge |
|---|---|
| "Can you help me with..." | "Skip pleasantries. State what you need — LLMs respond better to direct prompts." |
| Multiple requests in one prompt | "You're asking 3 different things. Split into focused prompts." |
| "Make it better" follow-up | "What specifically isn't working? Tone? Length? Accuracy?" |
| Circling same topic across messages | "You're circling. Step back and define the actual deliverable." |
| Very short prompt (< 10 words) | Task-type-specific suggestion for what to add |

### Layer 4 — Post-Response Analysis (Heuristic)
| Signal | Nudge |
|---|---|
| LLM response >800 words for <20 word prompt | "Long response = unfocused prompt. Adding constraints would tighten this." |
| LLM asks clarifying questions | "The AI had to guess. Your prompt was missing [dimension]." |
| LLM offers multiple approaches | "When AI offers options, the prompt didn't specify an approach." |
| LLM starts with filler ("I'd be happy to...") | Weak prompt detected — suggest being more direct |

### Layer 5 — Prompt Scoring (Composite 0-50)
- Specificity (0-10): Named entities, numbers, concrete details
- Context (0-10): Background info, prior attempts, "I'm working on..."
- Structure (0-10): Multi-sentence, lists, sections
- Constraints (0-10): "must", "should not", format, length limits
- Examples (0-10): Sample I/O, references

Score < 15 → nudge on weakest dimensions. Score 15-30 → light nudge on single weakest. Score > 30 → dormant.

### Commentator Context Window
Full conversation history (all user messages + all LLM responses) every time commentator is invoked for Active engagement.

## Visual Identity

- **Aesthetic**: Claude.ai meets Linear — scholarly, intellectual, precise
- **Freestyle mode**: Light theme. White/black dominant. **Blue/periwinkle (#6366f1)** accents. Solid blue commentator panel.
- **0→1 mode**: Dark theme. Dark background. **Red/coral (#dc4a4a)** accents. Solid red commentator panel.
- **Theme = mode indicator**: Freestyle = light mode + blue panel. 0→1 = dark mode + red panel. The color shift IS the UX cue.
- **Feel**: Like a tool built by someone who reads philosophy and ships software.
- **NOT** playful, NOT corporate. Serious and tasteful.

## Mode Toggle

- **Welcome screen**: Centered pill-shaped segmented control — `Freestyle | 0→1`
- **In conversation**: Toggle moves near the commentator panel
- **0→1 label**: Uses arrow → not word "to" (displayed as `0 → 1`)
- Welcome copy: "Change how you work with AI"
  - Freestyle subtitle: "Explore freely and brainstorm without limits"
  - 0→1 subtitle: "Switch to 0→1 mode for rapid, goal-driven execution"

## Design References

| Element | Reference | Notes |
|---|---|---|
| Overall feel | Claude.ai + Linear | Clean, precise. Freestyle = light + blue. 0→1 = dark + red. |
| Main chat streaming | ChatGPT | Token-by-token with blinking cursor |
| Commentator panel | Twitch sidebar | Scrolling observations, always visible, interactive |
| Panel aesthetic | Apple liquid glass | Frosted/translucent, minimal, premium feel |
| Sidebar | Arc browser | Spaces/projects, auto-suggest + manual creation |
| Typography | Linear | Sharp, professional, readable |
| Mode toggle | ChatGPT model selector | Pill-shaped segmented control |

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript | Industry standard, SSR, great DX |
| UI | Inline styles + minimal CSS | Direct control, no Tailwind v4 theme issues |
| Backend | FastAPI + Python 3.11+ | Async-native, great for streaming |
| Database | SQLite + FTS5 (via aiosqlite) | Zero infrastructure, full-text search |
| Auth | NextAuth.js v5 | GitHub OAuth + guest sessions |
| LLM | DeepSeek only (via OpenAI SDK) | Single provider, keep it simple |
| File parsing | pypdf + python-docx | PDF and DOCX support |
| Deployment | Vercel (frontend) + Railway (backend) | Free tiers, production-grade |

## Architecture

```
Frontend (Next.js) ──SSE──> Backend (FastAPI)
                                  │
                    ┌─────────────┼─────────────┐
                    │             │              │
              LLM Service   DB Repository   File Parser
              (DeepSeek)    (SQLite+FTS5)   (pypdf/docx)
```

- **Separation of concerns**: Frontend knows nothing about DeepSeek
- **Repository pattern**: DB access via repository class — swap SQLite for Postgres by changing one file
- **Service layer**: All LLM calls go through a service with retry, timeout, token counting
- **SSE for streaming**: Main chat streams token-by-token. Commentator uses SSE when in Active state.
- **Nudge engine runs client-side**: No backend calls for heuristic nudges

## Key Architectural Decisions

1. **Two separate LLM streams**: Main chat and commentator never share context or interact
2. **Commentator is observer-only**: Reads conversation, never writes to it
3. **Nudges are heuristic (zero cost)**: Only Active engagement triggers LLM calls
4. **0→1 is per-exchange**: Not a conversation mode — toggle on, workshop, send, toggle off
5. **Theme = mode indicator**: Dark = 0→1 active, Light = Freestyle. Visual cue, part of the UX.
6. **Database**: SQLite + FTS5, swap to Postgres later via repository pattern
7. **Streaming**: SSE for main chat and active commentator. REST for CRUD.

## Security Requirements

- All LLM output sanitized before rendering (no XSS via `nh3`)
- API keys in platform secrets only — NEVER in repo
- Input validation: Zod (frontend) + Pydantic (backend)
- Rate limiting on all API endpoints
- All DB queries scoped by user_id
- File upload limits: 10MB max, whitelist MIME types
- Output sanitization on all LLM responses

## Build Phases

### Phase 1: Foundation (scaffold, DB, config, dev environment) ✅
### Phase 2: Core Chat (SSE streaming, messages, conversation CRUD) ✅
### Phase 3: The Commentator — Nudge Engine + Side Panel
- Nudge heuristics engine (client-side)
- Commentator panel UI (Twitch-style, always visible)
- Dormant → Nudging → Active states
- Theme switching (Freestyle light / 0→1 dark)
- Mode toggle (centered → near panel)
### Phase 4: 0→1 Mode (workshop flow, panel overlay, prompt return)
### Phase 5: Sidebar (real conversation data, new conversation, navigation)
### Phase 6: File Handling (upload, parse, context injection)
### Phase 7: Spaces (auto-suggest, manual CRUD)
### Phase 8: Polish (auth, animations, responsive, loading states)
### Phase 9: Demo-Ready (demo reset, example conversations, deploy)

## Immediate Next Steps (After Core is Functional)

### Apple-Style Guided Onboarding
Inspired by Apple's device setup flow — intentional, one screen at a time.

Flow:
1. "Change how you work with AI" — one sentence, show layout
2. "Meet The Commentator" — before/after prompt comparison
3. "Two modes" — interactive toggle with context
4. "Try it now" — guided first prompt with live commentator demo
5. Done — drop into app

Store `onboarding_complete` flag in session/DB.

## Future Roadmap (NOT in MVP)

- Prompt library/templates
- Coaching analytics dashboard
- Multi-model support
- Prompt versioning / A/B testing
- Conversation export (PDF/markdown)
- Active rating loop (ratings feed into commentator tuning)

## Conventions

- TypeScript strict mode in frontend
- Pydantic models for all API contracts
- Repository pattern for all database access
- Components organized by feature
- System prompts in backend/app/prompts/
- All API errors return structured JSON
- No `any` types in TypeScript
- Comments explaining every section of code
