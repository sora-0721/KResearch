import { GeminiClient } from "./gemini";
import { OpenAIClient } from "./openai";
import { searchDuckDuckGo, formatSearchResultsForPrompt } from "./duckduckgo";
import {
    GlobalContext,
    ManagerOutput,
    WorkerFinding,
    ConflictItem,
    ClarifierOutput
} from "./types";
import {
    CLARIFIER_PROMPT,
    MANAGER_PROMPT,
    DEEP_MANAGER_PROMPT,
    WORKER_PROMPT,
    VERIFIER_PROMPT,
    WRITER_PROMPT
} from "./prompts";

// Re-export types for convenience
export type { GlobalContext, ManagerOutput, WorkerFinding, ClarifierOutput, ConflictItem };

export type ProviderType = "gemini" | "openai";

interface LLMClient {
    generateText(modelName: string, prompt: string, systemInstruction?: string, jsonMode?: boolean, tools?: any[]): Promise<string>;
}

export class ResearchAgent {
    private client: LLMClient;
    private provider: ProviderType;
    private managerModel: string;
    private workerModel: string;

    constructor(
        apiKey: string,
        managerModel: string = "gemini-flash-latest",
        workerModel: string = "gemini-flash-latest",
        baseUrl?: string,
        provider: ProviderType = "gemini"
    ) {
        this.provider = provider;
        this.managerModel = managerModel;
        this.workerModel = workerModel;

        if (provider === "openai") {
            this.client = new OpenAIClient(apiKey, baseUrl);
        } else {
            this.client = new GeminiClient(apiKey, baseUrl);
        }
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
        } catch {
            console.log("Manager returned invalid JSON, attempting repair...");
            const repairPrompt = `Fix this JSON and return ONLY valid JSON:\n\n${response}`;
            const fixed = await this.client.generateText(this.managerModel, repairPrompt, "Return ONLY valid JSON.", true);
            return JSON.parse(fixed);
        }
    }

    async runWorker(task: any): Promise<WorkerFinding[]> {
        let prompt: string;
        let response: string;

        if (this.provider === "openai") {
            // OpenAI: Use DuckDuckGo for search
            // next_step contains task_description, search_queries, focus_area
            const queries = task.search_queries && Array.isArray(task.search_queries) && task.search_queries.length > 0
                ? task.search_queries
                : [task.task_description || task.task || JSON.stringify(task)];

            let allSearchResults: any[] = [];
            // Run at most 2 queries to avoid too many requests and token bloat
            for (const q of queries.slice(0, 2)) {
                const results = await searchDuckDuckGo(q, 5);
                allSearchResults = [...allSearchResults, ...results];
            }

            const searchContext = formatSearchResultsForPrompt(allSearchResults);

            prompt = `
You are currently using DuckDuckGo search results. 
Task: ${task.task_description || task.task || JSON.stringify(task)}
Focus Area: ${task.focus_area || "General"}

INSTRUCTIONS:
1. Examine each search snippet carefully.
2. Even if the information is brief, extract any relevant facts, dates, numbers, or specific claims that help answer the task.
3. If a snippet mentions a specific detail but is cut off, report what is available.
4. If multiple sources mention the same fact, include them as separate entries or combine with multiple sources if your format allows (but stick to the requested JSON structure).
5. RETURN A JSON ARRAY of findings. If NO relevant information is found AT ALL after careful reading, return an empty array [].

Return a JSON array with objects containing: source_url, fact, context
`;
            response = await this.client.generateText(this.workerModel, prompt, WORKER_PROMPT, true);
        } else {
            // Gemini: Use Google Search grounding
            const tools = [{ googleSearch: {} }];
            prompt = `
Task: ${JSON.stringify(task)}
Using the Google Search tool, find high-quality information to answer this task.
`;
            response = await (this.client as GeminiClient).generateText(this.workerModel, prompt, WORKER_PROMPT, true, tools);
        }

        try {
            return JSON.parse(response);
        } catch {
            console.log("Worker returned invalid JSON, attempting repair...");
            const repairPrompt = `Fix this JSON array:\n\n${response}\n\nReturn valid JSON array with: source_url, fact, context`;
            const fixed = await this.client.generateText(this.workerModel, repairPrompt, "Return ONLY valid JSON.", true);
            return JSON.parse(fixed);
        }
    }

    async runVerifier(
        findings: WorkerFinding[],
        context: GlobalContext
    ): Promise<{ cleaned_findings: WorkerFinding[]; conflicts: ConflictItem[] }> {
        const prompt = `
    New Findings: ${JSON.stringify(findings)}
    Global Context: ${JSON.stringify(context)}
    `;
        const response = await this.client.generateText(this.managerModel, prompt, VERIFIER_PROMPT, true);

        try {
            return JSON.parse(response);
        } catch {
            console.log("Verifier returned invalid JSON, attempting repair...");
            const repairPrompt = `Fix this JSON:\n\n${response}`;
            const fixed = await this.client.generateText(this.managerModel, repairPrompt, "Return ONLY valid JSON.", true);
            return JSON.parse(fixed);
        }
    }

    async runWriter(context: GlobalContext): Promise<string> {
        const prompt = `Global Context: ${JSON.stringify(context)}`;
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
        } catch {
            console.log("Clarifier returned invalid JSON, attempting repair...");
            const repairPrompt = `Fix this JSON:\n\n${response}`;
            const fixed = await this.client.generateText(this.workerModel, repairPrompt, "Return ONLY valid JSON.", true);
            return JSON.parse(fixed);
        }
    }
}
