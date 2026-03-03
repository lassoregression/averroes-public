# Averroes
## Product Requirements Document

**Version**: 2.0
**Last Updated**: March 2026
**Status**: Active Development
**Audience**: Executive and Product Stakeholders

---

## Executive Summary

Averroes is an AI workspace with a built-in coaching layer. Every enterprise that has deployed AI has discovered the same problem: model capability is not the bottleneck. Prompt quality is. The gap between what employees ask AI and what they could ask it represents hundreds of hours of lost productivity per team, per year.

Averroes closes that gap. Rather than requiring employees to take prompt engineering courses or consult separate tools, Averroes embeds a second AI layer directly inside the conversation. This layer, called The Commentator, observes every interaction and coaches users in real time. It is always present, never disruptive, and requires no behavior change to activate.

The result is a measurable lift in AI output quality across every skill level, from first-time users to daily power users, without any additional training overhead or workflow friction.

---

## 1. Problem

### The Utilization Gap

Organizations have invested heavily in AI access. What they have not solved is AI utilization. The challenge is not that employees lack access to AI tools. It is that most employees lack the skill to get consistent, high-quality results from them.

Research on large language model usage shows that the same prompt, with minor structural improvements, can yield outputs that are two to ten times more useful. The barrier is not technical. It is behavioral. Most users do not know what they are missing, because the AI responds to whatever it receives without indicating that a better question existed.

This creates three compounding problems for enterprises:

First, output quality is inconsistent across teams. Power users who have internalized prompt engineering get dramatically better results than their colleagues. This creates uneven adoption and uneven productivity gains, undermining the business case for AI investment.

Second, the skills gap does not self-correct. Employees who receive mediocre AI output do not know their prompt was the cause. They attribute the limitation to the model and disengage. The feedback loop that would normally teach them is absent.

Third, existing solutions require behavior change outside the workflow. Prompt libraries, optimization tools, and training programs all demand that employees stop what they are doing, consult an external resource, and return to their work. Adoption rates for these approaches are predictably low.

### Why This Matters at Enterprise Scale

At the individual level, the utilization gap is a minor inconvenience. At enterprise scale, it is a significant drag on AI ROI. An organization with ten thousand knowledge workers, each conducting an average of five AI interactions per day, is generating fifty thousand interactions daily. If sixty percent of those interactions are underspecified, the compounded productivity loss is material.

The solution cannot be "train everyone." It must be embedded in the tool itself.

---

## 2. Solution

### The Coaching Layer

Averroes adds a second AI stream to every conversation. This stream, The Commentator, operates independently of the main chat. It observes what the user asks, watches how the AI responds, and surfaces targeted coaching in a persistent side panel.

The architecture enforces a strict separation. The Commentator reads the conversation but never influences the main AI's context. The main AI is unaware the Commentator exists. This one-way data flow is intentional: it allows The Commentator to give honest, unbiased coaching because it has no stake in the AI's response.

Most of The Commentator's observations are generated without any AI call. A five-layer heuristic engine runs entirely in the browser, classifying the user's prompt by task type, scoring it across five dimensions, detecting anti-patterns, and analyzing response signals. Only when a user explicitly engages with The Commentator does an additional AI call occur. This design keeps the cost of coaching close to zero for the majority of interactions.

### Two Interaction Modes

Averroes ships with two distinct modes, each designed for a different user state.

**Freestyle** is the default. The main chat works exactly as users expect from any AI product. The Commentator operates in the background, surfacing brief observations in the side panel after each exchange. Users can ignore these entirely, or they can engage directly, opening a back-and-forth dialogue with The Commentator about how to improve their approach. The mode is designed for users who know what they want and benefit from a second opinion.

**0 to 1** is a structured workshop mode. Activating it signals that the user has a vague idea but is not yet ready to engage the main AI. The Commentator takes over the interaction, asks two to three clarifying questions, and returns a refined, well-structured prompt. The user reviews the prompt, edits it if needed, and sends it to the main chat. This mode is designed for beginners, for complex tasks, and for any situation where the user is not sure how to frame what they need. The workshop completes once, and the conversation continues normally afterward.

The mode is selected once, on the welcome screen, at the start of each conversation. There is no toggle during the conversation. The choice is intentional: different tasks require different approaches, and making the selection explicit encourages users to think about what they actually need before they start typing.

---

## 3. Target Users and Enterprise Fit

Averroes is designed to raise the floor across an entire organization, not to serve a narrow segment of power users.

**Knowledge workers with low AI confidence** receive active guidance through the 0 to 1 workshop. They never have to understand prompt engineering; the product handles it for them.

**Regular users with moderate AI fluency** receive passive nudges that surface what they are missing. "You did not specify audience" or "Your prompt asked three different things" is more actionable than any generic training material because it is specific to the work they are doing right now.

**Advanced users and prompt engineers** receive The Commentator's deeper observations: assumptions being made, non-obvious angles being missed, and cases where the AI's response signals a structural problem in the prompt. For users who already know what they are doing, The Commentator acts as a sparring partner rather than a tutor.

For enterprise buyers, the organizational argument is straightforward. A coaching layer that adapts to every skill level eliminates the need for tiered training programs. It raises the median quality of AI interactions across the entire workforce. And it does so without asking employees to change their workflow, download a new tool, or consult a separate system.

---

## 4. Product Architecture

### Two-Stream Design

```
User Input ───────────────────────────> Main Chat AI
     |                                       |
     | (observes)                  (observes response)
     v                                       v
The Commentator (separate AI call) ───> Side Panel
```

The main chat AI and The Commentator never share context. Each makes independent calls. The Commentator is an observer, not a participant.

### Heuristic Engine (Zero Cost)

The five-layer heuristic engine runs client-side in the browser. It classifies every prompt before the user sends it and analyzes every response the AI returns. Observations generated by this engine require no API call.

The layers are: task type classification (code, writing, analysis, creative, research), missing dimension scoring per task type, anti-pattern detection (pleasantries, compound requests, vague follow-ups), post-response signal analysis (AI response length relative to prompt length, clarifying questions from the AI, multiple-approach hedging), and composite prompt scoring across specificity, context, structure, constraints, and examples.

This engine is the foundation of the cost model. In a typical session, the majority of coaching is delivered free. AI calls are reserved for moments when a user explicitly engages.

### Current Technical Foundation

The prototype is a full-stack web application built on Next.js 15 (TypeScript) on the frontend and FastAPI (Python) on the backend, with a SQLite database and full-text search. The backend is structured with a repository pattern specifically to allow a clean migration to PostgreSQL or any enterprise database without application changes. Authentication, SSO integration, and on-premises deployment are on the roadmap and are architecturally supported.

---

## 5. Current State

Phases 1 through 5 are complete. The core product is functional and testable.

**Foundation (Phase 1):** Full-stack scaffold, database schema, configuration management, and development environment.

**Core Chat (Phase 2):** Real-time streaming conversation via Server-Sent Events, full conversation lifecycle (create, title, navigate, delete), and message rendering.

**The Commentator (Phase 3):** Heuristic nudge engine, side panel UI, and automatic commentary after every exchange. The Commentator generates a response after each main chat interaction, using the full conversation history and its own prior observations as context.

**0 to 1 Workshop (Phase 4):** The structured workshop flow, prompt refinement cards, persistent mode state, and the "Use in chat" handoff from workshop to main conversation.

**Sidebar and Navigation (Phase 5):** Conversation list, navigation, titles, and state management.

---

## 6. Roadmap

### Near Term

**File Context (Phase 6):** Users upload documents (PDF, DOCX, plain text) as context for their conversations. The Commentator is aware of the uploaded material and factors it into observations. Maximum file size is 10MB with server-side type validation.

**Spaces (Phase 7):** Conversations organized into workspaces, with optional persistent context per space. A "Legal review" space could carry standing instructions about tone and format that apply to every conversation within it. The system can auto-suggest groupings based on conversation topics.

**Authentication and Polish (Phase 8):** User accounts via GitHub OAuth and email magic link, an Apple-style guided onboarding flow, animations that communicate state rather than decorate it, keyboard shortcuts, responsive layout for mobile, and user settings for commentator verbosity and default mode.

**Deployment-Ready (Phase 9):** Production deployment on Vercel (frontend) and Railway (backend), a demo mode with pre-loaded example conversations, basic usage analytics, and graceful degradation when upstream AI services are unavailable.

### Medium Term

**Multi-Model Support (Phase 10):** Users select their AI provider for the main chat from OpenAI, Anthropic, Google, DeepSeek, or a local model via Ollama. Users may bring their own API keys. The Commentator model is configurable separately, allowing organizations to pin it to a specific provider for cost or compliance reasons.

**Prompt Library (Phase 11):** Refined prompts from workshops are saveable to a personal library, searchable, and reusable as quick-starts for future conversations. A curated set of organization-level templates can be managed by administrators.

**Analytics and Coaching Insights (Phase 12):** Prompt quality trends over time per user, pattern identification ("You frequently omit audience specification in writing tasks"), session depth metrics, and exportable reports for team leads. This phase represents the enterprise analytics offering and is likely gated behind a paid tier.

---

## 7. Competitive Positioning

The AI workspace market contains two categories of competing products. The first category is general-purpose AI chat products: ChatGPT, Claude.ai, Gemini. These products have strong model quality but no coaching layer. They respond to whatever they receive without helping users improve the quality of what they send.

The second category is prompt tooling: prompt libraries, prompt optimizers, and prompt engineering courses. These products address the right problem but solve it outside the workflow. They require users to stop their work, consult an external resource, and return. Adoption is low because the friction is high and the connection to the task at hand is abstract.

Averroes occupies a position neither category has claimed: a full AI workspace where coaching is integrated into the conversation, not adjacent to it. The coaching happens at the moment of action, is specific to the task in front of the user, and requires no behavior change to receive.

The architectural advantage that makes this defensible is the observer model. Because The Commentator is a separate stream with its own context, it can give honest feedback about what the user is actually doing rather than what the main AI would like to do. A model coaching itself will not tell the user that their prompt is weak, because doing so implies the response will be weak. A separate observer has no such conflict.

---

## 8. Enterprise Deployment Model

Averroes is designed to support three deployment patterns for enterprise buyers.

**Hosted SaaS** is the fastest path to adoption. Organizations provision access through an admin portal, and users sign in with existing credentials via SSO. No infrastructure work is required.

**Private cloud deployment** is available for organizations with data residency requirements. The application ships as a containerized stack and can be deployed into any cloud environment the organization already uses. Conversation data never leaves the organization's infrastructure.

**On-premises deployment** is the maximum-control option. The full application, including the AI model layer, can be operated on internal infrastructure using self-hosted or on-premises models. This option eliminates all external data dependencies and is appropriate for regulated industries or high-security environments.

Enterprise contracts include team management, SSO integration (SAML 2.0 and OIDC), audit logs, usage reporting by team, and the ability to configure organization-level defaults for commentator behavior and AI model selection.

---

## 9. Security and Privacy

Security requirements are embedded in the architecture rather than applied after the fact.

All AI output is sanitized before rendering to prevent cross-site scripting. API keys are stored as platform secrets and are never present in the codebase or configuration files. Input validation runs on both the frontend (TypeScript schema validation) and the backend (Pydantic models) for defense in depth. All API endpoints are rate-limited. All database queries are scoped to the authenticated user, with no cross-user data access possible. File uploads are validated server-side against a whitelist of permitted types and a hard size limit.

For organizations that deploy on-premises, conversation data never leaves their infrastructure by design. There are no third-party analytics or telemetry calls on conversation content.

The codebase is open source. Enterprise security teams can review the full application logic, coaching prompts, and data handling before deployment. This transparency is a deliberate design choice, not an afterthought.

---

## 10. Success Metrics

The primary measure of Averroes's value is prompt quality improvement over time. A user's composite prompt score, calculated by the heuristic engine across five dimensions, should trend upward as they continue using the product. This is the metric that demonstrates the coaching layer is working.

Supporting metrics include workshop completion rate (the percentage of 0 to 1 sessions that produce a refined prompt sent to main chat), commentator engagement rate (the percentage of sessions where a user responds to The Commentator rather than ignoring it), seven-day return rate (a proxy for whether users found the experience worth repeating), and session depth (average messages per conversation, which indicates whether users are doing substantive work rather than one-off queries).

For enterprise accounts, the relevant metrics shift toward team-level reporting: average prompt quality by team, distribution of mode usage across skill levels, coaching engagement rates by department, and prompt library adoption. These are the metrics that justify renewal and expansion.

---

## 11. Open Questions for Stakeholder Input

Several decisions are deferred pending stakeholder alignment and early usage data.

The monetization model is not yet determined. Three options are viable: freemium SaaS with a paid tier for analytics and library features, a bring-your-own-API-key model where the coaching layer is free and users pay only for AI usage, or an open-core model where self-hosted deployment is free and managed cloud hosting is paid. The right choice depends on enterprise buyer preferences and the cost structure of the AI layer at scale.

The question of cross-session memory is open. Should The Commentator remember patterns from previous conversations? ("You asked about audience specification three times last week.") This would significantly increase coaching quality for returning users but introduces data retention complexity.

Real-time collaboration is a medium-term question for enterprise use cases. Multiple users sharing a conversation with a shared Commentator view would support use cases like pair programming or collaborative document drafting.

Commentator personality is a potential enterprise differentiator. Organizations could configure The Commentator's coaching style: directive, Socratic, or supportive. Different use cases and team cultures may benefit from different approaches.

---

## 12. Principles

The product is built on five principles that govern every decision about scope, design, and architecture.

**Coaching, not blocking.** The Commentator never prevents users from doing what they intend. Observations are offered, never enforced. Users can and should be able to ignore every nudge and still have a functional, valuable AI workspace.

**Zero cost by default.** The majority of coaching is heuristic and costs nothing. AI calls are reserved for moments of explicit user engagement. This principle ensures the product is viable at enterprise scale without becoming cost-prohibitive.

**Observer integrity.** The Commentator's independence from the main AI is not a technical detail. It is the product's core value proposition. A coach who benefits from the conversation they are coaching cannot give honest feedback.

**Progressive disclosure.** Beginners see more intervention. Advanced users see less. The product adapts to the user's demonstrated skill level rather than applying a uniform experience to everyone.

**Speed over perfection.** A nudge that is eighty percent accurate and arrives immediately is more valuable than an analysis that is perfect but arrives after the user has moved on. Latency in coaching is as damaging as latency in the main chat.

---

*For questions about this document, the product roadmap, or enterprise deployment options, contact the product team.*
