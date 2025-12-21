"use client";

import React, { useState, useEffect, useCallback } from "react";
import { SettingsModal } from "@/components/SettingsModal";
import { HistoryDrawer } from "@/components/HistoryDrawer";
import { ResearchHeader } from "@/components/ResearchHeader";
import { QueryInput } from "@/components/QueryInput";
import { ClarificationDialog } from "@/components/ClarificationDialog";
import { ResearchPanel } from "@/components/ResearchPanel";
import { LogsPanel } from "@/components/LogsPanel";
import { FinalReport } from "@/components/FinalReport";
import { useResearchSettings } from "@/hooks/useResearchSettings";
import { useResearch } from "@/hooks/useResearch";
import { useClarification } from "@/hooks/useClarification";
import { HistoryItem } from "@/types/research";
import { useLanguage } from "@/components/ui/LanguageContext";

export default function Home() {
  const { t } = useLanguage();
  const settings = useResearchSettings();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const research = useResearch({
    apiKey: settings.getActiveApiKey(),
    getNextApiKey: settings.getNextApiKey,
    resetApiKeyRotation: settings.resetApiKeyRotation,
    geminiBaseUrl: settings.geminiBaseUrl,
    modelProvider: settings.modelProvider,
    openaiApiKey: settings.openaiApiKey,
    openaiApiHost: settings.openaiApiHost,
    managerModel: settings.managerModel, workerModel: settings.workerModel,
    verifierModel: settings.verifierModel, clarifierModel: settings.clarifierModel,
    researchMode: settings.researchMode, minIterations: settings.minIterations, maxIterations: settings.maxIterations
  });

  const handleStartResearch = useCallback(() => {
    const sessionId = research.startResearch(query);
    setCurrentSessionId(sessionId);
  }, [query, research]);

  const clarification = useClarification({
    apiKey: settings.getActiveApiKey(), clarifierModel: settings.clarifierModel,
    onClear: () => { }, onStartResearch: handleStartResearch
  });

  useEffect(() => { research.logsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [research.logs]);
  useEffect(() => { clarification.endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [clarification.messages]);

  useEffect(() => {
    const storedHistory = localStorage.getItem("kresearch_history");
    if (storedHistory) { try { setHistory(JSON.parse(storedHistory)); } catch { } }
  }, []);
  useEffect(() => { localStorage.setItem("kresearch_history", JSON.stringify(history)); }, [history]);

  useEffect(() => {
    if (!currentSessionId) return;
    setHistory(prev => {
      const index = prev.findIndex(item => item.id === currentSessionId);
      const elapsed = research.startTime && research.endTime ? research.endTime - research.startTime : undefined;
      const newItem: HistoryItem = {
        id: currentSessionId, query, timestamp: new Date().toISOString(),
        status: research.isResearching ? "in_progress" : research.agentState === "complete" ? "complete" : "failed",
        sufficiencyScore: research.sufficiencyScore, logs: research.logs, globalContext: research.globalContext,
        finalReport: research.finalReport, researchMode: settings.researchMode, agentState: research.agentState,
        elapsedTime: elapsed
      };
      if (index >= 0) { const newHistory = [...prev]; newHistory[index] = newItem; return newHistory; }
      return [newItem, ...prev];
    });
  }, [research.logs, research.sufficiencyScore, research.agentState, research.isResearching, research.finalReport, research.globalContext, research.startTime, research.endTime, currentSessionId, query, settings.researchMode]);

  const loadSession = (id: string) => {
    const session = history.find(h => h.id === id);
    if (session) { setQuery(session.query); setCurrentSessionId(session.id); research.loadSession(session); }
  };

  const handleStart = () => {
    const activeKey = settings.getActiveApiKey();
    if (!activeKey || !query) { alert(t('alertApiKeyQuery')); setIsSettingsOpen(true); return; }
    if (research.isResearching) { research.stopResearch(); return; }
    clarification.run(query);
  };

  // Only show continue button if research is NOT complete and there are logs
  const canContinue = !research.isResearching && !clarification.isClarifying && research.globalContext
    && research.agentState !== 'complete' && research.agentState !== 'idle' && research.logs.length > 0;

  return (
    <div className="max-w-5xl mx-auto">
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} {...settings} availableModels={settings.availableModels} isLoadingModels={settings.isLoadingModels} refreshModels={settings.refreshModels} modelProvider={settings.modelProvider} setModelProvider={settings.setModelProvider} />
      <HistoryDrawer isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} history={history} onSelect={loadSession} onClear={() => { setHistory([]); localStorage.removeItem("kresearch_history"); }} />
      <main className="space-y-8">
        <ResearchHeader onOpenHistory={() => setIsHistoryOpen(true)} onOpenSettings={() => setIsSettingsOpen(true)} />
        <QueryInput query={query} setQuery={setQuery} isResearching={research.isResearching} isClarifying={clarification.isClarifying} canContinue={!!canContinue} onStart={handleStart} onContinue={() => { setCurrentSessionId(research.startResearch(query, true)); }} />
        {clarification.isClarifying && <ClarificationDialog messages={clarification.messages} input={clarification.input} setInput={clarification.setInput} isWaiting={clarification.isWaiting} onSend={() => clarification.respond(query)} onSkip={clarification.skip} endRef={clarification.endRef} />}
        {(research.isResearching || research.logs.length > 0) && !clarification.isClarifying && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            <div className="lg:col-span-1">
              <ResearchPanel isResearching={research.isResearching} agentState={research.agentState} iteration={research.iteration} researchMode={settings.researchMode} minIterations={settings.minIterations} maxIterations={settings.maxIterations} startTime={research.startTime} endTime={research.endTime} />
            </div>
            <div className="lg:col-span-2"><LogsPanel logs={research.logs} endRef={research.logsEndRef} /></div>
          </div>
        )}
        {research.finalReport && <FinalReport report={research.finalReport} onRegenerate={research.regenerateReport} isRegenerating={research.isRegenerating} />}
      </main>
    </div>
  );
}
