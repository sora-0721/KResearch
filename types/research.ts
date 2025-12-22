// Types for KResearch UI

import { GlobalContext } from "@/lib/types";

export type AgentState = "idle" | "clarifying" | "manager" | "worker" | "verifier" | "writer" | "complete" | "failed";

export interface LogEntry {
    id: string;
    timestamp: string;
    agent: "Manager" | "Worker" | "Verifier" | "Writer" | "System" | "Clarifier";
    message: string;
    details?: any;
}

export interface ModelOption {
    name: string;
    displayName: string;
}

export interface ClarificationMessage {
    role: "assistant" | "user";
    content: string;
}

export interface HistoryItem {
    id: string;
    query: string;
    timestamp: string;
    status: "in_progress" | "complete" | "failed";
    sufficiencyScore: number;
    logs: LogEntry[];
    globalContext: GlobalContext | null;
    finalReport: string | null;
    researchMode: "standard" | "deeper";
    agentState: AgentState;
    elapsedTime?: number; // Time in milliseconds
}

export interface ApiKeyEntry {
    id: string;
    key: string;
}

export interface ResearchSettings {
    apiKey: string; // Deprecated: kept for backward compatibility
    geminiApiKeys: ApiKeyEntry[];
    geminiBaseUrl: string;
    openaiApiKey: string;
    openaiApiHost: string;
    managerModel: string;
    workerModel: string;
    verifierModel: string;
    clarifierModel: string;
    minIterations: number;
    maxIterations: number;
    researchMode: "standard" | "deeper";
}

export type ProviderType = "gemini" | "openai";

// No default models - models are fetched from API only
export const DEFAULT_MODELS: ModelOption[] = [];
