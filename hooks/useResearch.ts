"use client";

import { useState, useRef, useCallback } from "react";
import { AgentState, LogEntry, HistoryItem } from "@/types/research";
import { GlobalContext } from "@/lib/types";
import { runManagerAction, runWorkerAction, runVerifierAction, runWriterAction } from "@/app/actions";

interface UseResearchProps {
    apiKey: string;
    getNextApiKey: () => { key: string; index: number };
    resetApiKeyRotation: () => void;
    geminiBaseUrl: string;
    modelProvider: "gemini" | "openai";
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
    const { getNextApiKey, resetApiKeyRotation, geminiBaseUrl, modelProvider, openaiApiKey, openaiApiHost, managerModel, workerModel, verifierModel, researchMode, minIterations, maxIterations } = props;
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

            // Get next API key in rotation for manager
            const managerApiKey = getNextApiKey();
            addLog("System", `Using API key #${managerApiKey.index + 1}`);
            const providerConfig = { provider: modelProvider, openaiApiHost };

            const managerOutput = await runManagerAction(managerApiKey.key, query, currentContext, managerModel, geminiBaseUrl || undefined, providerConfig);
            addLog("Manager", `Assessment complete. Score: ${managerOutput.sufficiency_score}%`, managerOutput);
            setSufficiencyScore(managerOutput.sufficiency_score);
            let isFinished = managerOutput.is_finished || managerOutput.sufficiency_score >= 95;
            if (researchMode === "deeper") {
                if (currentContext.iteration < minIterations && isFinished) { addLog("System", `Deeper Mode: Iteration ${currentContext.iteration + 1}/${minIterations}. Expanding.`); isFinished = false; }
                if (maxIterations !== 999 && currentContext.iteration >= maxIterations) { addLog("System", `Max iterations reached.`); isFinished = true; }
            }
            if (isFinished) {
                setAgentState("writer"); addLog("System", "Generating final report...");
                const writerApiKey = getNextApiKey();
                const report = await runWriterAction(writerApiKey.key, currentContext, managerModel, geminiBaseUrl || undefined, providerConfig);
                setFinalReport(report); setAgentState("complete"); setIsResearching(false); setEndTime(Date.now());
                addLog("Writer", "Report generated."); return;
            }
            setAgentState("worker"); addLog("Worker", `Executing: ${managerOutput.next_step.task_description}`);
            const workerApiKey = getNextApiKey();
            const findings = await runWorkerAction(workerApiKey.key, managerOutput.next_step, workerModel, geminiBaseUrl || undefined, providerConfig);
            addLog("Worker", `Found ${findings.length} new items.`, findings);
            setAgentState("verifier"); addLog("Verifier", "Verifying and deduplicating findings...");
            const verifierApiKey = getNextApiKey();
            const verification = await runVerifierAction(verifierApiKey.key, findings, currentContext, verifierModel, geminiBaseUrl || undefined, providerConfig);
            addLog("Verifier", `Verification complete. ${verification.cleaned_findings.length} valid findings.`, verification);
            const newContext: GlobalContext = {
                ...currentContext, iteration: currentContext.iteration + 1,
                knowledge_bank: [...currentContext.knowledge_bank, ...verification.cleaned_findings.map(f => ({ topic: managerOutput.next_step.focus_area, facts: [f.fact], sources: [f.source_url], verified: true }))],
                conflicts: [...currentContext.conflicts, ...verification.conflicts]
            };
            setGlobalContext(newContext); setTimeout(() => processLoop(newContext, query), 100);
        } catch (error) { console.error("Research error:", error); addLog("System", "An error occurred.", error); setAgentState("failed"); setIsResearching(false); setEndTime(Date.now()); }
    }, [getNextApiKey, geminiBaseUrl, managerModel, workerModel, verifierModel, researchMode, minIterations, maxIterations, addLog]);

    const startResearch = useCallback((query: string, isContinuation = false) => {
        setIsResearching(true); setEndTime(null);
        let contextToUse = globalContext;
        if (!isContinuation) {
            setAgentState("manager"); setLogs([]); setFinalReport(null); setSufficiencyScore(0); setIteration(0);
            setStartTime(Date.now());
            contextToUse = { project_name: "Research Task", original_query: query, status: "in_progress", iteration: 0, knowledge_bank: [], conflicts: [], research_mode: researchMode === "deeper" ? "deep" : "standard" };
            setGlobalContext(contextToUse);
        } else { addLog("System", "Resuming research session..."); }
        if (contextToUse) processLoop(contextToUse, query);
        return Math.random().toString(36).substring(7);
    }, [globalContext, researchMode, processLoop, addLog]);

    const regenerateReport = useCallback(async () => {
        if (!globalContext) return;
        setIsRegenerating(true);
        addLog("System", "Regenerating final report...");
        try {
            const writerApiKey = getNextApiKey();
            const providerConfig = { provider: modelProvider, openaiApiHost };
            const report = await runWriterAction(writerApiKey.key, globalContext, managerModel, geminiBaseUrl || undefined, providerConfig);
            setFinalReport(report);
            addLog("Writer", "Report regenerated successfully.");
        } catch (error) { addLog("System", "Failed to regenerate report.", error); }
        setIsRegenerating(false);
    }, [globalContext, getNextApiKey, geminiBaseUrl, managerModel, addLog]);

    const stopResearch = useCallback(() => { setIsResearching(false); setEndTime(Date.now()); }, []);

    const loadSession = useCallback((session: HistoryItem) => {
        setLogs(session.logs); setGlobalContext(session.globalContext);
        setFinalReport(session.finalReport); setSufficiencyScore(session.sufficiencyScore);
        setAgentState(session.agentState); setIteration(session.globalContext?.iteration || 0);
        setIsResearching(false);
        // Restore elapsed time from history
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
