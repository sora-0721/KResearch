"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { SettingsModal } from "@/components/SettingsModal";
import { HistoryDrawer } from "@/components/HistoryDrawer";
import { BrainVisualization } from "@/components/ui/BrainVisualization";
import { GlobalContext, ManagerOutput, WorkerFinding, ClarifierOutput } from "@/lib/agents";
import { runManagerAction, runWorkerAction, runVerifierAction, runWriterAction, getAvailableModels, runClarifierAction } from "./actions";

// --- Types ---

type AgentState = "idle" | "clarifying" | "manager" | "worker" | "verifier" | "writer" | "complete" | "failed";

interface LogEntry {
  id: string;
  timestamp: string;
  agent: "Manager" | "Worker" | "Verifier" | "Writer" | "System" | "Clarifier";
  message: string;
  details?: any;
}

interface ModelOption {
  name: string;
  displayName: string;
}

interface ClarificationMessage {
  role: "assistant" | "user";
  content: string;
}

interface HistoryItem {
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
}

// --- Main Component ---

export default function Home() {
  // Config State
  const [apiKey, setApiKey] = useState("");
  const [managerModel, setManagerModel] = useState("models/gemini-3-pro-preview");
  const [workerModel, setWorkerModel] = useState("gemini-flash-latest");
  const [verifierModel, setVerifierModel] = useState("gemini-flash-latest");
  const [clarifierModel, setClarifierModel] = useState("gemini-flash-latest");
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([
    { name: "models/gemini-3-pro-preview", displayName: "gemini-3-pro-preview (Preview)" },
    { name: "gemini-flash-latest", displayName: "gemini-flash-latest (Default)" },
    { name: "gemini-2.0-flash-exp", displayName: "gemini-2.0-flash-exp" },
    { name: "gemini-1.5-pro", displayName: "gemini-1.5-pro" },
    { name: "gemini-1.5-flash", displayName: "gemini-1.5-flash" }
  ]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Deeper Research Mode Settings
  const [minIterations, setMinIterations] = useState(15);
  const [maxIterations, setMaxIterations] = useState(999);

  // UI State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Clarification State
  const [isClarifying, setIsClarifying] = useState(false);
  const [clarificationMessages, setClarificationMessages] = useState<ClarificationMessage[]>([]);
  const [clarificationInput, setClarificationInput] = useState("");
  const [isWaitingForClarification, setIsWaitingForClarification] = useState(false);

  // Research State
  const [query, setQuery] = useState("");
  const [isResearching, setIsResearching] = useState(false);
  const [researchMode, setResearchMode] = useState<"standard" | "deeper">("standard");
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [globalContext, setGlobalContext] = useState<GlobalContext | null>(null);
  const [finalReport, setFinalReport] = useState<string | null>(null);
  const [sufficiencyScore, setSufficiencyScore] = useState(0);
  const [iteration, setIteration] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Refs for scrolling
  const logsEndRef = useRef<HTMLDivElement>(null);
  const clarificationEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  useEffect(() => {
    clarificationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [clarificationMessages]);

  // Load from LocalStorage
  useEffect(() => {
    const storedKey = localStorage.getItem("gemini_api_key");
    if (storedKey) setApiKey(storedKey);

    const storedManagerModel = localStorage.getItem("kresearch_manager_model");
    const storedWorkerModel = localStorage.getItem("kresearch_worker_model");
    const storedVerifierModel = localStorage.getItem("kresearch_verifier_model");
    const storedClarifierModel = localStorage.getItem("kresearch_clarifier_model");
    if (storedManagerModel) setManagerModel(storedManagerModel);
    if (storedWorkerModel) setWorkerModel(storedWorkerModel);
    if (storedVerifierModel) setVerifierModel(storedVerifierModel);
    if (storedClarifierModel) setClarifierModel(storedClarifierModel);

    const storedMinIterations = localStorage.getItem("kresearch_min_iterations");
    const storedMaxIterations = localStorage.getItem("kresearch_max_iterations");
    const storedResearchMode = localStorage.getItem("kresearch_research_mode");
    if (storedMinIterations) setMinIterations(Number(storedMinIterations));
    if (storedMaxIterations) setMaxIterations(Number(storedMaxIterations));
    if (storedResearchMode === "standard" || storedResearchMode === "deeper") {
      setResearchMode(storedResearchMode);
    }

    const storedHistory = localStorage.getItem("kresearch_history");
    if (storedHistory) {
      try {
        setHistory(JSON.parse(storedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save preferences to localStorage
  useEffect(() => { localStorage.setItem("kresearch_manager_model", managerModel); }, [managerModel]);
  useEffect(() => { localStorage.setItem("kresearch_worker_model", workerModel); }, [workerModel]);
  useEffect(() => { localStorage.setItem("kresearch_verifier_model", verifierModel); }, [verifierModel]);
  useEffect(() => { localStorage.setItem("kresearch_clarifier_model", clarifierModel); }, [clarifierModel]);
  useEffect(() => { localStorage.setItem("kresearch_min_iterations", String(minIterations)); }, [minIterations]);
  useEffect(() => { localStorage.setItem("kresearch_max_iterations", String(maxIterations)); }, [maxIterations]);
  useEffect(() => { localStorage.setItem("kresearch_research_mode", researchMode); }, [researchMode]);
  useEffect(() => { localStorage.setItem("kresearch_history", JSON.stringify(history)); }, [history]);

  // Fetch models when API Key changes
  useEffect(() => {
    const fetchModels = async () => {
      if (apiKey.length > 10) {
        localStorage.setItem("gemini_api_key", apiKey);
        setIsLoadingModels(true);
        try {
          const models = await getAvailableModels(apiKey);
          if (models && models.length > 0) {
            const formattedModels = models
              .filter((m: any) => m.name.includes("gemini"))
              .map((m: any) => ({
                name: m.name,
                displayName: m.displayName || m.name.replace("models/", "")
              }));

            const modelsToPreserve = [
              { name: "models/gemini-3-pro-preview", displayName: "Gemini 3 Pro Preview (Recommended)" },
              { name: "gemini-flash-latest", displayName: "Gemini Flash Latest (Fast)" }
            ];

            modelsToPreserve.forEach(preserved => {
              if (!formattedModels.find((m: any) => m.name === preserved.name)) {
                formattedModels.unshift(preserved);
              }
            });

            setAvailableModels(formattedModels);
          }
        } catch (error) {
          console.error("Failed to fetch models", error);
        } finally {
          setIsLoadingModels(false);
        }
      }
    };

    const timeoutId = setTimeout(fetchModels, 1000);
    return () => clearTimeout(timeoutId);
  }, [apiKey]);

  // Save current session state to history
  useEffect(() => {
    if (!currentSessionId) return;

    setHistory(prev => {
      const index = prev.findIndex(item => item.id === currentSessionId);
      const newItem: HistoryItem = {
        id: currentSessionId,
        query,
        timestamp: new Date().toISOString(),
        status: isResearching ? "in_progress" : agentState === "complete" ? "complete" : "failed",
        sufficiencyScore,
        logs,
        globalContext,
        finalReport,
        researchMode,
        agentState
      };

      if (index >= 0) {
        const newHistory = [...prev];
        newHistory[index] = newItem;
        return newHistory;
      } else {
        return [newItem, ...prev];
      }
    });
  }, [logs, sufficiencyScore, agentState, isResearching, finalReport, globalContext, currentSessionId, query, researchMode]);


  const addLog = (agent: LogEntry["agent"], message: string, details?: any) => {
    setLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toLocaleTimeString(),
        agent,
        message,
        details,
      },
    ]);
  };

  const loadSession = (id: string) => {
    const session = history.find(h => h.id === id);
    if (!session) return;

    setQuery(session.query);
    setLogs(session.logs);
    setGlobalContext(session.globalContext);
    setFinalReport(session.finalReport);
    setSufficiencyScore(session.sufficiencyScore);
    setResearchMode(session.researchMode);
    setAgentState(session.agentState);
    setCurrentSessionId(session.id);
    setIteration(session.globalContext?.iteration || 0);
    setIsResearching(false);
  };

  const buildClarificationContext = (): string => {
    return clarificationMessages
      .map(msg => `${msg.role === "assistant" ? "AI" : "User"}: ${msg.content}`)
      .join("\n");
  };

  const runClarification = async () => {
    if (!apiKey || !query) {
      alert("Please provide an API Key and a Query.");
      setIsSettingsOpen(true);
      return;
    }

    setIsClarifying(true);
    setAgentState("clarifying");
    setIsWaitingForClarification(true);
    setClarificationMessages([]);

    try {
      const result = await runClarifierAction(apiKey, query, clarifierModel);

      if (result.is_clear) {
        setClarificationMessages([{
          role: "assistant",
          content: "✅ Your query is clear! Starting research now..."
        }]);
        setIsClarifying(false);
        setTimeout(() => startResearch(false), 500);
      } else {
        const questionsText = result.questions.length > 0
          ? result.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")
          : "Could you please provide more details about your research topic?";

        setClarificationMessages([{
          role: "assistant",
          content: `I need some clarification before starting research:\n\n${questionsText}`
        }]);
        setIsWaitingForClarification(false);
      }
    } catch (error) {
      console.error("Clarification error:", error);
      setClarificationMessages([{
        role: "assistant",
        content: "⚠️ Couldn't assess query clarity. Starting research anyway..."
      }]);
      setIsClarifying(false);
      setTimeout(() => startResearch(false), 500);
    }
  };

  const handleClarificationResponse = async () => {
    if (!clarificationInput.trim() || isWaitingForClarification) return;

    const userResponse = clarificationInput.trim();
    setClarificationInput("");

    setClarificationMessages(prev => [...prev, { role: "user", content: userResponse }]);
    setIsWaitingForClarification(true);

    try {
      const context = buildClarificationContext() + `\nUser: ${userResponse}`;
      const result = await runClarifierAction(apiKey, query, clarifierModel, context);

      if (result.is_clear) {
        setClarificationMessages(prev => [...prev, {
          role: "assistant",
          content: "✅ Great! Your query is now clear. Starting research..."
        }]);
        setIsClarifying(false);
        setTimeout(() => startResearch(false), 500);
      } else {
        const questionsText = result.questions.length > 0
          ? result.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")
          : "Could you please provide more specific details?";

        setClarificationMessages(prev => [...prev, {
          role: "assistant",
          content: `I still need a bit more clarity:\n\n${questionsText}`
        }]);
        setIsWaitingForClarification(false);
      }
    } catch (error) {
      console.error("Clarification error:", error);
      setClarificationMessages(prev => [...prev, {
        role: "assistant",
        content: "⚠️ Something went wrong. Starting research with current information..."
      }]);
      setIsClarifying(false);
      setTimeout(() => startResearch(false), 500);
    }
  };

  const skipClarification = () => {
    setIsClarifying(false);
    startResearch(false);
  };

  const startResearch = async (isContinuation = false) => {
    if (!apiKey || !query) {
      alert("Please provide an API Key and a Query.");
      setIsSettingsOpen(true);
      return;
    }

    setIsResearching(true);
    let contextToUse = globalContext;

    if (!isContinuation) {
      setAgentState("manager");
      setLogs([]);
      setFinalReport(null);
      setSufficiencyScore(0);
      setIteration(0);

      const newSessionId = Math.random().toString(36).substring(7);
      setCurrentSessionId(newSessionId);

      contextToUse = {
        project_name: "Research Task",
        original_query: query,
        status: "in_progress",
        iteration: 0,
        knowledge_bank: [],
        conflicts: [],
        research_mode: researchMode === "deeper" ? "deep" : "standard",
      };
      setGlobalContext(contextToUse);
    } else {
      addLog("System", "Resuming research session...");
    }

    if (contextToUse) {
      processLoop(contextToUse);
    }
  };

  const processLoop = async (currentContext: GlobalContext) => {
    try {
      setIteration(currentContext.iteration);

      setAgentState("manager");
      addLog("Manager", `Starting Iteration ${currentContext.iteration + 1}. Assessing knowledge gap...`);

      const managerOutput = await runManagerAction(apiKey, query, currentContext, managerModel);
      addLog("Manager", `Assessment complete. Score: ${managerOutput.sufficiency_score}%`, managerOutput);
      setSufficiencyScore(managerOutput.sufficiency_score);

      let isFinished = managerOutput.is_finished || managerOutput.sufficiency_score >= 95;

      if (researchMode === "deeper") {
        if (currentContext.iteration < minIterations) {
          if (isFinished) {
            addLog("System", `Deeper Research Mode: Iteration ${currentContext.iteration + 1}/${minIterations}. Expanding scope.`);
            isFinished = false;
          }
        }
        if (maxIterations !== 999 && currentContext.iteration >= maxIterations) {
          addLog("System", `Deeper Research Mode: Maximum iterations (${maxIterations}) reached. Finishing research.`);
          isFinished = true;
        }
      }

      if (isFinished) {
        setAgentState("writer");
        addLog("System", "Sufficiency threshold reached. Generating final report...");
        const report = await runWriterAction(apiKey, currentContext, managerModel);
        setFinalReport(report);
        setAgentState("complete");
        setIsResearching(false);
        addLog("Writer", "Report generated successfully.");
        return;
      }

      setAgentState("worker");
      addLog("Worker", `Executing task: ${managerOutput.next_step.task_description}`);
      const findings = await runWorkerAction(apiKey, managerOutput.next_step, workerModel);
      addLog("Worker", `Found ${findings.length} new items.`, findings);

      setAgentState("verifier");
      addLog("Verifier", "Verifying and deduplicating findings...");
      const verificationResult = await runVerifierAction(apiKey, findings, currentContext, verifierModel);
      addLog("Verifier", `Verification complete. ${verificationResult.cleaned_findings.length} valid findings.`, verificationResult);

      const newContext: GlobalContext = {
        ...currentContext,
        iteration: currentContext.iteration + 1,
        knowledge_bank: [
          ...currentContext.knowledge_bank,
          ...verificationResult.cleaned_findings.map(f => ({
            topic: managerOutput.next_step.focus_area,
            facts: [f.fact],
            sources: [f.source_url],
            verified: true
          }))
        ],
        conflicts: [
          ...currentContext.conflicts,
          ...verificationResult.conflicts
        ]
      };

      setGlobalContext(newContext);
      setTimeout(() => processLoop(newContext), 100);

    } catch (error) {
      console.error("Research Loop Error:", error);
      addLog("System", "An error occurred during the research process.", error);
      setAgentState("failed");
      setIsResearching(false);
    }
  };

  const copyToClipboard = () => {
    if (finalReport) {
      navigator.clipboard.writeText(finalReport);
    }
  };

  const handleStart = () => {
    if (isResearching) {
      setIsResearching(false);
    } else {
      runClarification();
    }
  };

  return (
    <div className="max-w-5xl mx-auto">

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        setApiKey={setApiKey}
        managerModel={managerModel}
        setManagerModel={setManagerModel}
        workerModel={workerModel}
        setWorkerModel={setWorkerModel}
        verifierModel={verifierModel}
        setVerifierModel={setVerifierModel}
        clarifierModel={clarifierModel}
        setClarifierModel={setClarifierModel}
        availableModels={availableModels}
        isLoadingModels={isLoadingModels}
        researchMode={researchMode}
        setResearchMode={setResearchMode}
        minIterations={minIterations}
        setMinIterations={setMinIterations}
        maxIterations={maxIterations}
        setMaxIterations={setMaxIterations}
      />

      {/* History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelect={loadSession}
        onClear={() => { setHistory([]); localStorage.removeItem("kresearch_history"); }}
      />

      <main className="space-y-8">

        {/* Header */}
        <div className="flex justify-between items-center pt-4">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight" style={{ color: 'var(--text-color)' }}>
              KResearch
            </h1>
            <p className="text-sm font-light" style={{ color: 'var(--text-color-secondary)' }}>
              Autonomous Deep-Dive Agent
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            <Button
              variant="secondary"
              className="!rounded-full !p-2 !w-10 !h-10"
              onClick={() => setIsHistoryOpen(true)}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </Button>
            <Button
              variant="secondary"
              className="!rounded-full !p-2 !w-10 !h-10"
              onClick={() => setIsSettingsOpen(true)}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Input Area */}
        <Card noHover className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-grow">
              <Input
                placeholder="What do you want to research?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isResearching && !isClarifying && handleStart()}
                className="!h-12 !text-lg"
                disabled={isResearching || isClarifying}
              />
            </div>
            <Button
              onClick={handleStart}
              className={`min-w-[100px] !h-12 !rounded-full font-semibold ${isResearching ? '!bg-red-500' : ''}`}
              disabled={isClarifying && !isResearching}
            >
              {isResearching ? "Stop" : "Start"}
            </Button>
          </div>

          {/* Continue Button */}
          {!isResearching && !isClarifying && globalContext && globalContext.status !== 'complete' && logs.length > 0 && (
            <div className="flex justify-center">
              <Button onClick={() => startResearch(true)} variant="secondary" className="gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Continue Previous Session
              </Button>
            </div>
          )}
        </Card>

        {/* Clarification Dialog */}
        {isClarifying && (
          <Card noHover className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Clarifying</Badge>
                <span className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
                  {isWaitingForClarification ? "Thinking..." : "Awaiting your response"}
                </span>
              </div>
              <Button variant="secondary" onClick={skipClarification} className="text-sm">
                Skip & Start Research
              </Button>
            </div>

            {/* Chat Messages */}
            <div className="space-y-4 max-h-[300px] overflow-y-auto mb-4">
              {clarificationMessages.map((msg, i) => (
                <div
                  key={i}
                  className="p-3"
                  style={{
                    background: msg.role === "assistant"
                      ? 'color-mix(in srgb, var(--glass-bg) 50%, transparent)'
                      : 'var(--accent-color)',
                    color: msg.role === "assistant" ? 'var(--text-color)' : 'white',
                    borderRadius: 'var(--radius-2xl)',
                    marginLeft: msg.role === "user" ? '2rem' : '0'
                  }}
                >
                  <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                </div>
              ))}
              {isWaitingForClarification && clarificationMessages.length > 0 && (
                <div className="flex items-center gap-2" style={{ color: 'var(--text-color-secondary)' }}>
                  <Spinner />
                  <span className="text-sm">Analyzing response...</span>
                </div>
              )}
              <div ref={clarificationEndRef} />
            </div>

            {/* Response Input */}
            {!isWaitingForClarification && clarificationMessages.length > 0 && (
              <div className="flex gap-2">
                <Input
                  placeholder="Type your response..."
                  value={clarificationInput}
                  onChange={(e) => setClarificationInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleClarificationResponse()}
                  className="flex-grow"
                />
                <Button onClick={handleClarificationResponse}>Send</Button>
              </div>
            )}
          </Card>
        )}

        {/* Progress Visualization */}
        {(isResearching || logs.length > 0) && !isClarifying && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">

            {/* Left: Brain Visualization */}
            <div className="lg:col-span-1 space-y-6">
              <Card noHover className="h-full flex flex-col items-center justify-center space-y-6 min-h-[300px]">
                <BrainVisualization isActive={isResearching} agentState={agentState} />

                <div className="space-y-2 w-full px-4">
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--text-color-secondary)' }}>Iteration</span>
                    <span className="font-mono" style={{ color: 'var(--text-color)' }}>{iteration}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--text-color-secondary)' }}>Current Agent</span>
                    <Badge variant="secondary" className="capitalize">{agentState}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--text-color-secondary)' }}>Mode</span>
                    <Badge variant={researchMode === 'deeper' ? 'primary' : 'secondary'} className="capitalize">
                      {researchMode}
                    </Badge>
                  </div>
                  {researchMode === 'deeper' && (
                    <div className="flex justify-between text-sm">
                      <span style={{ color: 'var(--text-color-secondary)' }}>Target</span>
                      <span className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>
                        {minIterations} - {maxIterations === 999 ? '∞' : maxIterations}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Right: Logs */}
            <div className="lg:col-span-2">
              <Card noHover className="h-[500px] overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {logs.map((log) => (
                    <div key={log.id} className="flex gap-3 text-sm animate-fade-in">
                      <div className="min-w-[80px] text-xs pt-1" style={{ color: 'var(--text-color-secondary)' }}>
                        {log.timestamp}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-xs uppercase tracking-wider ${log.agent === "Manager" ? "text-blue-500" :
                              log.agent === "Worker" ? "text-amber-500" :
                                log.agent === "Verifier" ? "text-purple-500" :
                                  log.agent === "Writer" ? "text-green-500" :
                                    log.agent === "Clarifier" ? "text-cyan-500" :
                                      "text-gray-500"
                            }`}>
                            {log.agent}
                          </span>
                        </div>
                        <p style={{ color: 'var(--text-color)' }}>{log.message}</p>
                        {log.details && (
                          <div
                            className="mt-2 p-3 text-xs"
                            style={{
                              background: 'color-mix(in srgb, var(--glass-bg) 50%, transparent)',
                              borderRadius: 'var(--radius-2xl)',
                              color: 'var(--text-color-secondary)'
                            }}
                          >
                            {log.agent === "Manager" && log.details.thoughts && (
                              <div className="space-y-1">
                                <p className="font-semibold" style={{ color: 'var(--text-color)' }}>Thoughts:</p>
                                <p>{log.details.thoughts}</p>
                                <p className="font-semibold mt-2" style={{ color: 'var(--text-color)' }}>Next Step:</p>
                                <p>{log.details.next_step?.task_description}</p>
                              </div>
                            )}
                            {log.agent === "Worker" && Array.isArray(log.details) && (
                              <div className="space-y-2">
                                <p className="font-semibold" style={{ color: 'var(--text-color)' }}>Findings:</p>
                                <ul className="list-disc pl-4 space-y-1">
                                  {log.details.map((f: any, i: number) => (
                                    <li key={i}>
                                      <span className="font-medium" style={{ color: 'var(--text-color)' }}>{f.fact}</span>
                                      <span className="block text-[10px] opacity-70 truncate">{f.source_url}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {log.agent === "Verifier" && (
                              <div className="space-y-2">
                                <p className="font-semibold" style={{ color: 'var(--text-color)' }}>Verification Result:</p>
                                <p>Cleaned Findings: {log.details.cleaned_findings?.length || 0}</p>
                                <p>Conflicts: {log.details.conflicts?.length || 0}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Final Report */}
        {finalReport && (
          <Card className="animate-fade-in relative group mb-20">
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button onClick={copyToClipboard} variant="secondary" className="text-xs !px-3 !py-1">
                Copy Report
              </Button>
            </div>
            <div className="prose max-w-none" style={{ color: 'var(--text-color)' }}>
              <h2 className="text-2xl font-bold mb-4">Final Research Report</h2>
              <div className="whitespace-pre-wrap leading-relaxed">
                {finalReport}
              </div>
            </div>
          </Card>
        )}

      </main>
    </div>
  );
}
