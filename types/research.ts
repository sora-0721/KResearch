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

export interface ResearchSettings {
    apiKey: string;
    managerModel: string;
    workerModel: string;
    verifierModel: string;
    clarifierModel: string;
    minIterations: number;
    maxIterations: number;
    researchMode: "standard" | "deeper";
}

export const DEFAULT_MODELS: ModelOption[] = [
    { name: "models/gemini-3-pro-preview", displayName: "gemini-3-pro-preview (Preview)" },
    { name: "gemini-flash-latest", displayName: "gemini-flash-latest (Default)" },
    { name: "gemini-2.0-flash-exp", displayName: "gemini-2.0-flash-exp" },
    { name: "gemini-1.5-pro", displayName: "gemini-1.5-pro" },
    { name: "gemini-1.5-flash", displayName: "gemini-1.5-flash" }
];
