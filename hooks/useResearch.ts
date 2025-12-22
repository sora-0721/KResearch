"use client";

import { useState, useRef, useCallback } from "react";
import { AgentState, LogEntry, HistoryItem, ProviderType } from "@/types/research";
import { GlobalContext } from "@/lib/types";
import { runManagerAction, runWorkerAction, runVerifierAction, runWriterAction } from "@/app/actions";

interface UseResearchProps {
    activeProvider: ProviderType;
    apiKey: string; // Legacy/Single Gemini Key
    getNextApiKey: () => { key: string; index: number };
    resetApiKeyRotation: () => void;
    geminiBaseUrl: string;
    openaiApiKey: string;
    openaiApiHost: string;
    managerModel: string;
    workerModel: string;
    verifierModel: string;
    clarifierModel: string;
    researchMode: "standard" | "deeper";
    minIterations: number;
    maxIterations: number;
}

export function useResearch(props: UseResearchProps) {
    const {
        activeProvider, getNextApiKey, resetApiKeyRotation, geminiBaseUrl,
        openaiApiKey, openaiApiHost,
        managerModel, workerModel, verifierModel, researchMode, minIterations, maxIterations
    } = props;
    const [isResearching, setIsResearching] = useState(false);
    const [agentState, setAgentState] = useState<AgentState>("idle");
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [globalContext, setGlobalContext] = useState<GlobalContext | null>(null);
    const [finalReport, setFinalReport] = useState<string | null>(null);
    const [sufficiencyScore, setSufficiencyScore] = useState(0);
    const [iteration, setIteration] = useState(0);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [endTime, setEndTime] = useState<number | null>(null);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const logsEndRef = useRef<HTMLDivElement>(null);

    const addLog = useCallback((agent: LogEntry["agent"], message: string, details?: any) => {
        setLogs(prev => [...prev, { id: Math.random().toString(36).substring(7), timestamp: new Date().toLocaleTimeString(), agent, message, details }]);
    }, []);

    const processLoop = useCallback(async (currentContext: GlobalContext, query: string) => {
        try {
            setIteration(currentContext.iteration); setAgentState("manager");
            addLog("Manager", `Starting Iteration ${currentContext.iteration + 1}. Assessing knowledge gap...`);

            // Determine API Key and Base URL based on provider
            let currentApiKey: string;
            let currentBaseUrl: string | undefined;

            if (activeProvider === "openai") {
                currentApiKey = openaiApiKey;
                currentBaseUrl = openaiApiHost || undefined;
            } else {
                const rotated = getNextApiKey();
                currentApiKey = rotated.key;
                currentBaseUrl = geminiBaseUrl || undefined;
                addLog("System", `Using Gemini API key #${rotated.index + 1}`);
            }

            const managerOutput = await runManagerAction(currentApiKey, query, currentContext, managerModel, currentBaseUrl, activeProvider);
            addLog("Manager", `Assessment complete. Score: ${managerOutput.sufficiency_score}%`, managerOutput);
            setSufficiencyScore(managerOutput.sufficiency_score);

            let isFinished = managerOutput.is_finished || managerOutput.sufficiency_score >= 95;
            if (researchMode === "deeper") {
                if (currentContext.iteration < minIterations && isFinished) { addLog("System", `Deeper Mode: Iteration ${currentContext.iteration + 1}/${minIterations}. Expanding.`); isFinished = false; }
                if (maxIterations !== 999 && currentContext.iteration >= maxIterations) { addLog("System", `Max iterations reached.`); isFinished = true; }
            }

            if (isFinished) {
                setAgentState("writer"); addLog("System", "Generating final report...");
                const writerReport = await runWriterAction(currentApiKey, currentContext, managerModel, currentBaseUrl, activeProvider);
                setFinalReport(writerReport); setAgentState("complete"); setIsResearching(false); setEndTime(Date.now());
                addLog("Writer", "Report generated."); return;
            }

            setAgentState("worker"); addLog("Worker", `Executing: ${managerOutput.next_step.task_description}`);
            const rawFindings = await runWorkerAction(currentApiKey, managerOutput.next_step, workerModel, currentBaseUrl, activeProvider);
            const findings = Array.isArray(rawFindings) ? rawFindings : [];
            addLog("Worker", `Found ${findings.length} new items.`, findings);

            setAgentState("verifier"); addLog("Verifier", "Verifying and deduplicating findings...");
            const verification = await runVerifierAction(currentApiKey, findings, currentContext, verifierModel, currentBaseUrl, activeProvider);

            const cleanedFindings = Array.isArray(verification.cleaned_findings) ? verification.cleaned_findings : [];
            const conflicts = Array.isArray(verification.conflicts) ? verification.conflicts : [];

            addLog("Verifier", `Verification complete. ${cleanedFindings.length} valid findings.`, verification);

            const newContext: GlobalContext = {
                ...currentContext, iteration: currentContext.iteration + 1,
                knowledge_bank: [...currentContext.knowledge_bank, ...cleanedFindings.map(f => ({ topic: managerOutput.next_step.focus_area, facts: [f.fact], sources: [f.source_url], verified: true }))],
                conflicts: [...currentContext.conflicts, ...conflicts]
            };
            setGlobalContext(newContext); setTimeout(() => processLoop(newContext, query), 100);
        } catch (error) { console.error("Research error:", error); addLog("System", "An error occurred.", error); setAgentState("failed"); setIsResearching(false); setEndTime(Date.now()); }
    }, [activeProvider, openaiApiKey, openaiApiHost, getNextApiKey, geminiBaseUrl, managerModel, workerModel, verifierModel, researchMode, minIterations, maxIterations, addLog]);

    const startResearch = useCallback((query: string, isContinuation = false) => {
        setIsResearching(true); setEndTime(null);
        let contextToUse = globalContext;
        if (!isContinuation) {
            if (activeProvider === "gemini") {
                resetApiKeyRotation();
            }
            setAgentState("manager"); setLogs([]); setFinalReport(null); setSufficiencyScore(0); setIteration(0);
            setStartTime(Date.now());
            contextToUse = { project_name: "Research Task", original_query: query, status: "in_progress", iteration: 0, knowledge_bank: [], conflicts: [], research_mode: researchMode === "deeper" ? "deep" : "standard" };
            setGlobalContext(contextToUse);
        } else { addLog("System", "Resuming research session..."); }
        if (contextToUse) processLoop(contextToUse, query);
        return Math.random().toString(36).substring(7);
    }, [activeProvider, resetApiKeyRotation, globalContext, researchMode, processLoop, addLog]);

    const regenerateReport = useCallback(async () => {
        if (!globalContext) return;
        setIsRegenerating(true);
        addLog("System", "Regenerating final report...");
        try {
            let currentApiKey: string;
            let currentBaseUrl: string | undefined;

            if (activeProvider === "openai") {
                currentApiKey = openaiApiKey;
                currentBaseUrl = openaiApiHost || undefined;
            } else {
                currentApiKey = getNextApiKey().key;
                currentBaseUrl = geminiBaseUrl || undefined;
            }

            const report = await runWriterAction(currentApiKey, globalContext, managerModel, currentBaseUrl, activeProvider);
            setFinalReport(report);
            addLog("Writer", "Report regenerated successfully.");
        } catch (error) { addLog("System", "Failed to regenerate report.", error); }
        setIsRegenerating(false);
    }, [activeProvider, openaiApiKey, openaiApiHost, getNextApiKey, geminiBaseUrl, globalContext, managerModel, addLog]);

    const stopResearch = useCallback(() => { setIsResearching(false); setEndTime(Date.now()); }, []);

    const loadSession = useCallback((session: HistoryItem) => {
        setLogs(session.logs); setGlobalContext(session.globalContext);
        setFinalReport(session.finalReport); setSufficiencyScore(session.sufficiencyScore);
        setAgentState(session.agentState); setIteration(session.globalContext?.iteration || 0);
        setIsResearching(false);
        if (session.elapsedTime) {
            setStartTime(0); setEndTime(session.elapsedTime);
        } else {
            setStartTime(null); setEndTime(null);
        }
    }, []);

    return {
        isResearching, agentState, logs, globalContext, finalReport, sufficiencyScore, iteration,
        startTime, endTime, isRegenerating, logsEndRef, startResearch, stopResearch, loadSession,
        regenerateReport, addLog, setAgentState, setLogs, setGlobalContext, setFinalReport,
        setSufficiencyScore, setIteration, setIsResearching
    };
}
