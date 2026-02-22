# Averroes — Product Requirements Document

**Last updated**: 2026-02-21
**Status**: Living document — updated as product evolves

---

## 1. Vision

Averroes is an AI workspace with a built-in coaching layer. Every AI chat app gives you a conversation. Averroes gives you a conversation **and** an observer — The Commentator — who watches, nudges, and coaches you to get better results from AI, in real time.

The thesis: **the quality of AI output is gated by the quality of human input.** Most people don't know what to ask, how to ask it, or what they're missing. Prompt engineering tools exist, but they're separate apps — copy your prompt, paste it into a tool, get suggestions, copy back. Averroes eliminates that friction by embedding coaching directly into the conversation flow.

**One sentence**: ChatGPT with a built-in coach that makes everyone — from first-time users to daily power users — measurably better at working with AI.

---

## 2. Problem Statement

### The gap between AI capability and human utilization

AI models are dramatically more capable than how most people use them. The problem isn't the model — it's the prompt. Studies show:

- Most users write vague, underspecified prompts
- The same user gets 2-10x better results with minimal prompt refinement
- Users don't know what they don't know — they can't see their own blind spots
- "Prompt engineering" is a skill most people don't have time to learn separately

### Why existing solutions fail

| Solution | Problem |
|---|---|
| **Prompt libraries** (PromptBase, FlowGPT) | Static templates. Don't adapt to your specific situation. Copy-paste workflow. |
| **Prompt optimizers** (PromptPerfect) | Separate tool. Extra step. Users forget to use it. |
| **Courses / guides** | Learning doesn't happen at the point of action. Knowledge decays. |
| **ChatGPT's "suggestions"** | Self-serving — the model suggests what's easy for it, not what's best for you. |
| **System prompts / custom instructions** | One-size-fits-all. Don't adapt per-message. |

### Averroes's insight

Coaching works best when it's:
1. **Integrated** — embedded in the workflow, not a separate step
2. **Real-time** — happens at the point of action, not before or after
3. **Observer-based** — a separate perspective, not the model coaching itself
4. **Cost-efficient** — most nudges should be free (heuristic), not burning API credits

---

## 3. Target Users

### Universal — from beginners to power users

Averroes is designed for **everyone who uses AI**, regardless of skill level:

| Segment | Pain Point | How Averroes Helps |
|---|---|---|
| **AI newcomers** | Don't know what to ask or how to phrase it | 0→1 Workshop guides them from vague idea to structured prompt |
| **Casual users** | Get "okay" results, don't know they could do better | Nudges reveal missed dimensions ("You didn't specify audience — who reads this?") |
| **Daily users** | Developed habits but have blind spots | Commentator catches patterns ("You're circling the same topic — define the deliverable") |
| **Power users** | Already good at prompting, want edge-case insights | Topic-specific observations — blind spots, assumptions, non-obvious angles |
| **Enterprise teams** | Uneven AI adoption, inconsistent output quality | Coaching layer raises the floor — everyone gets better, not just the prompt engineers |

### Key insight: coaching scales down to zero friction

- Beginners get active guidance (0→1 mode, workshops)
- Advanced users see passive nudges they can ignore
- The Commentator's intensity matches the user's need automatically

---

## 4. Core Product

### 4.1 The Two-Stream Architecture

```
User input ──────────────────────────→ Main Chat (LLM)
    │                                       │
    │ (observes)                    (observes response)
    ▼                                       ▼
Commentator (separate LLM call) ─────→ Side Panel UI
```

**Main Chat**: Standard AI conversation. Unaware of the Commentator.
**The Commentator**: Observes both user prompts and LLM responses. Never interacts with the main LLM directly. One-way data flow.

This separation is critical:
- The Commentator can be honest because it's not trying to be helpful to itself
- Main chat quality isn't degraded by coaching instructions in its context
- Cost is isolated — coaching costs scale independently of chat costs

### 4.2 Two Modes

#### Freestyle (Default — Light Mode + Blue Panel)
The main chat works normally. The Commentator sits in the side panel, observing.

**Commentator states:**
1. **Dormant** — "Watching..." — Zero LLM calls. Always visible.
2. **Nudging** — Heuristic-triggered tips appear. No LLM calls. User can ignore or engage.
3. **Active** — User engages commentator explicitly. LLM calls happen. Back-and-forth coaching.

**Best for**: Users who know what they want and just need occasional nudges.

#### 0→1 Mode (Dark Mode + Red Panel)
A structured workshop that takes a vague idea and refines it into a high-quality prompt before sending it to the main chat.

**Flow**:
1. User selects 0→1 on the welcome screen (path picker)
2. Theme shifts to dark mode — visual cue that this is different
3. User types their idea → routed to workshop (not main chat)
4. Workshop asks 2-3 clarifying questions
5. User answers → Workshop produces a refined prompt
6. Prompt card appears with "Use in chat" button
7. User reviews, edits if needed, sends to main chat
8. Main chat responds. Commentator auto-observes with topic-specific insights.
9. Mode persists — stays dark until user starts a new conversation

**Best for**: Beginners, complex tasks, or anytime you're not sure what you want.

### 4.3 Nudge Engine (Zero LLM Cost)

Five-layer heuristic system that runs client-side:

| Layer | What It Does | Cost |
|---|---|---|
| 1. Task Type Detection | Classifies prompt (code, writing, analysis, creative, research) | Zero |
| 2. Missing Dimension Scoring | Checks for missing context per task type | Zero |
| 3. Anti-Pattern Detection | Catches bad habits (pleasantries, multi-requests, vagueness) | Zero |
| 4. Post-Response Analysis | Analyzes LLM response signals (too long, asked questions, offered options) | Zero |
| 5. Composite Scoring (0-50) | Specificity + Context + Structure + Constraints + Examples | Zero |

Nudges appear in the Commentator panel like a Twitch-style chat sidebar — minimal, not overwhelming.

> **Current status**: The nudge engine is fully built (`frontend/lib/nudge-engine.ts`) but currently **not wired up** in Freestyle mode. We removed pre-response nudge cards because they felt template-y and appeared before the AI even responded. The LLM auto-commentator now handles all observations after each exchange.
>
> **Opportunity**: The heuristic engine is potentially better used as a *silent pre-filter* — instead of showing nudge cards to the user, use the composite prompt score internally to decide whether to trigger the commentator at all, or to adjust its tone. A score < 15 could prime the commentator to focus on the prompt's weaknesses before commenting on the topic. Score > 35 could signal the commentator to skip structural observations entirely and go straight to the intellectual reaction. This would make the engine invisible to the user but meaningful to the output quality — no clutter, more signal.

### 4.4 Commentator Panel

Always-visible right side panel. Adapts to mode:

- **Freestyle**: Compact. Shows nudges, "Talk to Commentator" button. Expands when engaged.
- **0→1**: Full-width overlay during workshop. Shows conversation-style input for back-and-forth.
- **After workshop**: Returns to normal width. Shows prompt card + auto-observations.

---

## 5. Current State (What's Built)

### Completed (Phases 1-5)

| Phase | What | Status |
|---|---|---|
| **Phase 1: Foundation** | Next.js 15 + FastAPI scaffold, SQLite + FTS5, config | DONE |
| **Phase 2: Core Chat** | SSE streaming, conversation CRUD, message rendering | DONE |
| **Phase 3: Commentator** | Nudge engine, panel UI, auto-commentator after every exchange | DONE |
| **Phase 4: 0→1 Workshop** | Workshop flow, persistent mode, manual "Use in chat", prompt cards | DONE |
| **Phase 5: Sidebar** | Real conversation data, navigation, delete, auto-titles | DONE |

### Architecture

```
Frontend (Next.js 15 + TypeScript) ──SSE──> Backend (FastAPI + Python 3.11+)
                                                  │
                                    ┌─────────────┼─────────────┐
                                    │             │              │
                              LLM Service   DB Repository   File Parser
                              (DeepSeek)    (SQLite+FTS5)   (future)
```

**Key design choices:**
- Repository pattern (swap SQLite → Postgres by changing one file)
- Nudge engine runs client-side (zero backend calls for heuristics)
- SSE for streaming (main chat + active commentator)
- Inline styles (Tailwind v4 theme variables didn't map correctly)
- Two DeepSeek calls per exchange (chat + commentator). Always generates.

### Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript |
| UI | Inline styles + minimal CSS |
| Backend | FastAPI + Python 3.11+ |
| Database | SQLite + FTS5 (via aiosqlite) |
| LLM | DeepSeek (via OpenAI SDK) |
| Deployment (planned) | Vercel (frontend) + Railway (backend) |

---

## 6. Roadmap

### Phase 6: File Handling
**Goal**: Users can upload documents as context for their conversations.

| Feature | Details |
|---|---|
| File upload UI | Drag-and-drop + click-to-upload in chat input area |
| Supported formats | PDF (pypdf), DOCX (python-docx), TXT, MD, CSV |
| Size limits | 10MB max per file, whitelist MIME types |
| Context injection | Parsed text injected into LLM context with clear delimiters |
| Commentator awareness | Commentator sees uploaded context and factors it into observations |
| Storage | Files stored in backend, referenced by conversation_id |

### Phase 7: Spaces
**Goal**: Organize conversations into workspaces (like Arc browser spaces or Slack channels).

| Feature | Details |
|---|---|
| Auto-suggest | System suggests grouping based on conversation topics |
| Manual CRUD | Create, rename, delete spaces |
| Space sidebar | Conversations grouped under spaces in the sidebar |
| Space-level context | Optional persistent context per space (e.g., "This space is for Python projects") |
| Default space | "General" space for ungrouped conversations |

### Phase 8: Polish & Auth
**Goal**: Production-quality UX and user accounts.

| Feature | Details |
|---|---|
| Authentication | NextAuth.js v5 — GitHub OAuth + email magic link + guest sessions |
| Onboarding | Apple-style guided flow (5 screens: intro → meet commentator → two modes → try it → done) |
| Animations | Smooth transitions between modes, panel expand/collapse, message appear |
| Responsive | Mobile-friendly layout (panel becomes bottom sheet on mobile) |
| Loading states | Skeleton screens, proper error boundaries |
| Keyboard shortcuts | Cmd+K command palette, Cmd+N new conversation, Cmd+/ toggle panel |
| Settings | Theme preference, commentator verbosity, default mode |

### Phase 9: Demo-Ready
**Goal**: Deployable, shareable, impressive demo.

| Feature | Details |
|---|---|
| Deployment | Vercel (frontend) + Railway (backend) |
| Demo mode | Pre-loaded example conversations showcasing both modes |
| Landing page | Marketing page explaining the concept (separate from app) |
| Analytics | Basic usage tracking (conversations created, modes used, nudges triggered) |
| Error handling | Graceful degradation when LLM is down or rate-limited |
| Performance | Optimize SSE connections, lazy-load sidebar conversations |

### Phase 10: Multi-Model Support
**Goal**: Users choose their LLM provider for main chat.

| Feature | Details |
|---|---|
| Provider selection | OpenAI, Anthropic, DeepSeek, Google, local (Ollama) |
| BYO API key | Users can input their own API keys |
| Model picker | Per-conversation or global default |
| Commentator model | TBD — either always cheapest or user-configurable |
| Provider abstraction | Backend service layer already designed for this (OpenAI SDK compatible) |

### Phase 11: Prompt Library & Templates
**Goal**: Save, share, and reuse refined prompts.

| Feature | Details |
|---|---|
| Save prompts | "Save this prompt" after workshop refinement |
| Personal library | Searchable list of saved prompts |
| Community templates | Curated prompt templates by task type |
| Quick-start | Select a template to pre-fill the chat or workshop |
| Version history | Track how a prompt evolved through iterations |

### Phase 12: Analytics & Insights
**Goal**: Help users see their improvement over time.

| Feature | Details |
|---|---|
| Prompt score trends | Track composite scores over time |
| Common patterns | "You frequently forget to specify audience" |
| Usage stats | Conversations, messages, modes used, nudges engaged |
| Commentator impact | Before/after comparison when workshop was used |
| Export | Download analytics as PDF or CSV |

---

## 7. Competitive Positioning

### The landscape

```
                    Integrated ←────────────────→ Separate Tool
                         │                              │
              Averroes ──┤                              ├── PromptPerfect
                         │                              ├── PromptBase
                         │                              ├── FlowGPT
                         │                              │
    Real-time coaching ──┤                              │
                         │                              │
                         │              Static templates ├── Prompt libraries
                         │                              ├── Awesome ChatGPT Prompts
```

### Why Averroes wins

| vs. | Averroes Advantage |
|---|---|
| **ChatGPT / Claude.ai** | They don't coach. They respond. Averroes adds a coaching layer that makes every interaction better. |
| **Prompt libraries** | Static. Don't adapt to your specific context, topic, or skill level. Averroes coaches in real-time. |
| **Prompt optimizers** | Separate workflow. Averroes is integrated — coaching happens inside the conversation, not outside it. |
| **Courses / guides** | Knowledge decays. Averroes coaches at the point of action, every time. Learning by doing. |
| **Custom instructions** | One-size-fits-all. Averroes adapts per-message based on what you're actually trying to do. |

### The moat

1. **Integration** — coaching inside the conversation is fundamentally better than a separate tool
2. **Zero-cost heuristics** — most coaching is free (client-side), making it viable at scale
3. **Observer architecture** — separate LLM stream means honest, unbiased coaching
4. **Progressive disclosure** — beginners get workshops, experts get nudges, same product

---

## 8. Distribution Strategy

### Dual model: Hosted SaaS + Open Source

| Channel | Details |
|---|---|
| **Hosted SaaS** | Primary. Users sign up, get instant access. Managed infrastructure. |
| **Open Source** | Self-host option via Docker. Full feature parity. Community contributions. |
| **Enterprise** | Hosted or on-prem. Team management, SSO, usage analytics, custom prompts. |

### Why open source matters
- Builds trust (users can inspect coaching logic)
- Community contributions to nudge heuristics
- Enterprise adoption (security teams want to review code)
- Developer ecosystem (custom commentator plugins, model integrations)

---

## 9. Monetization (TBD — Flexible Framework)

Monetization model is intentionally undecided. The architecture supports multiple approaches:

### Option A: Freemium SaaS
| Tier | What You Get |
|---|---|
| Free | X conversations/month, basic commentator, 1 model |
| Pro | Unlimited, all models, prompt library, analytics |
| Team | Multi-user, shared spaces, admin dashboard |

### Option B: BYO API Key
| Tier | What You Get |
|---|---|
| Free | Coaching layer is free, user provides their own LLM API keys |
| Pro | Managed API keys, prompt library, analytics, priority support |

### Option C: Open Core
| Tier | What You Get |
|---|---|
| Open Source | Full app, self-hosted, community support |
| Cloud | Managed hosting, backups, team features, SLA |
| Enterprise | On-prem, SSO, audit logs, dedicated support |

### Decision criteria (to be evaluated)
- User research on willingness to pay
- Cost per user at scale (LLM API costs)
- Competitive pricing landscape
- Enterprise demand signals

---

## 10. Design Principles

### Product principles
1. **Coaching, not blocking** — Commentator never prevents the user from doing what they want. Nudges are suggestions, not gates.
2. **Zero-cost by default** — Most coaching is heuristic (free). LLM calls only when the user explicitly engages.
3. **Progressive disclosure** — New users see more guidance. Power users see less. The product adapts.
4. **Observer integrity** — The Commentator is separate from the main LLM. It can be honest because it has no stake in the response.
5. **Speed over perfection** — A fast nudge that's 80% right is better than a slow analysis that's 99% right.

### Design principles
1. **Apple-quality aesthetics** — Linear + Claude.ai feel. Scholarly, intellectual, precise.
2. **Theme = mode** — Light/blue = Freestyle. Dark/red = 0→1. The color IS the UX cue.
3. **Less is more** — Panel shows what's relevant, hides what's not. No clutter.
4. **Motion with purpose** — Animations communicate state changes, not decoration.
5. **Typography first** — Content-heavy product. Readability is paramount.

### Technical principles
1. **Separation of concerns** — Frontend knows nothing about LLM providers.
2. **Repository pattern** — Swap databases by changing one file.
3. **SSE for streaming** — Real-time feel for both chat and commentator.
4. **Client-side heuristics** — Nudge engine runs in the browser. No network latency.
5. **Comments everywhere** — Every section of code is commented. Future contributors can understand intent.

---

## 11. Security & Privacy

| Concern | Approach |
|---|---|
| **LLM output sanitization** | All output sanitized via `nh3` before rendering (XSS prevention) |
| **API keys** | Platform secrets only. Never in repo. BYO keys encrypted at rest. |
| **Input validation** | Zod (frontend) + Pydantic (backend) on all inputs |
| **Rate limiting** | All API endpoints rate-limited |
| **Data scoping** | All DB queries scoped by user_id. No cross-user data leaks. |
| **File uploads** | 10MB max, MIME type whitelist, server-side validation |
| **Self-host privacy** | Open-source option means data never leaves user's infrastructure |
| **Conversation data** | Stored locally (SQLite). No third-party analytics on conversation content. |

---

## 12. Success Metrics

### North star
**Prompt quality improvement** — measurable increase in prompt scores over time for returning users.

### Leading indicators
| Metric | What It Measures |
|---|---|
| Nudge engagement rate | % of nudges users click/engage with (signals relevance) |
| Workshop completion rate | % of 0→1 sessions that produce a refined prompt |
| Return usage | % of users who come back within 7 days |
| Mode distribution | Freestyle vs 0→1 usage (signals user maturity) |
| Commentator conversation rate | % of sessions where user talks to commentator |

### Lagging indicators
| Metric | What It Measures |
|---|---|
| Prompt score trend | Average score improvement per user over time |
| Session depth | Messages per conversation (are people doing real work?) |
| Activation rate | % of signups who complete onboarding + first meaningful conversation |
| NPS / satisfaction | Would you recommend Averroes? |

---

## 13. Open Questions

These are decisions that need to be made as the product matures:

| Question | Context | When to Decide |
|---|---|---|
| Which LLM for commentator at scale? | DeepSeek is cheap but quality matters for coaching | Before multi-model launch |
| Conversation memory across sessions? | Should commentator remember user's patterns across conversations? | Phase 12 (Analytics) |
| Real-time collaboration? | Multiple users in one conversation with shared commentator? | Post-MVP, based on enterprise demand |
| Commentator personality customization? | Let users choose coaching style (strict, gentle, Socratic)? | Phase 8 (Settings) |
| Mobile-first or responsive? | Native app vs responsive web? | Based on usage data |
| Offline mode? | Local LLM (Ollama) for fully offline usage? | Phase 10 (Multi-model) |
| Plugin system? | Custom nudge rules, custom commentator behaviors? | Post-MVP, based on developer demand |

---

## 14. Development Process

### Branching & releases
- `main` — stable, deployable
- `dev` — active development
- Feature branches off `dev` for each phase/feature
- Merge to `main` only when phase is complete and tested

### Code conventions
- TypeScript strict mode (frontend)
- Pydantic models for all API contracts (backend)
- Repository pattern for all database access
- Components organized by feature (`components/chat/`, `components/commentator/`, etc.)
- System prompts in `backend/app/prompts/`
- All API errors return structured JSON
- No `any` types in TypeScript
- Comments explaining every section of code
- Inline styles preferred over Tailwind v4 theme variables

### Testing strategy
| Layer | Approach |
|---|---|
| Frontend components | Manual testing during development (automated tests in Phase 8) |
| Backend API | Manual testing via Swagger UI + curl (automated tests in Phase 8) |
| Nudge engine | Unit tests for heuristic rules |
| E2E flows | Manual walkthrough of both modes after each phase |
| LLM quality | Manual evaluation of commentator output relevance |

### Documentation
- `CLAUDE.md` — Architecture and conventions (for AI assistants)
- `PRD.md` — This document (product vision, roadmap, specs)
- `PICKUP.md` — Session-level change log (for resuming work)
- Code comments — Inline documentation in every file

---
