/**
 * Nudge Heuristics Engine — Zero-cost prompt analysis.
 *
 * Analyzes user prompts WITHOUT making any LLM calls. Pure heuristics.
 * Provides contextual, actionable nudges based on what the user is trying to do.
 *
 * 6 Layers:
 * 1. Task Type Detection (regex/keyword classification)
 * 2. Missing Dimension Scoring (per task type)
 * 3. Anti-Pattern Detection (common bad habits)
 * 4. Post-Response Analysis (signals in the LLM's response)
 * 5. Composite Scoring (0-50 across 5 dimensions)
 * 6. Conversation-Aware Analysis (circling, repetition)
 *
 * All nudge text reads like advice from a smart colleague, not a robot.
 */

/* ========================================
   Types
   ======================================== */

export type TaskType = "code" | "writing" | "analysis" | "creative" | "research" | "general";

export interface Nudge {
  id: string;
  text: string;
  category: "missing_dimension" | "anti_pattern" | "post_response" | "scoring" | "conversation";
  severity: "light" | "medium" | "strong";
  dimension?: string;
}

export interface PromptScore {
  specificity: number;
  context: number;
  structure: number;
  constraints: number;
  examples: number;
  total: number;
}

export interface NudgeResult {
  score: PromptScore;
  taskType: TaskType;
  nudges: Nudge[];
  shouldNudge: boolean;
}

/* ========================================
   Helpers
   ======================================== */

let nudgeCounter = 0;

function createNudge(
  text: string,
  category: Nudge["category"],
  severity: Nudge["severity"],
  dimension?: string,
): Nudge {
  return { id: `nudge-${++nudgeCounter}-${Date.now()}`, text, category, severity, dimension };
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function extractKeywords(text: string): Set<string> {
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "can", "shall", "to", "of", "in", "for",
    "on", "with", "at", "by", "from", "as", "into", "through", "during",
    "before", "after", "and", "but", "or", "not", "no", "if", "then",
    "than", "too", "very", "just", "about", "up", "out", "so", "it",
    "its", "my", "your", "this", "that", "these", "those", "i", "me",
    "you", "he", "she", "we", "they", "what", "which", "who", "how",
  ]);
  return new Set(
    text.toLowerCase().split(/\W+/).filter((w) => w.length > 2 && !stopWords.has(w))
  );
}

function keywordOverlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let overlap = 0;
  for (const word of a) if (b.has(word)) overlap++;
  return overlap / Math.max(a.size, b.size);
}

/* ========================================
   Layer 1 — Task Type Detection
   ======================================== */

const TASK_PATTERNS: Array<{ type: TaskType; patterns: RegExp[] }> = [
  {
    type: "code",
    patterns: [
      /\b(write|build|create|implement|code|function|class|component|api|endpoint|debug|fix\s+the\s+(bug|error|issue)|refactor|script|program|algorithm)\b/i,
      /\b(python|javascript|typescript|react|vue|angular|node|java|rust|go|sql|html|css|php|ruby|swift|kotlin)\b/i,
    ],
  },
  {
    type: "writing",
    patterns: [
      /\b(draft|email|blog|essay|article|letter|write\s+a|write\s+an|write\s+me|copy|headline|tagline|description|summary|report|memo|proposal|press\s+release)\b/i,
    ],
  },
  {
    type: "analysis",
    patterns: [
      /\b(analyze|analyse|compare|review|evaluate|assess|examine|audit|diagnose|benchmark|rank|rate|score|pros\s+and\s+cons|tradeoffs?|trade-offs?)\b/i,
    ],
  },
  {
    type: "creative",
    patterns: [
      /\b(story|poem|fiction|creative|imagine|screenplay|dialogue|character|plot|narrative|lyrics|song|joke|humor)\b/i,
    ],
  },
  {
    type: "research",
    patterns: [
      /\b(explain|what\s+is|how\s+does|why\s+does|tell\s+me\s+about|describe|define|overview|introduction\s+to|guide\s+to|tutorial|teach\s+me)\b/i,
    ],
  },
];

function detectTaskType(prompt: string): TaskType {
  for (const { type, patterns } of TASK_PATTERNS) {
    if (patterns.some((p) => p.test(prompt))) return type;
  }
  return "general";
}

/* ========================================
   Subject Extraction — Makes nudges contextual
   ======================================== */

/** Task-type keyword lists — used to strip task keywords and find the user's actual subject */
const TASK_KEYWORDS = new Set([
  "write", "build", "create", "implement", "code", "function", "class", "component",
  "api", "endpoint", "debug", "fix", "refactor", "script", "program", "algorithm",
  "draft", "email", "blog", "essay", "article", "letter", "copy", "headline",
  "tagline", "description", "summary", "report", "memo", "proposal",
  "analyze", "analyse", "compare", "review", "evaluate", "assess", "examine",
  "audit", "diagnose", "benchmark", "rank", "rate", "score",
  "story", "poem", "fiction", "creative", "imagine", "screenplay", "dialogue",
  "character", "plot", "narrative", "lyrics", "song", "joke", "humor",
  "explain", "describe", "define", "overview", "introduction", "guide", "tutorial",
  "help", "make", "give", "tell", "show", "please", "can", "could", "would",
  "want", "need", "like", "some", "about",
]);

/**
 * Extract the meaningful subject/topic from a prompt by stripping task-type
 * keywords and stop words. Returns a short phrase the nudge can reference.
 *
 * Example: "Write a function to sort an array" → "sorting an array"
 * Example: "Draft an email about the Q4 results" → "Q4 results"
 */
function extractSubject(prompt: string): string {
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "can", "shall", "to", "of", "in", "for",
    "on", "with", "at", "by", "from", "as", "into", "through", "during",
    "before", "after", "and", "but", "or", "not", "no", "if", "then",
    "than", "too", "very", "just", "so", "it", "its", "my", "your",
    "this", "that", "these", "those", "i", "me", "you", "he", "she",
    "we", "they", "what", "which", "who", "how",
  ]);

  const words = prompt.toLowerCase().split(/\W+/).filter(Boolean);
  /* Remove task keywords and stop words from the front, keep meaningful remainder */
  const meaningful = words.filter((w) => w.length > 2 && !stopWords.has(w) && !TASK_KEYWORDS.has(w));

  if (meaningful.length === 0) return "this";
  /* Cap at 4 words to keep it concise */
  return meaningful.slice(0, 4).join(" ");
}

/* ========================================
   Layer 2 — Missing Dimension Checks
   ======================================== */

interface DimensionCheck {
  name: string;
  patterns: RegExp[];
  nudge: string;
  severity: Nudge["severity"];
}

const CODE_DIMENSIONS: DimensionCheck[] = [
  {
    name: "language",
    patterns: [/\b(python|javascript|typescript|java|rust|go|c\+\+|c#|ruby|php|swift|kotlin|sql|bash|shell)\b/i],
    nudge: "Code prompt without a language specified \u2014 which language are you targeting?",
    severity: "strong",
  },
  {
    name: "io_spec",
    patterns: [/\b(input|output|return|accept|parameter|argument|takes?|gives?|produces?|yields?)\b/i, /\b(string|number|array|list|object|dict|boolean|int|float)\b/i],
    nudge: "What goes in and what comes out? Specifying inputs/outputs removes ambiguity.",
    severity: "medium",
  },
  {
    name: "error_handling",
    patterns: [/\b(error|exception|handle|catch|throw|fail|edge\s*case|invalid|null|undefined|empty)\b/i],
    nudge: "What should happen when things go wrong? Edge cases and error handling matter.",
    severity: "light",
  },
];

const WRITING_DIMENSIONS: DimensionCheck[] = [
  {
    name: "audience",
    patterns: [/\b(audience|reader|for\s+(my|the|a)|aimed\s+at|written\s+for|targeting|stakeholder|client|team|manager|user|customer)\b/i],
    nudge: "Writing prompt with no audience \u2014 who's reading this? Tone changes everything.",
    severity: "strong",
  },
  {
    name: "tone",
    patterns: [/\b(tone|formal|informal|casual|professional|friendly|serious|humorous|academic|conversational|technical|persuasive)\b/i],
    nudge: "No tone specified. Professional? Casual? Persuasive? This shapes the entire output.",
    severity: "medium",
  },
  {
    name: "length",
    patterns: [/\b(words?|paragraphs?|sentences?|pages?|short|long|brief|detailed|concise|comprehensive)\b/i, /\d+\s*(words?|chars?)/i],
    nudge: "No length guidance. How long should this be? A tweet or a whitepaper?",
    severity: "light",
  },
];

const ANALYSIS_DIMENSIONS: DimensionCheck[] = [
  {
    name: "criteria",
    patterns: [/\b(criteria|metric|dimension|factor|aspect|based\s+on|in\s+terms\s+of|regarding|with\s+respect\s+to|measured\s+by)\b/i],
    nudge: "Compare on what? Performance? Cost? UX? Define your criteria for useful analysis.",
    severity: "strong",
  },
  {
    name: "output_format",
    patterns: [/\b(table|chart|list|summary|report|bullet|markdown|json|structured|formatted)\b/i],
    nudge: "How do you want the analysis presented? Table, bullet points, executive summary?",
    severity: "medium",
  },
];

const CREATIVE_DIMENSIONS: DimensionCheck[] = [
  {
    name: "style",
    patterns: [/\b(style|like|similar\s+to|inspired\s+by|in\s+the\s+style|voice|genre|mood|atmosphere|dark|light|whimsical|gritty)\b/i],
    nudge: "No style direction. What's the mood? Dark? Light? Whimsical? Creative writing thrives on constraints.",
    severity: "medium",
  },
  {
    name: "constraints",
    patterns: [/\b(words?|length|short|long|first\s+person|third\s+person|perspective|point\s+of\s+view|twist|ending|setting)\b/i],
    nudge: "No constraints. Perspective? Length? Setting? Constraints make creativity sharper.",
    severity: "medium",
  },
];

const RESEARCH_DIMENSIONS: DimensionCheck[] = [
  {
    name: "depth",
    patterns: [/\b(overview|deep\s*-?\s*dive|detailed|brief|high\s*-?\s*level|beginner|advanced|technical|simple|eli5)\b/i],
    nudge: "How deep should this go? Quick overview or expert-level deep dive?",
    severity: "medium",
  },
  {
    name: "use_case",
    patterns: [/\b(use\s*case|purpose|goal|project|building|working\s+on|trying\s+to|need\s+it\s+for|so\s+i\s+can)\b/i],
    nudge: "Why do you need to know this? Sharing your use case gets a more targeted explanation.",
    severity: "light",
  },
];

const DIMENSION_MAP: Record<Exclude<TaskType, "general">, DimensionCheck[]> = {
  code: CODE_DIMENSIONS,
  writing: WRITING_DIMENSIONS,
  analysis: ANALYSIS_DIMENSIONS,
  creative: CREATIVE_DIMENSIONS,
  research: RESEARCH_DIMENSIONS,
};

function checkMissingDimensions(prompt: string, taskType: TaskType): Nudge[] {
  if (taskType === "general") return [];
  const dimensions = DIMENSION_MAP[taskType];
  const subject = extractSubject(prompt);
  const nudges: Nudge[] = [];
  for (const dim of dimensions) {
    const present = dim.patterns.some((p) => p.test(prompt));
    if (!present) {
      /* Inject the user's subject into the nudge for contextual relevance.
         Replaces generic prefixes like "Code prompt" → "Your [subject] prompt" */
      const contextualNudge = dim.nudge
        .replace(/^(Code|Writing|Short \w+|No \w+) prompt/i, `Your ${subject} prompt`)
        .replace(/^Compare on what\?/, `Compare ${subject} on what?`)
        .replace(/^How deep/, `How deep into ${subject}`)
        .replace(/^No style direction\./, `No style direction for ${subject}.`)
        .replace(/^No constraints\./, `No constraints for ${subject}.`)
        .replace(/^No tone specified\./, `No tone for ${subject} specified.`)
        .replace(/^No length guidance\./, `No length guidance for ${subject}.`)
        .replace(/^What goes in/, `What goes into your ${subject}`)
        .replace(/^What should happen when/, `What should happen with ${subject} when`)
        .replace(/^How do you want the/, `How do you want your ${subject}`)
        .replace(/^Why do you need to know this\?/, `Why do you need to know about ${subject}?`);
      nudges.push(createNudge(contextualNudge, "missing_dimension", dim.severity, dim.name));
    }
  }
  return nudges;
}

/* ========================================
   Layer 3 — Anti-Pattern Detection
   ======================================== */

const ANTI_PATTERNS: Array<{ name: string; pattern: RegExp; nudge: string; severity: Nudge["severity"] }> = [
  {
    name: "pleasantries",
    pattern: /^(hi|hello|hey)?\s*(,?\s*)?(can|could|would)\s+you\s+(please\s+)?(help|assist)\s+(me\s+)?(with|to|by)/i,
    nudge: "Skip the pleasantries. State what you need directly \u2014 LLMs respond better to clear instructions.",
    severity: "light",
  },
  {
    name: "make_it_better",
    pattern: /\b(make\s+it\s+better|improve\s+(it|this)|fix\s+(it|this)|can\s+you\s+(improve|enhance|fix|update)\s+(it|this))\b/i,
    nudge: "\"Make it better\" is vague. What specifically isn't working? Tone? Length? Accuracy? Structure?",
    severity: "strong",
  },
  {
    name: "multiple_requests",
    pattern: /\b(also|and\s+also|additionally|plus|on\s+top\s+of\s+that|another\s+thing|while\s+you're\s+at\s+it)\b/i,
    nudge: "You're asking multiple things. Split into focused prompts for better results on each.",
    severity: "medium",
  },
  {
    name: "vague_need",
    pattern: /^i\s+need\s+(a|an|some|the)\s+\w+\.?$/i,
    nudge: "What kind? Give the AI enough context \u2014 constraints, examples, audience, format.",
    severity: "strong",
  },
  {
    name: "do_something_with",
    pattern: /^(do\s+something\s+with|help\s+me\s+with|work\s+on|deal\s+with)\s+/i,
    nudge: "What exactly do you want done? \"Do something with X\" leaves the AI guessing.",
    severity: "medium",
  },
];

function detectAntiPatterns(prompt: string, taskType: TaskType): Nudge[] {
  const nudges: Nudge[] = [];
  const words = wordCount(prompt);

  for (const ap of ANTI_PATTERNS) {
    if (ap.pattern.test(prompt)) {
      nudges.push(createNudge(ap.nudge, "anti_pattern", ap.severity));
    }
  }

  /* Short prompt — task-specific suggestion with subject context */
  if (words < 10) {
    const subject = extractSubject(prompt);
    const shortNudges: Record<TaskType, string> = {
      code: `Short prompt for ${subject}. Add: language, what it should do, inputs/outputs, error handling.`,
      writing: `Short prompt for ${subject}. Add: audience, tone, length, and purpose.`,
      analysis: `Short prompt for ${subject}. Add: what you're analyzing, criteria, output format.`,
      creative: `Short prompt for ${subject}. Add: style, length, constraints \u2014 creativity thrives on boundaries.`,
      research: `Short prompt about ${subject}. Add: depth, what you already know, and why you need this.`,
      general: "Very short prompt. The more context you give, the less the AI has to guess.",
    };
    nudges.push(createNudge(shortNudges[taskType], "anti_pattern", words < 5 ? "strong" : "medium"));
  }

  return nudges;
}

/* ========================================
   Layer 4 — Post-Response Analysis
   ======================================== */

function analyzeResponseSignals(prompt: string, response: string): Nudge[] {
  const nudges: Nudge[] = [];
  const promptWords = wordCount(prompt);
  const responseWords = wordCount(response);
  const taskType = detectTaskType(prompt);
  const subject = extractSubject(prompt);

  /* Long response for short prompt = AI compensating for vagueness */
  if (responseWords > 800 && promptWords < 20) {
    nudges.push(createNudge(
      `The AI wrote ${responseWords}+ words about ${subject} \u2014 your prompt didn't set boundaries. Try adding length or format constraints.`,
      "post_response", "medium",
    ));
  }

  /* LLM asking clarifying questions */
  const afterFirstSentence = response.replace(/^[^.!?]*[.!?]\s*/, "");
  const questionCount = (afterFirstSentence.match(/\?/g) || []).length;
  if (questionCount >= 2) {
    /* Determine which dimensions were likely missing based on task type */
    const missingHints: Record<TaskType, string> = {
      code: "language, inputs/outputs, or edge cases",
      writing: "audience, tone, or length",
      analysis: "criteria or output format",
      creative: "style, constraints, or perspective",
      research: "depth or use case",
      general: "key details",
    };
    nudges.push(createNudge(
      `The AI asked clarifying questions about ${subject} \u2014 your prompt was missing ${missingHints[taskType]}.`,
      "post_response", "strong",
    ));
  }

  /* Filler phrases at the start */
  const fillerPattern = /^(i'd be happy to|sure!|sure,|of course!|of course,|certainly!|absolutely!|great question|good question|no problem|glad you asked)/i;
  if (fillerPattern.test(response.trim())) {
    nudges.push(createNudge(
      "The AI started with filler. Direct prompts get direct responses \u2014 try leading with an instruction.",
      "post_response", "light",
    ));
  }

  /* Multiple options/approaches */
  const multipleOptions = /\b(here are (a few|some|several)|option\s*[1-3]|approach\s*[1-3]|alternatively|on the other hand|you could (also|either))\b/i;
  if (multipleOptions.test(response)) {
    nudges.push(createNudge(
      `The AI offered multiple approaches for ${subject} \u2014 next time specify which approach you want.`,
      "post_response", "medium",
    ));
  }

  return nudges;
}

/* ========================================
   Layer 5 — Composite Scoring (0-50)
   ======================================== */

function scorePrompt(prompt: string): PromptScore {
  /* Specificity (0-10) */
  let specificity = 0;
  if (/\d+/.test(prompt)) specificity += 2;
  if (/["'][^"']+["']/.test(prompt)) specificity += 2;
  if (/[a-z][A-Z]|[a-z]_[a-z]|[a-z]+\.[a-z]+/.test(prompt)) specificity += 2;
  if (/\s[A-Z][a-z]{2,}/.test(prompt)) specificity += 1;
  if (/```[\s\S]*```/.test(prompt)) specificity += 2;
  if (/`[^`]+`/.test(prompt)) specificity += 1;
  specificity = Math.min(10, specificity);

  /* Context (0-10) */
  let context = 0;
  if (/\bi('m| am)\s+(working|building|trying|developing|creating)/i.test(prompt)) context += 3;
  if (/\b(i\s+have|we\s+have|currently|right\s+now)\b/i.test(prompt)) context += 2;
  if (/\b(i\s+tried|i\s+already|didn't\s+work|doesn't\s+work)\b/i.test(prompt)) context += 3;
  if (/\b(because|since|the\s+reason|due\s+to)\b/i.test(prompt)) context += 2;
  if (wordCount(prompt) > 30) context += 1;
  if (wordCount(prompt) > 60) context += 1;
  context = Math.min(10, context);

  /* Structure (0-10) */
  let structure = 0;
  const sentences = prompt.split(/[.!?]+/).filter((s) => s.trim().length > 5);
  if (sentences.length >= 2) structure += 2;
  if (sentences.length >= 4) structure += 2;
  if (/^[-*]\s|^\d+[.)]\s/m.test(prompt)) structure += 3;
  if (/\n\s*\n/.test(prompt)) structure += 1;
  if (prompt.split("\n").length >= 3) structure += 1;
  structure = Math.min(10, structure);

  /* Constraints (0-10) */
  let constraints = 0;
  if (/\b(must|shall|needs?\s+to|required?|mandatory)\b/i.test(prompt)) constraints += 2;
  if (/\b(don't|do\s+not|shouldn't|avoid|without|exclude|never)\b/i.test(prompt)) constraints += 2;
  if (/\b(format|markdown|json|csv|table|bullet|list|html)\b/i.test(prompt)) constraints += 2;
  if (/\b(under|less\s+than|no\s+more\s+than|at\s+most|at\s+least|exactly)\s+\d+\b/i.test(prompt)) constraints += 2;
  if (/\b\d+\s*(words?|characters?|lines?|sentences?|paragraphs?)\b/i.test(prompt)) constraints += 2;
  constraints = Math.min(10, constraints);

  /* Examples (0-10) */
  let examples = 0;
  if (/\b(for\s+example|e\.g\.|for\s+instance|such\s+as|like\s+this|sample|example)\b/i.test(prompt)) examples += 3;
  if (/```[\s\S]*```/.test(prompt)) examples += 3;
  if (/`[^`]+`/.test(prompt)) examples += 1;
  if (/\b(input|given|when)\b.*\b(output|return|result|expect)\b/i.test(prompt)) examples += 3;
  if (/\b(similar\s+to|based\s+on|inspired\s+by)\b/i.test(prompt)) examples += 2;
  examples = Math.min(10, examples);

  const total = specificity + context + structure + constraints + examples;
  return { specificity, context, structure, constraints, examples, total };
}

function scoreBasedNudges(score: PromptScore): Nudge[] {
  if (score.total > 30) return [];

  const dimensionNudges: Record<string, string> = {
    specificity: "Your prompt is abstract. Adding names, numbers, or technical terms helps the AI zero in.",
    context: "No background context. Start with what you're working on and what you've tried.",
    structure: "Single block of text. Break into numbered points or separate requirements for clarity.",
    constraints: "No constraints. Tell the AI what it must or must not do \u2014 length, format, things to avoid.",
    examples: "No examples. A sample input/output or reference removes ambiguity fast.",
  };

  const ranked = (Object.entries(dimensionNudges) as Array<[string, string]>)
    .map(([dim, nudge]) => ({
      dim, nudge,
      value: score[dim as keyof Omit<PromptScore, "total">],
    }))
    .sort((a, b) => a.value - b.value);

  const count = score.total < 15 ? 3 : 1;
  return ranked.slice(0, count).map(({ dim, nudge, value }) => {
    const severity: Nudge["severity"] = value <= 2 ? "strong" : value <= 4 ? "medium" : "light";
    return createNudge(nudge, "scoring", severity, dim);
  });
}

/* ========================================
   Layer 6 — Conversation-Aware
   ======================================== */

function conversationAwareNudges(
  prompt: string,
  conversationHistory: Array<{ role: string; content: string }>,
): Nudge[] {
  const nudges: Nudge[] = [];
  const userMessages = conversationHistory.filter((m) => m.role === "user");
  if (userMessages.length < 2) return nudges;

  const currentKeywords = extractKeywords(prompt);

  /* Circling: 3+ messages with high keyword overlap */
  if (userMessages.length >= 3) {
    const recentSets = userMessages.slice(-3).map((m) => extractKeywords(m.content));
    const overlaps = recentSets.map((ks) => keywordOverlap(currentKeywords, ks));
    const avgOverlap = overlaps.reduce((s, o) => s + o, 0) / overlaps.length;
    if (avgOverlap > 0.4) {
      nudges.push(createNudge(
        "You're circling the same topic across several messages. Step back and define what you actually need as a deliverable.",
        "conversation", "medium",
      ));
    }
  }

  /* Repetition: very similar to last message */
  const last = userMessages[userMessages.length - 1];
  if (last) {
    const similarity = keywordOverlap(currentKeywords, extractKeywords(last.content));
    if (similarity > 0.6) {
      nudges.push(createNudge(
        "Very similar to your last message. If the response wasn't right, change your approach \u2014 add constraints, examples, or context.",
        "conversation", "strong",
      ));
    }
  }

  return nudges;
}

/* ========================================
   Public API
   ======================================== */

/**
 * Analyze a user prompt BEFORE it's sent. Runs all 6 layers. Zero LLM calls.
 */
export function analyzePrompt(
  prompt: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
): NudgeResult {
  nudgeCounter = 0;
  const trimmed = prompt.trim();

  if (trimmed.length === 0) {
    return {
      score: { specificity: 0, context: 0, structure: 0, constraints: 0, examples: 0, total: 0 },
      taskType: "general",
      nudges: [],
      shouldNudge: false,
    };
  }

  const taskType = detectTaskType(trimmed);
  const score = scorePrompt(trimmed);
  const dimensionNudges = checkMissingDimensions(trimmed, taskType);
  const antiPatternNudges = detectAntiPatterns(trimmed, taskType);
  const scoringNudges = scoreBasedNudges(score);
  const conversationNudges = conversationAwareNudges(trimmed, conversationHistory);

  /* Assemble nudges — scale count with prompt complexity.
     Short/simple prompts → 1-2 nudges (just the most relevant).
     Longer prompts that trigger more dimensions → more nudges surface naturally.

     Order of priority:
     1. Task-type-specific missing dimensions (most relevant to what they're doing)
     2. Anti-pattern detections (behavioral, actionable)
     3. Conversation-aware nudges (circling, repetition)
     4. Generic scoring nudges (only when no better nudges exist) */

  /* Dynamic cap: scales with prompt length and detected factors */
  const words = wordCount(trimmed);
  const maxNudges = words < 10 ? 2 : words < 30 ? 3 : words < 60 ? 4 : 5;

  let finalNudges: Nudge[] = [];

  if (score.total > 30) {
    /* Strong prompt — only behavioral nudges if any */
    finalNudges = [...antiPatternNudges, ...conversationNudges];
  } else if (score.total >= 15) {
    /* Decent — task-specific first, then behavioral */
    const topDims = dimensionNudges.filter((n) => n.severity === "strong");
    finalNudges = [...topDims, ...antiPatternNudges, ...conversationNudges];
    /* Only backfill with scoring if nothing specific found */
    if (finalNudges.length === 0) {
      finalNudges = scoringNudges.slice(0, 1);
    }
  } else {
    /* Weak — task-specific first, then anti-pattern, then scoring as filler */
    const specific = dimensionNudges.filter((n) => n.severity !== "light");
    finalNudges = [...specific, ...antiPatternNudges, ...conversationNudges];
    /* Backfill with generic scoring only to fill remaining slots */
    const remaining = maxNudges - finalNudges.length;
    if (remaining > 0) {
      finalNudges = [...finalNudges, ...scoringNudges.slice(0, remaining)];
    }
  }

  /* Deduplicate similar nudges, respect the dynamic cap */
  const deduped: Nudge[] = [];
  for (const nudge of finalNudges) {
    const isDup = deduped.some((e) => keywordOverlap(extractKeywords(e.text), extractKeywords(nudge.text)) > 0.5);
    if (!isDup && deduped.length < maxNudges) deduped.push(nudge);
  }

  return { score, taskType, nudges: deduped, shouldNudge: deduped.length > 0 };
}

/**
 * Analyze the LLM's response for signals the prompt was weak.
 * Runs AFTER the response is received.
 */
export function analyzeResponse(prompt: string, response: string): NudgeResult {
  nudgeCounter = 0;
  const taskType = detectTaskType(prompt.trim());
  const score = scorePrompt(prompt.trim());
  const nudges = analyzeResponseSignals(prompt.trim(), response.trim());
  return { score, taskType, nudges, shouldNudge: nudges.length > 0 };
}
