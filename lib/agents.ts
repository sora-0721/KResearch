import { GeminiClient } from "./gemini";
import { OpenAIClient } from "./openai";
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

export class ResearchAgent {
    private client: GeminiClient | OpenAIClient;
    private managerModel: string;
    private workerModel: string;

    constructor(
        apiKey: string,
        managerModel: string = "gemini-flash-latest",
        workerModel: string = "gemini-flash-latest",
        baseUrl?: string,
        providerConfig?: { provider: "gemini" | "openai", openaiApiHost?: string }
    ) {
        if (providerConfig?.provider === "openai") {
            // Use OpenAI Client
            // Note: OpenAI API key is passed as 'apiKey' here because upstream logic passes the active key
            const host = providerConfig.openaiApiHost || baseUrl; // Fallback to baseUrl if host not explicit
            this.client = new OpenAIClient(apiKey, host);
        } else {
            // Default to Gemini
            this.client = new GeminiClient(apiKey, baseUrl);
        }
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
        } catch {
            console.log("Manager returned invalid JSON, attempting repair...");
            const repairPrompt = `Fix this JSON and return ONLY valid JSON:\n\n${response}`;
            const fixed = await this.client.generateText(this.managerModel, repairPrompt, "Return ONLY valid JSON.", true);
            return JSON.parse(fixed);
        }
    }

    async runWorker(task: any): Promise<WorkerFinding[]> {
        const tools = [{ googleSearch: {} }];
        const prompt = `
    Task: ${JSON.stringify(task)}
    Using the Google Search tool, find high-quality information to answer this task.
    `;
        const response = await this.client.generateText(this.workerModel, prompt, WORKER_PROMPT, true, tools);

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

        const parseAndValidate = (text: string) => {
            const parsed = JSON.parse(text);
            if (!Array.isArray(parsed.cleaned_findings)) parsed.cleaned_findings = [];
            if (!Array.isArray(parsed.conflicts)) parsed.conflicts = [];
            return parsed;
        };

        try {
            return parseAndValidate(response);
        } catch {
            console.log("Verifier returned invalid JSON, attempting repair...");
            const repairPrompt = `Fix this JSON:\n\n${response}`;
            const fixed = await this.client.generateText(this.managerModel, repairPrompt, "Return ONLY valid JSON.", true);
            try {
                return parseAndValidate(fixed);
            } catch {
                return { cleaned_findings: [], conflicts: [] }; // Fallback to safe empty state
            }
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
            try {
                return JSON.parse(fixed);
            } catch {
                return { is_clear: true, questions: [], reasoning: "Failed to parse clarification response." };
            }
        }
    }
}
