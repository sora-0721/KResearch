"use server";

import { ResearchAgent, GlobalContext, WorkerFinding, ConflictItem } from "@/lib/agents";
import { GeminiClient } from "@/lib/gemini";

export async function runManagerAction(apiKey: string, query: string, context: GlobalContext, model: string, baseUrl?: string) {
    const agent = new ResearchAgent(apiKey, model, undefined, baseUrl);
    return await agent.runManager(query, context);
}

export async function runWorkerAction(apiKey: string, task: any, model: string, baseUrl?: string) {
    const agent = new ResearchAgent(apiKey, undefined, model, baseUrl);
    return await agent.runWorker(task);
}

export async function runVerifierAction(apiKey: string, findings: WorkerFinding[], context: GlobalContext, model: string, baseUrl?: string) {
    const agent = new ResearchAgent(apiKey, model, undefined, baseUrl);
    return await agent.runVerifier(findings, context);
}

export async function runWriterAction(apiKey: string, context: GlobalContext, model: string, baseUrl?: string) {
    const agent = new ResearchAgent(apiKey, model, undefined, baseUrl);
    return await agent.runWriter(context);
}

export async function getAvailableModels(apiKey: string, baseUrl?: string) {
    const client = new GeminiClient(apiKey, baseUrl);
    return await client.listModels();
}

export async function runClarifierAction(apiKey: string, query: string, model: string, conversationContext?: string, baseUrl?: string) {
    const agent = new ResearchAgent(apiKey, undefined, model, baseUrl);
    return await agent.runClarifier(query, conversationContext);
}

