"use server";

import { ResearchAgent, GlobalContext, WorkerFinding, ConflictItem } from "@/lib/agents";
import { GeminiClient } from "@/lib/gemini";

export async function runManagerAction(apiKey: string, query: string, context: GlobalContext, model: string, baseUrl?: string, providerConfig?: { provider: "gemini" | "openai", openaiApiHost?: string }) {
    const agent = new ResearchAgent(apiKey, model, undefined, baseUrl, providerConfig);
    return await agent.runManager(query, context);
}

export async function runWorkerAction(apiKey: string, task: any, model: string, baseUrl?: string, providerConfig?: { provider: "gemini" | "openai", openaiApiHost?: string }) {
    const agent = new ResearchAgent(apiKey, undefined, model, baseUrl, providerConfig);
    return await agent.runWorker(task);
}

export async function runVerifierAction(apiKey: string, findings: WorkerFinding[], context: GlobalContext, model: string, baseUrl?: string, providerConfig?: { provider: "gemini" | "openai", openaiApiHost?: string }) {
    const agent = new ResearchAgent(apiKey, model, undefined, baseUrl, providerConfig);
    return await agent.runVerifier(findings, context);
}

export async function runWriterAction(apiKey: string, context: GlobalContext, model: string, baseUrl?: string, providerConfig?: { provider: "gemini" | "openai", openaiApiHost?: string }) {
    const agent = new ResearchAgent(apiKey, model, undefined, baseUrl, providerConfig);
    return await agent.runWriter(context);
}

export async function getAvailableModels(apiKey: string, baseUrl?: string, provider: "gemini" | "openai" = "gemini") {
    if (provider === "openai") {
        try {
            const url = baseUrl ? `${baseUrl}/models` : "https://api.openai.com/v1/models";
            const response = await fetch(url, {
                headers: { "Authorization": `Bearer ${apiKey}` }
            });
            if (!response.ok) return [];
            const data = await response.json();
            return data.data.map((m: any) => ({ name: m.id, displayName: m.id }));
        } catch (e) {
            console.error("Failed to fetch OpenAI models", e);
            return [];
        }
    }
    const client = new GeminiClient(apiKey, baseUrl);
    return await client.listModels();
}

export async function runClarifierAction(apiKey: string, query: string, model: string, conversationContext?: string, baseUrl?: string, providerConfig?: { provider: "gemini" | "openai", openaiApiHost?: string }) {
    const agent = new ResearchAgent(apiKey, undefined, model, baseUrl, providerConfig);
    return await agent.runClarifier(query, conversationContext);
}

