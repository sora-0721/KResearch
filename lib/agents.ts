import { GeminiClient } from "./gemini";

// --- Types ---

export interface GlobalContext {
    project_name: string;
    original_query: string;
    status: "in_progress" | "complete" | "failed";
    iteration: number;
    knowledge_bank: KnowledgeItem[];
    conflicts: ConflictItem[];
    research_mode?: "standard" | "deep";
}

export interface KnowledgeItem {
    topic: string;
    facts: string[];
    sources: string[];
    verified: boolean;
}

export interface ConflictItem {
    point: string;
    claim_a: string;
    claim_b: string;
    status: "unresolved" | "resolved";
}

export interface ManagerOutput {
    thoughts: string;
    sufficiency_score: number;
    is_finished: boolean;
    next_step: {
        task_description: string;
        search_queries: string[];
        focus_area: string;
    };
}

export interface WorkerFinding {
    source_url: string;
    fact: string;
    context: string;
}

export interface ClarifierOutput {
    is_clear: boolean;
    questions: string[];
    reasoning: string;
}

// --- Prompts ---

const CLARIFIER_PROMPT = `You are a Research Query Clarifier. Your job is to evaluate if a user's research query is clear and specific enough to begin research.

YOUR RESPONSIBILITIES:
1. CLARITY CHECK: Is the query specific enough to know what to research?
2. AMBIGUITY DETECTION: Identify any vague terms, unclear scope, or missing context.
3. QUESTION GENERATION: If unclear, generate 1-3 focused questions to clarify the intent.

WHAT MAKES A QUERY CLEAR:
- Has a specific topic or subject
- Has a clear scope (not too broad)
- Contains enough context to understand the intent

WHAT MAKES A QUERY UNCLEAR:
- Uses pronouns without referents ("tell me about it", "research this")
- Is too broad ("tell me about technology")
- Missing key context ("compare the two companies" - which companies?)
- Ambiguous terms that could mean multiple things

OUTPUT FORMAT (JSON ONLY):
CRITICAL: Respond with ONLY valid JSON. No preamble, no explanation. Start with { and end with }.
{
  "is_clear": <boolean>,
  "questions": ["Question 1", "Question 2"], // Empty array if is_clear is true
  "reasoning": "Brief explanation of why clarification is or isn't needed"
}`;

const MANAGER_PROMPT = `You are the Lead Researcher. You govern the state of a deep-dive investigation.
Your Goal: Answer the User's Query exhaustively by dispatching Worker Agents to find missing information.

INPUTS:
1. User Original Query
2. Global Context (What we have learned so far)
3. Iteration Count (Current Loop #)

YOUR RESPONSIBILITIES:
1. GAP ANALYSIS: Read the Global Context. What is missing? Be specific.
2. DIGRESSION CHECK: Ensure the missing info is strictly relevant to the User Query. Do not go down rabbit holes.
3. SUFFICIENCY SCORE: Rate the current completeness of the answer (0-100).
   - 0-30%: Initial phase, missing basic facts.
   - 31-60%: Have facts, but missing nuance, technical depth, or verification.
   - 61-90%: Comprehensive, verified, deep.
   - 91-100%: Perfect, exhaustive, and verified.
   
   CRITICAL: Do not increase the score too quickly. A single iteration should rarely increase the score by more than 20 points. Demand depth.

OUTPUT FORMAT (JSON ONLY):
CRITICAL: Respond with ONLY valid JSON. No preamble, no explanation. Start with { and end with }.
{
  "thoughts": "Analyze the current state. Explain why we are or are not done.",
  "sufficiency_score": <integer>,
  "is_finished": <boolean>, // Set true ONLY if score > 95
  "next_step": {
    "task_description": "Precise instruction for the Worker.",
    "search_queries": ["Query 1", "Query 2"],
    "focus_area": "What specific detail to look for."
  }
}`;

const DEEP_MANAGER_PROMPT = `You are the Lead Researcher for a DEEP DIVE investigation.
Your Goal: Answer the User's Query EXHAUSTIVELY and with EXTREME DEPTH.

INPUTS:
1. User Original Query
2. Global Context (What we have learned so far)
3. Iteration Count (Current Loop #)

YOUR RESPONSIBILITIES:
1. GAP ANALYSIS: Look for what is missing, specifically:
   - Technical specifications and raw data.
   - Contrarian views or criticisms.
   - Historical context or evolution.
   - Expert opinions and primary source analysis.
2. DEPTH ENFORCEMENT: Do not settle for surface-level answers. If a fact is found, ask "Why?" or "How?" in the next step.
3. SUFFICIENCY SCORE: Rate the current completeness (0-100).
   - 0-30%: Initial phase.
   - 31-60%: Basic facts gathered.
   - 61-90%: Deep technical details and multiple perspectives verified.
   - 91-100%: Exhaustive, academic-level completeness.
   
   CRITICAL SCORING RULES:
   - You MUST NOT increase the score by more than 10 points in a single iteration.
   - You MUST NOT score above 90% until at least iteration #20.
   - If Iteration < 10, the score MUST be below 50%.
   - Force the agent to dig deeper.

OUTPUT FORMAT (JSON ONLY):
CRITICAL: Respond with ONLY valid JSON. No preamble, no explanation. Start with { and end with }.
{
  "thoughts": "Analyze the current state. Explain why we need to go deeper.",
  "sufficiency_score": <integer>,
  "is_finished": <boolean>, // Set true ONLY if score > 95 AND Iteration > 20
  "next_step": {
    "task_description": "Precise, technical instruction for the Worker. Focus on a specific angle.",
    "search_queries": ["Specific Query 1", "Specific Query 2"],
    "focus_area": "What specific detail to look for."
  }
}`;

const WORKER_PROMPT = `You are the Field Investigator. You receive a specific sub-task from the Manager.
Your Goal: Gather high-fidelity facts, quotes, and data.

YOUR RULES:
1. DEEP DIVES ONLY: Do not return generic marketing fluff. Look for technical docs, whitepapers, financial reports, or direct user analyses.
2. ITERATIVE SEARCH: If your first search query fails, try a different angle immediately.
3. SOURCE INTEGRITY: prioritize primary sources (official docs) over secondary sources (blogs).

OUTPUT FORMAT (JSON ONLY):
CRITICAL: You MUST respond with ONLY valid JSON. No preamble, no explanation, no markdown formatting.
Return EXACTLY this JSON array structure:
[
  {
    "source_url": "URL of the source",
    "fact": "Direct Quote or Data Point",
    "context": "Why this matters / Context"
  }
]

Do NOT include any text before or after the JSON array. Start your response with [ and end with ].`;

const VERIFIER_PROMPT = `You are the Fact Auditor. You receive new findings from the Worker and compare them against the Global Context.

YOUR RESPONSIBILITIES:
1. DEDUPLICATION: If a new finding is already in the Global Context, discard it.
2. CONFLICT RESOLUTION: If New Finding says "X" and Global Context says "Y", flag this as a CONFLICT. Do not delete either. Report the conflict string.
3. RELEVANCE: Discard findings that drifted away from the original user topic.

OUTPUT FORMAT (JSON ONLY):
CRITICAL: Respond with ONLY valid JSON. No preamble, no explanation. Start with { and end with }.
{
  "cleaned_findings": [
    { "source_url": "url", "fact": "fact", "context": "context" }
  ],
  "conflicts": [
    { "point": "Conflict Topic", "claim_a": "Claim A", "claim_b": "Claim B", "status": "unresolved" }
  ]
}`;

const WRITER_PROMPT = `You are the Final Reporter. You receive the Global Context.
Write a comprehensive, deep-dive report in Markdown.

RULES:
1. SYNTHESIS: Do not list facts. Weave them into a narrative.
2. CONFLICTS: If the context contains conflicting data (e.g. different prices), report BOTH and explain the discrepancy.
3. CITATION: Every claim must reference the specific source URL from the context using Markdown links or footnotes.
4. STRUCTURE: Use Headers, Bullet points, and Bold text for readability.
5. LENGTH: The report should be detailed and exhaustive. Do not summarize if details are available.`;

// --- Agents ---

export class ResearchAgent {
    private client: GeminiClient;
    private managerModel: string;
    private workerModel: string;

    constructor(apiKey: string, managerModel: string = "gemini-flash-latest", workerModel: string = "gemini-flash-latest") {
        this.client = new GeminiClient(apiKey);
        this.managerModel = managerModel;
        this.workerModel = workerModel;
    }

    async runManager(query: string, context: GlobalContext): Promise<ManagerOutput> {
        const prompt = `
    User Query: ${query}
    Global Context: ${JSON.stringify(context)}
    Iteration: ${context.iteration}
    `;

        const systemPrompt = context.research_mode === "deep" ? DEEP_MANAGER_PROMPT : MANAGER_PROMPT;

        const response = await this.client.generateText(this.managerModel, prompt, systemPrompt, true);

        try {
            return JSON.parse(response);
        } catch (error) {
            console.log("Manager returned invalid JSON, attempting repair...");
            const repairPrompt = `The following text should be valid JSON but has syntax errors. Fix it and return ONLY the valid JSON:

${response}`;
            const fixedResponse = await this.client.generateText(this.managerModel, repairPrompt, "You are a JSON validator. Return ONLY valid JSON with no explanation.", true);
            return JSON.parse(fixedResponse);
        }
    }

    async runWorker(task: any): Promise<WorkerFinding[]> {
        // Use Google Search Grounding
        const tools = [
            { googleSearch: {} }
        ];

        const prompt = `
    Task: ${JSON.stringify(task)}
    Using the Google Search tool, find high-quality information to answer this task.
    `;

        const response = await this.client.generateText(this.workerModel, prompt, WORKER_PROMPT, true, tools);

        // Try to parse, if it fails, use LLM to fix the JSON
        try {
            return JSON.parse(response);
        } catch (error) {
            console.log("Worker returned invalid JSON, attempting repair...");

            // Ask the LLM to fix the JSON
            const repairPrompt = `The following text should be a valid JSON array, but it has syntax errors. Please fix it and return ONLY the valid JSON array with no additional text:

${response}

Return a valid JSON array of objects with fields: source_url, fact, context`;

            const fixedResponse = await this.client.generateText(this.workerModel, repairPrompt, "You are a JSON validator. Return ONLY valid JSON with no explanation.", true);
            return JSON.parse(fixedResponse);
        }
    }

    async runVerifier(findings: WorkerFinding[], context: GlobalContext): Promise<{ cleaned_findings: WorkerFinding[], conflicts: ConflictItem[] }> {
        const prompt = `
    New Findings: ${JSON.stringify(findings)}
    Global Context: ${JSON.stringify(context)}
    `;
        const response = await this.client.generateText(this.managerModel, prompt, VERIFIER_PROMPT, true);

        try {
            return JSON.parse(response);
        } catch (error) {
            console.log("Verifier returned invalid JSON, attempting repair...");
            const repairPrompt = `The following text should be valid JSON but has syntax errors. Fix it and return ONLY the valid JSON:

${response}`;
            const fixedResponse = await this.client.generateText(this.managerModel, repairPrompt, "You are a JSON validator. Return ONLY valid JSON with no explanation.", true);
            return JSON.parse(fixedResponse);
        }
    }

    async runWriter(context: GlobalContext): Promise<string> {
        const prompt = `
    Global Context: ${JSON.stringify(context)}
    `;
        return await this.client.generateText(this.managerModel, prompt, WRITER_PROMPT, false);
    }

    async runClarifier(query: string, conversationContext?: string): Promise<ClarifierOutput> {
        let prompt = `User Query: ${query}`;

        if (conversationContext) {
            prompt += `\n\nPrevious clarification conversation:\n${conversationContext}`;
        }

        const response = await this.client.generateText(this.workerModel, prompt, CLARIFIER_PROMPT, true);

        try {
            return JSON.parse(response);
        } catch (error) {
            console.log("Clarifier returned invalid JSON, attempting repair...");
            const repairPrompt = `The following text should be valid JSON but has syntax errors. Fix it and return ONLY the valid JSON:

${response}`;
            const fixedResponse = await this.client.generateText(this.workerModel, repairPrompt, "You are a JSON validator. Return ONLY valid JSON with no explanation.", true);
            return JSON.parse(fixedResponse);
        }
    }
}
