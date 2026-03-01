# Averroes — Tried & Tested

A living record of decisions made, things attempted, observations from testing, and why things did or didn't work. Updated every session.

---

## What We Currently Have

### Architecture
- **Two LLM streams**: Main chat and commentator are completely separate. Main chat is unaware the commentator exists. Commentator observes both sides of the main conversation.
- **Models**: Both use `deepseek-chat` (DeepSeek V3) via OpenAI-compatible SDK.
- **Cost model**: 2 LLM calls per exchange (main chat + auto-commentator). Manual commentator engagement adds more calls but is user-initiated.
- **Database**: SQLite with 6 tables. `messages` = main chat. `coach_messages` = all commentator output (auto, manual, workshop). `ratings` = thumbs up/down (built, no UI yet).

### Commentator Context ("The Mind")
The commentator receives four distinct context blocks in its system prompt:
1. `<conversation_context>` — main chat history (last 8 messages)
2. `<workshop_context>` — 0→1 workshop exchange, if one ran
3. `<commentator_history>` — its own prior outputs this session (auto + manual, capped at 4 for auto calls, 10 for manual)
4. `<attached_files>` — uploaded docs (Phase 6, not yet built)

These are injected above the task instructions, not below — following Anthropic's long-context best practice (documents before query).

### Commentator Prompt Design
Built using Anthropic prompt engineering best practices (docs.anthropic.com):
- Role → Context → Task → Examples structure
- Three `<example>` blocks with `<bad_observation>`/`<good_observation>` contrast
- Instructions state what TO do, not what not to do
- WHY is embedded in rules (Claude generalises from reasoning)
- "Always output a refined prompt" mandate kept — even strong prompts can be sharpened and users who write well need to see the value

### Modes
- **Freestyle**: Light theme, blue panel. Normal main chat. Auto-commentator fires after every response. User can manually engage via "Talk to Commentator".
- **0→1**: Dark theme, red panel. Workshop phase first (2 exchanges, V3). After workshop completes, main chat works normally in dark theme. Commentator auto-fires post-workshop with full context.

---

## Tried & Tested Log

---

### Pre-response Nudge Cards (Removed)
**What it was**: Heuristic-triggered MISSING/TIP cards appearing in the commentator panel *before* the AI even responded.
**What we observed**: Felt broken and template-y. Cards appeared with generic advice before there was any response to react to. Felt like a bot checklist, not a coach.
**Decision**: Removed from Freestyle. Heuristic nudge engine (`lib/nudge-engine.ts`) kept in codebase but not called. Replaced with shimmer from the moment the user sends — commentator starts "pondering" immediately.
**Why it didn't work**: Zero-context cards before a response have no diagnostic value. The commentator's value is reacting to what actually happened, not speculating before it does.

---

### Commentator Prompt v1 — "Sharp Intellectual Peer"
**What it was**: Commentator framed as a curious, opinionated friend. "Be direct. Say what you actually think. If the AI gave a lazy answer, call it out." Always output a refined prompt.
**What we observed** (from live test):
- Observation was long, preachy, and moralistic about the *topic* rather than the *prompt*
- Refined prompt completely redirected the user's topic to what the commentator thought they *should* have asked
- Example: user asked for a blog post about AI → commentator delivered a 150-word brief for a completely different, opinionated article the user never requested
- "We cannot decide things for the user" — core failure
**Decision**: Rewritten.
**Why it didn't work**: The "say what you actually think" + "always output a refined prompt" combination pushed the model to invent a better topic rather than sharpen the user's own direction. No guardrail on staying in the user's lane. No examples to show the model what good/bad looks like.

---

### DeepSeek R1 (deepseek-reasoner) for Commentator
**What it was**: Switched the commentator from V3 (`deepseek-chat`) to R1 (`deepseek-reasoner`) to give it genuine chain-of-thought reasoning across multiple context streams.
**The reasoning**: Commentator has to synthesise main chat history, workshop history, and its own prior outputs — a multi-context reasoning job that R1 is designed for.
**What we observed** (from live test):
- Severe latency: R1 has a "thinking" phase before the first output token. With a full context window, this was noticeably slow — user saw nothing for many seconds.
- Observations were longer and more over-engineered. The reasoning amplified the existing prompt problem rather than solving it.
- Thinking tokens are billed but hidden from the user — cost increase with no visible benefit.
**Decision**: Reverted to V3. The problem was the *prompt*, not the model's reasoning capability. Fixing the prompt is the right lever — V3 follows well-structured, example-driven prompts reliably and responds fast.
**Why it didn't work**: Latency is a UX killer for a feature that fires after every exchange. R1's reasoning helped it arrive at more confident bad conclusions. The core issue (prompt taking the user's topic in a new direction) was a *prompt design* problem, not a *reasoning capability* problem.
**What stayed**: The `model` parameter was added to `stream_chat()` and `chat()` in `llm.py`, and `coach_model` config setting was added. Infrastructure is there if R1 is ever the right tool for a specific use case.

---

### Commentator Context Bug — Post-Workshop Hallucination
**What it was**: After 0→1 workshop completes, user engages commentator manually. Backend fetched only `messages` table (main chat) for context — which is empty at that point. Model had no context, hallucinated, and regurgitated its own system prompt including `---PROMPT---`/`---END---` delimiters. Frontend parser read those as a real refined prompt and showed a spurious card.
**Fix**: Two changes:
1. Removed the literal delimiter example from `COMMENTATOR_SYSTEM_PROMPT` instructions (replaced with prose description so it can't be echoed back as a signal)
2. `coach_respond()` now also fetches workshop history from `coach_messages` (filtered to `coach_type="workshop"`) and passes it to `build_coach_prompt()` as `<workshop_context>`
**Why it happened**: The workshop exchange lives in `coach_messages`, not `messages`. The endpoint only looked at `messages`, which was empty pre-first-chat. Empty context = model fills the void with whatever it knows, including its own formatting instructions.

---

### Duplicate "REFINED PROMPT" Label in Panel (Fixed)
**What it was**: The model outputs `REFINED PROMPT` as a text label before the `---PROMPT---` delimiters in its response. The frontend extracted the delimiters into the prompt card correctly, but the label text remained in the commentary and was rendered as bold text by markdown — appearing twice: once in the observation bubble, once as the card header.
**Fix**: One line in `commentator-panel.tsx` — after stripping the delimiter block from commentary, also strip any trailing `REFINED PROMPT` label (plain, `**bold**`, or any case) with a regex. Commentary now ends cleanly where the card begins.
**Why it happened**: The system prompt uses `REFINED PROMPT` as a section header in the task description. The model echoes that structure in its output. The frontend only stripped the delimited content, not the label that preceded it.

---

### Commentator Prompt v2 — Coaching-Focused with Examples (Current)
**What it is**: Rebuilt using Anthropic prompt engineering best practices. Context blocks above task instructions. Three `<example>` tags with explicit bad/good contrast. Task framed positively. WHY embedded.
**Key design decisions**:
- "Focus on the prompt, not the topic" — prevents topic-judging
- "This is coaching: the user should finish reading knowing exactly where their prompt fell short" — gives the model a reader-outcome goal, not just a format rule
- "Length scales with need" — replaces word caps (LLMs can't count reliably; caps kill quality on complex prompts)
- Kept "always output a refined prompt" — even strong prompts benefit from sharpening, and users who already prompt well need to see the product's value or they won't return
- Refined prompt must preserve "their topic, their direction, their intent" — explicit positive framing
**Status**: Implemented. Not yet live-tested.

---
