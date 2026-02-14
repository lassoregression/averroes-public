# Averroes — Test Flows

Manual test scenarios for verifying nudge heuristics, commentator behavior, mode switching, and end-to-end flows.

---

## 1. Nudge Heuristics — Task Type Detection

### 1.1 Code Generation (Missing Language)
**Input:** "Write a function to sort an array"
**Expected nudge:** "Code prompt without a language specified — which language are you targeting?"

### 1.2 Code Generation (Missing I/O Spec)
**Input:** "Build me a React component"
**Expected nudge:** "What should this component do? Props? State? What does it render?"

### 1.3 Writing (Missing Audience)
**Input:** "Write an email about the project update"
**Expected nudge:** "Who's the audience — your team, a client, your manager? Tone changes everything."

### 1.4 Writing (Missing Format/Length)
**Input:** "Draft a blog post about AI"
**Expected nudge:** "How long? What angle? Technical audience or general?"

### 1.5 Analysis (Missing Criteria)
**Input:** "Compare React and Vue"
**Expected nudge:** "Compare on what? Performance? DX? Ecosystem? Learning curve?"

### 1.6 Research (Missing Depth)
**Input:** "Explain machine learning"
**Expected nudge:** "For what level? Beginner overview or technical deep-dive? What's the use case?"

### 1.7 Creative (No Constraints)
**Input:** "Write a story about space"
**Expected nudge:** "What kind of story? Length? Tone? Perspective? Any constraints?"

---

## 2. Nudge Heuristics — Anti-Patterns

### 2.1 Pleasantries
**Input:** "Can you help me with writing some code?"
**Expected nudge:** "Skip pleasantries. State what you need directly — LLMs respond better."

### 2.2 Multiple Requests
**Input:** "Write me a login page, also explain how JWT works, and review my database schema"
**Expected nudge:** "You're asking 3 different things. Split into focused prompts for better results."

### 2.3 Vague Follow-up
**Previous:** User asked for code, got a response.
**Input:** "Make it better"
**Expected nudge:** "What specifically isn't working? Logic? Style? Performance? Error handling?"

### 2.4 Circling
**Previous:** User asked 3 similar prompts about the same topic.
**Input:** Another prompt on the same topic.
**Expected nudge:** "You're circling the same topic. Want to step back and define what you actually need?"

### 2.5 Ultra-Short Prompt
**Input:** "Help"
**Expected nudge:** "What do you need help with? Be specific about the task and desired outcome."

### 2.6 Very Generic Opener
**Input:** "I need a thing for my project"
**Expected nudge:** "What kind of thing? What project? Give the AI enough context to help."

---

## 3. Nudge Heuristics — Post-Response Analysis

### 3.1 Long Response from Short Prompt
**Input:** "Tell me about APIs" (< 20 words)
**Expected:** LLM responds with 800+ words.
**Expected nudge:** "Long response = unfocused prompt. Adding constraints (format, length, scope) would tighten this."

### 3.2 LLM Asks Clarifying Questions
**Input:** "Build me an app"
**Expected:** LLM asks "What kind of app? What platform?"
**Expected nudge:** "The AI had to guess. Your prompt was missing: platform, purpose, tech stack."

### 3.3 LLM Offers Multiple Approaches
**Input:** "How should I handle authentication?"
**Expected:** LLM lists OAuth, JWT, sessions, etc.
**Expected nudge:** "When the AI offers options, the prompt didn't specify which approach. State your constraints."

### 3.4 Filler Detection
**Input:** "Can you write something for me?"
**Expected:** LLM responds with "I'd be happy to help! ..."
**Expected nudge:** "Filler responses usually mean a vague prompt. Try being more direct about what you need."

---

## 4. Prompt Scoring

### 4.1 Score < 15 (Multi-nudge)
**Input:** "code"
**Expected:** Score ~3. Nudges on specificity, context, structure, constraints.

### 4.2 Score 15-30 (Single nudge)
**Input:** "Write a Python function that takes a list and returns the duplicates"
**Expected:** Score ~25. Light nudge: "Consider adding: expected input size, error handling preference, return format."

### 4.3 Score > 30 (Dormant)
**Input:** "Write a Python 3.11+ async function that takes a list[str] of URLs, fetches them concurrently with aiohttp, returns a dict mapping URL to status code. Handle timeouts (30s) and connection errors gracefully. Use type hints throughout."
**Expected:** Score ~42. No nudge. Commentator stays dormant.

---

## 5. Mode Switching — Freestyle ↔ 0→1

### 5.1 Default State
**Expected:** App loads in Freestyle mode. Light theme. Commentator panel visible but dormant. Toggle centered on welcome screen showing "Freestyle | 0→1".

### 5.2 Switch to 0→1 from Welcome
**Action:** Click 0→1 toggle on welcome screen.
**Expected:** Theme transitions to dark mode. Welcome copy changes. Commentator panel expands.

### 5.3 0→1 Workshop Flow
**Action:** In 0→1, type a prompt and send.
**Expected:** Message goes to commentator (side panel), NOT main chat. Back-and-forth in panel.

### 5.4 0→1 Prompt Return
**Action:** Commentator finishes workshopping, places refined prompt.
**Expected:** Refined prompt appears in main chat input (editable, not sent). Theme returns to light. Toggle back to Freestyle.

### 5.5 Re-engage 0→1 Mid-Conversation
**Action:** After several Freestyle exchanges, toggle 0→1 again.
**Expected:** Theme goes dark. Panel expands. Next message goes to commentator. After workshop, returns to Freestyle.

### 5.6 Toggle Position After Welcome
**Action:** Start a conversation (send first message).
**Expected:** Toggle moves from center to near the commentator panel area.

---

## 6. Commentator Panel States

### 6.1 Dormant
**State:** No messages sent yet, or score > 30.
**Expected:** Panel shows "Watching..." or subtle idle state. No LLM calls.

### 6.2 Nudge Appears
**Action:** Send a vague prompt in Freestyle mode.
**Expected:** Nudge scrolls into the commentator panel (Twitch-style). No interruption to main chat.

### 6.3 User Engages from Nudge
**Action:** Click on a nudge or type in the commentator panel.
**Expected:** Commentator enters Active state. Main chat input is paused/disabled. Back-and-forth with commentator.

### 6.4 Active → Return to Dormant
**Action:** Finish engagement. Commentator places refined prompt in input.
**Expected:** Commentator returns to dormant. Main chat input re-enabled with refined prompt.

### 6.5 Panel Always Visible
**Action:** Resize browser window.
**Expected:** Panel remains visible at various screen sizes. Collapses gracefully on mobile.

---

## 7. Theme Switching

### 7.1 Freestyle Default
**Expected:** White/light background. Black text. Blue/periwinkle (#6366f1) accents. Solid blue commentator panel.

### 7.2 0→1 Active
**Expected:** Dark background. Light text. Red/coral (#dc4a4a) accents. Solid red commentator panel. Smooth transition (not jarring).

### 7.3 Return to Freestyle
**Action:** Complete 0→1 workshop.
**Expected:** Smooth transition back to light theme. Immediate visual signal that workshop is done.

---

## 8. End-to-End Flows

### 8.1 New User — Freestyle Simple Chat
1. App loads → Light theme, centered toggle, "Change how you work with AI"
2. User types prompt → Main chat responds with streaming
3. Commentator panel shows dormant state
4. If prompt was vague → Nudge appears in panel
5. User ignores nudge → Main chat continues normally

### 8.2 New User — 0→1 First Prompt
1. App loads → User clicks 0→1 toggle
2. Theme goes dark → Panel expands/overlays
3. User types prompt → Goes to commentator
4. Commentator workshops back and forth
5. Refined prompt placed in chat input
6. Theme returns to light → User sends to main chat
7. Main chat responds → Commentator dormant

### 8.3 Power User — Mixed Mode Session
1. Start in Freestyle → Send 3 good prompts (score > 30, no nudges)
2. Send a vague prompt → Nudge appears
3. Click nudge → Commentator activates, workshops
4. Refined prompt sent → Continue Freestyle
5. Toggle 0→1 for a complex prompt → Full workshop
6. Return to Freestyle → Continue chatting

### 8.4 Cost Efficiency Verification
1. Send 10 messages in Freestyle with score > 30
2. Verify: ZERO commentator LLM calls made
3. Send 1 vague message → Nudge appears (still no LLM call)
4. Click nudge → NOW commentator LLM call happens
5. Verify: Only 1 LLM call for commentator across entire session
