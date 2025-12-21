"use server";

import { ResearchAgent, GlobalContext, WorkerFinding, ProviderType } from "@/lib/agents";
import { GeminiClient } from "@/lib/gemini";

export async function runManagerAction(
    apiKey: string,
    query: string,
    context: GlobalContext,
    model: string,
    baseUrl?: string,
    provider: ProviderType = "gemini"
) {
    const agent = new ResearchAgent(apiKey, model, undefined, baseUrl, provider);
    return await agent.runManager(query, context);
}

export async function runWorkerAction(
    apiKey: string,
    task: any,
    model: string,
    baseUrl?: string,
    provider: ProviderType = "gemini"
) {
    const agent = new ResearchAgent(apiKey, undefined, model, baseUrl, provider);
    return await agent.runWorker(task);
}

export async function runVerifierAction(
    apiKey: string,
    findings: WorkerFinding[],
    context: GlobalContext,
    model: string,
    baseUrl?: string,
    provider: ProviderType = "gemini"
) {
    const agent = new ResearchAgent(apiKey, model, undefined, baseUrl, provider);
    return await agent.runVerifier(findings, context);
}

export async function runWriterAction(
    apiKey: string,
    context: GlobalContext,
    model: string,
    baseUrl?: string,
    provider: ProviderType = "gemini"
) {
    const agent = new ResearchAgent(apiKey, model, undefined, baseUrl, provider);
    return await agent.runWriter(context);
}

export async function getAvailableModels(apiKey: string, baseUrl?: string) {
    const client = new GeminiClient(apiKey, baseUrl);
    return await client.listModels();
}

export async function runClarifierAction(
    apiKey: string,
    query: string,
    model: string,
    conversationContext?: string,
    baseUrl?: string,
    provider: ProviderType = "gemini"
) {
    const agent = new ResearchAgent(apiKey, undefined, model, baseUrl, provider);
    return await agent.runClarifier(query, conversationContext);
}

export async function getOpenAIModels(apiKey: string, host?: string) {
    const baseUrl = host || "https://api.openai.com/v1";
    try {
        const response = await fetch(`${baseUrl}/models`, {
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            }
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch OpenAI models: ${response.statusText}`);
        }
        const data = await response.json();
        return data.data
            .map((m: any) => ({
                name: m.id,
                displayName: m.id
            }))
            .sort((a: any, b: any) => a.name.localeCompare(b.name));
    } catch (error) {
        console.error("Failed to fetch OpenAI models", error);
        return [];
    }
}
