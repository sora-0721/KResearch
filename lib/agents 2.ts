import { GoogleGenerativeAI } from "@google/generative-ai";
import { GlobalContext, AgentResponse, Task, Finding } from "./types";

// System Prompts
const MANAGER_PROMPT = `You are the Lead Researcher. You govern the state of a deep-dive investigation.
Your Goal: Answer the User's Query exhaustively by dispatching Worker Agents to find missing information.

INPUTS:
1. User Original Query
2. Global Context (What we have learned so far)
3. Iteration Count (Current Loop #)

YOUR RESPONSIBILITIES:
1. GAP ANALYSIS: Read the Global Context. What is missing? Be specific. (e.g., "We have the product features, but we lack the technical architecture.")
2. DIGRESSION CHECK: Ensure the missing info is strictly relevant to the User Query. Do not go down rabbit holes.
3. SUFFICIENCY SCORE: Rate the current completeness of the answer (0-100).
   - 0-50%: Missing basic facts.
   - 51-80%: Have facts, but missing nuance/technical depth or verification.
   - 81-99%: Comprehensive, verified, deep.
   - 100%: Perfect.

OUTPUT FORMAT (JSON ONLY):
{
  "thoughts": "Analyze the current state. Explain why we are or are not done.",
  "sufficiency_score": <integer>,
  "is_finished": <boolean>, // Set true ONLY if score > 90 or Iteration > Max_Loops
  "next_step": {
    "task_description": "Precise instruction for the Worker.",
    "search_queries": ["Query 1", "Query 2"],
    "focus_area": "What specific detail to look for."
  }
}`;

const WORKER_PROMPT = `You are the Field Investigator. You receive a specific sub-task from the Manager.
Your Goal: Gather high-fidelity facts, quotes, and data.

YOUR RULES:
1. DEEP DIVES ONLY: Do not return generic marketing fluff. Look for technical docs, whitepapers, financial reports, or direct user analyses.
2. ITERATIVE SEARCH: If your first search query fails, try a different angle immediately. Do not give up.
3. SOURCE INTEGRITY: prioritize primary sources (official docs) over secondary sources (blogs).

OUTPUT FORMAT (JSON ONLY):
{
  "thoughts": "Briefly explain your search strategy.",
  "findings": [
    {
      "sourceUrl": "URL of the source",
      "content": "Direct quote or data point",
      "context": "Why this matters",
      "verified": false
    }
  ]
}`;

const VERIFIER_PROMPT = `You are the Fact Auditor. You receive new findings from the Worker and compare them against the Global Context.

YOUR RESPONSIBILITIES:
1. DEDUPLICATION: If a new finding is already in the Global Context, discard it.
2. CONFLICT RESOLUTION: If New Finding says "X" and Global Context says "Y", flag this as a CONFLICT. Do not delete either. Mark for synthesis.
3. RELEVANCE: Discard findings that drifted away from the original user topic.

OUTPUT FORMAT (JSON ONLY):
{
  "thoughts": "Explain what was kept and what was discarded.",
  "cleanedFindings": [
    {
      "sourceUrl": "URL",
      "content": "Content",
      "context": "Context",
      "verified": true
    }
  ]
}`;

const WRITER_PROMPT = `You are the Final Reporter. You receive the Global Context.
Write a comprehensive report.

RULES:
1. SYNTHESIS: Do not list facts. Weave them into a narrative.
2. CONFLICTS: If the context contains conflicting data (e.g. different prices), report BOTH and explain the discrepancy.
3. CITATION: Every claim must reference the specific source URL from the context.

OUTPUT FORMAT (JSON ONLY):
{
  "report": "Markdown formatted report string..."
}`;

export class AgentSystem {
    private genAI: GoogleGenerativeAI;
    private managerModel: any;
    private workerModel: any;
    private verifierModel: any;
    private writerModel: any;

    constructor(apiKey: string, managerModelName: string = "gemini-2.0-flash", workerModelName: string = "gemini-2.0-flash") {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.managerModel = this.genAI.getGenerativeModel({ model: managerModelName, generationConfig: { responseMimeType: "application/json" } });
        this.workerModel = this.genAI.getGenerativeModel({ model: workerModelName, generationConfig: { responseMimeType: "application/json" } });
        // Verifier and Writer use a high-logic model, defaulting to the manager's choice or a strong default
        this.verifierModel = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash", generationConfig: { responseMimeType: "application/json" } });
        this.writerModel = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash", generationConfig: { responseMimeType: "application/json" } });
    }

    async getEmbedding(text: string): Promise<number[]> {
        const embeddingModel = this.genAI.getGenerativeModel({ model: "text-embedding-004" });
        const result = await embeddingModel.embedContent(text);
        return result.embedding.values;
    }

    calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
        const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
        const magnitudeA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
        const magnitudeB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
        return dotProduct / (magnitudeA * magnitudeB);
    }

    async runManager(context: GlobalContext): Promise<AgentResponse> {
        const prompt = `${MANAGER_PROMPT}\n\nUSER QUERY: ${context.originalQuery}\nGLOBAL CONTEXT: ${JSON.stringify(context.findings)}\nITERATION: ${context.iteration}`;
        const result = await this.managerModel.generateContent(prompt);
        return JSON.parse(result.response.text());
    }

    async runWorker(task: Task): Promise<AgentResponse> {
        // In a real implementation, this would use a search tool. 
        // Since I cannot implement a real web search loop here without an external search API,
        // I will simulate the worker using the LLM's internal knowledge for now, 
        // OR I would need to integrate a search API like Google Custom Search or Tavily.
        // For this prototype, we will rely on the LLM's grounding or internal knowledge.
        // NOTE: The prompt implies the worker *performs* searches. 
        // To make this functional without a search API key, we will ask the LLM to simulate the findings based on its training data,
        // effectively acting as a "Search Simulator".

        const prompt = `${WORKER_PROMPT}\n\nTASK: ${JSON.stringify(task)}`;
        const result = await this.workerModel.generateContent(prompt);
        return JSON.parse(result.response.text());
    }

    async runVerifier(newFindings: Finding[], currentContext: GlobalContext): Promise<AgentResponse> {
        const prompt = `${VERIFIER_PROMPT}\n\nNEW FINDINGS: ${JSON.stringify(newFindings)}\nEXISTING CONTEXT: ${JSON.stringify(currentContext.findings)}`;
        const result = await this.verifierModel.generateContent(prompt);
        return JSON.parse(result.response.text());
    }

    async runWriter(context: GlobalContext): Promise<AgentResponse> {
        const prompt = `${WRITER_PROMPT}\n\nGLOBAL CONTEXT: ${JSON.stringify(context)}`;
        const result = await this.writerModel.generateContent(prompt);
        return JSON.parse(result.response.text());
    }
}
