
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Source, AppPhase, ClarificationQuestion, UserAnswer, ResearchLogEntry, ResearchLogEntryType, ExecutedStepOutcome, ResearchMode } from './types';
import { getInitialTopicContext, generateInitialClarificationQuestions, evaluateAnswersAndGenerateFollowUps, generateResearchStrategy, decideNextResearchAction, executeResearchStep, summarizeText, synthesizeReport, EvaluatedAnswers } from './services/geminiService';

import LoadingSpinner from './components/LoadingSpinner';
import { ChevronDownIcon, ChevronUpIcon } from './components/icons';
import { DEFAULT_MAX_ITERATIONS, API_KEY_CONFIGURED } from './utils/appConstants';
import { formatDuration } from './utils/formatters';

import AppHeader from './components/AppHeader';
import ApiKeyWarning from './components/ApiKeyWarning';
import ResearchLogView from './components/ResearchLogView';
import PhaseInput from './components/phases/PhaseInput';
import PhaseClarification from './components/phases/PhaseClarification';
import PhaseStrategyReview from './components/phases/PhaseStrategyReview';
import PhaseExecuting from './components/phases/PhaseExecuting';
import PhaseReport from './components/phases/PhaseReport';
import PhaseError from './components/phases/PhaseError';

declare var mermaid: any; // Keep for mermaid.initialize

const App: React.FC = () => {
  const [researchTopic, setResearchTopic] = useState<string>('');
  const [researchMode, setResearchMode] = useState<ResearchMode>('normal');
  const [maxIterations, setMaxIterations] = useState<number>(DEFAULT_MAX_ITERATIONS);
  const [clarificationQuestions, setClarificationQuestions] = useState<ClarificationQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [accumulatedAnswers, setAccumulatedAnswers] = useState<UserAnswer[]>([]);
  const [researchStrategy, setResearchStrategy] = useState<string>('');
  const [currentPhase, setCurrentPhase] = useState<AppPhase>('INPUT');
  const [researchLog, setResearchLog] = useState<ResearchLogEntry[]>([]);
  const [executedSteps, setExecutedSteps] = useState<ExecutedStepOutcome[]>([]);
  const [finalReport, setFinalReport] = useState<string>('');
  const [allSources, setAllSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLogVisible, setIsLogVisible] = useState<boolean>(true); // For bottom log view
  const [areSourcesVisible, setAreSourcesVisible] = useState<boolean>(true); // For report phase sources
  const [researchStartTime, setResearchStartTime] = useState<number | null>(null);
  const [researchEndTime, setResearchEndTime] = useState<number | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  const researchCancelledRef = useRef<boolean>(false);
  const clarificationRoundRef = useRef<number>(0);
  const logEndRef = useRef<HTMLDivElement>(null); // For bottom log view scroll

  useEffect(() => { // Initialize Mermaid
    if (typeof mermaid !== 'undefined') { try { mermaid.initialize({ startOnLoad: false, theme: 'neutral' }); } catch (e) { console.error("Mermaid init error:", e); } }
  }, []);

  const addLogEntry = useCallback((type: ResearchLogEntryType, content: string, sources?: Source[]) => {
    setResearchLog(prev => [...prev, { id: crypto.randomUUID(), timestamp: Date.now(), type, content, sources }]);
  }, []);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [researchLog]);

  const resetState = useCallback(() => {
    setResearchTopic(''); setResearchMode('normal'); setMaxIterations(DEFAULT_MAX_ITERATIONS);
    setClarificationQuestions([]); setUserAnswers({}); setAccumulatedAnswers([]); setResearchStrategy('');
    setCurrentPhase('INPUT'); setResearchLog([]); setExecutedSteps([]); setFinalReport(''); setAllSources([]);
    setIsLoading(false); setLoadingMessage(''); setError(null);
    researchCancelledRef.current = false; clarificationRoundRef.current = 0;
    setResearchStartTime(null); setResearchEndTime(null); setCopyStatus('idle');
  }, []);

  const handleTopicSubmit = useCallback(async () => {
    if (!researchTopic.trim() || maxIterations < 1 || maxIterations > 500) {
      setError(!researchTopic.trim() ? "Please enter a topic." : "Max iterations: 1-500."); return;
    }
    setIsLoading(true); setError(null); setResearchLog([]); setAccumulatedAnswers([]); setUserAnswers({}); 
    setExecutedSteps([]); setAllSources([]); setFinalReport(''); setResearchStartTime(null); setResearchEndTime(null);
    clarificationRoundRef.current = 1;
    addLogEntry('system', `Topic: "${researchTopic}". Mode: ${researchMode}. Max Iter: ${maxIterations}.`);
    try {
      setLoadingMessage("Fetching initial context...");
      const initialContext = await getInitialTopicContext(researchTopic, researchMode);
      addLogEntry('summary', `Initial context: ${initialContext.substring(0, 100)}...`);
      setLoadingMessage("Generating clarification questions...");
      const questions = await generateInitialClarificationQuestions(researchTopic, researchMode, initialContext);
      setClarificationQuestions(questions.map((q, i) => ({ id: i, question: q })));
      setCurrentPhase('ITERATIVE_CLARIFICATION');
      addLogEntry('clarification_q', `Generated ${questions.length} initial questions.`);
    } catch (e) { const msg = e instanceof Error ? e.message : "Initial processing failed."; setError(msg); addLogEntry('error', msg); setCurrentPhase('ERROR');} 
    finally { setIsLoading(false); setLoadingMessage(''); }
  }, [researchTopic, researchMode, maxIterations, addLogEntry]);

  const handleAnswersSubmit = useCallback(async () => {
    const currentAnswersArray = clarificationQuestions.map(cq => ({ questionId: cq.id, questionText: cq.question, answer: userAnswers[cq.id]?.trim() || "" })).filter(ans => ans.answer);
    if (currentAnswersArray.length < clarificationQuestions.length) { setError("Please answer all questions."); return; }

    setIsLoading(true); setLoadingMessage(`Evaluating answers (Round ${clarificationRoundRef.current})...`); setError(null);
    addLogEntry('clarification_a', `Answers for round ${clarificationRoundRef.current} submitted.`);
    const newAccumulated = [...accumulatedAnswers, ...currentAnswersArray];
    setAccumulatedAnswers(newAccumulated);
    try {
      const evalResult: EvaluatedAnswers = await evaluateAnswersAndGenerateFollowUps(researchTopic, clarificationQuestions, currentAnswersArray, researchMode);
      if (evalResult.areAnswersSufficient) {
        addLogEntry('system', "Answers sufficient. Generating strategy..."); setLoadingMessage("Generating strategy...");
        const strategy = await generateResearchStrategy(researchTopic, newAccumulated, researchMode);
        setResearchStrategy(strategy); setCurrentPhase('STRATEGY_REVIEW'); addLogEntry('system', `Strategy: "${strategy.substring(0,100)}..."`);
      } else if (evalResult.followUpQuestions?.length) {
        clarificationRoundRef.current++; addLogEntry('system', `More clarification needed (Round ${clarificationRoundRef.current}).`);
        setClarificationQuestions(evalResult.followUpQuestions.map((q, i) => ({ id: i, question: q })));
        setUserAnswers({}); setCurrentPhase('ITERATIVE_CLARIFICATION'); addLogEntry('clarification_q', `Generated ${evalResult.followUpQuestions.length} follow-up questions.`);
      } else { // Fallback: sufficient or no more questions
        addLogEntry('system', "No further questions or deemed sufficient. Generating strategy..."); setLoadingMessage("Generating strategy...");
        const strategy = await generateResearchStrategy(researchTopic, newAccumulated, researchMode);
        setResearchStrategy(strategy); setCurrentPhase('STRATEGY_REVIEW'); addLogEntry('system', `Strategy generated.`);
      }
    } catch (e) { const msg = e instanceof Error ? e.message : "Clarification/strategy failed."; setError(msg); addLogEntry('error', msg); setCurrentPhase('ERROR');}
    finally { setIsLoading(false); setLoadingMessage('');}
  }, [userAnswers, clarificationQuestions, researchTopic, researchMode, addLogEntry, accumulatedAnswers]);
  
  const handleSkipClarification = useCallback(async () => {
    setIsLoading(true); setLoadingMessage("Skipping clarification, generating strategy..."); setError(null);
    addLogEntry('system', 'User skipped clarification. Generating strategy.');
    try {
      const strategy = await generateResearchStrategy(researchTopic, accumulatedAnswers, researchMode);
      setResearchStrategy(strategy); setCurrentPhase('STRATEGY_REVIEW'); addLogEntry('system', `Strategy generated (skipped clarification).`);
    } catch (e) { const msg = e instanceof Error ? e.message : "Strategy gen failed (skip)."; setError(msg); addLogEntry('error', msg); setCurrentPhase('ERROR');}
    finally { setIsLoading(false); setLoadingMessage('');}
  }, [researchTopic, accumulatedAnswers, researchMode, addLogEntry]);

  const handleStartIterativeResearch = useCallback(() => {
    if (!researchStrategy) { setError("Strategy unavailable."); return; }
    setError(null); setExecutedSteps([]); setAllSources([]); setFinalReport(''); researchCancelledRef.current = false;
    setResearchStartTime(Date.now()); setResearchEndTime(null); setCurrentPhase('EXECUTING');
    addLogEntry('system', `Starting research. Mode: ${researchMode}, Max Iter: ${maxIterations}.`);
  }, [researchStrategy, addLogEntry, researchMode, maxIterations]);

  const handleCancelResearch = () => {
    researchCancelledRef.current = true; addLogEntry('system', "User requested cancellation.");
    setIsLoading(false); setLoadingMessage("Cancelling research..."); // This message might be overridden if loop continues briefly
  };

  useEffect(() => { // Research Loop
    if (currentPhase !== 'EXECUTING' || researchCancelledRef.current || isLoading) {
      if (researchCancelledRef.current && researchStartTime && !researchEndTime && currentPhase !== 'EXECUTING') setResearchEndTime(Date.now());
      return;
    }
    const runLoop = async () => {
      setIsLoading(true);
      let localSteps: ExecutedStepOutcome[] = [...executedSteps]; // Use local copy for loop state
      for (let i = localSteps.length; i < maxIterations && !researchCancelledRef.current; i++) {
        const iterNum = i + 1;
        setLoadingMessage(`Iter ${iterNum}/${maxIterations}: Deciding action...`); addLogEntry('system', `Iter ${iterNum}: Deciding...`);
        try {
          const decision = await decideNextResearchAction(researchTopic, researchStrategy, localSteps, iterNum, maxIterations, researchMode);
          addLogEntry('thought', `AI action: "${decision.action}". Reason: "${decision.reason}"`);
          if (researchCancelledRef.current) break;
          setLoadingMessage(`Iter ${iterNum}: Executing "${decision.action.substring(0,30)}..."`); addLogEntry('action', `Executing: "${decision.action}"`);
          const stepResult = await executeResearchStep(decision.action, researchMode);
          if (researchCancelledRef.current) break;
          if (stepResult.sources.length) {
            addLogEntry('sources', `Found ${stepResult.sources.length} sources.`, stepResult.sources);
            setAllSources(prev => [...prev, ...stepResult.sources.filter(ns => !prev.some(es => es.uri === ns.uri))]);
          }
          setLoadingMessage(`Iter ${iterNum}: Summarizing...`);
          const summary = await summarizeText(stepResult.text, researchMode, researchTopic);
          addLogEntry('summary', `Summary (step ${iterNum}): ${summary}`);
          const outcome: ExecutedStepOutcome = { ...decision, rawResultText: stepResult.text, summary, sources: stepResult.sources };
          localSteps.push(outcome); setExecutedSteps(prev => [...prev, outcome]); // Update global state
          if (decision.shouldStop) { addLogEntry('system', "AI suggests stopping."); break; }
        } catch (e) { const msg = e instanceof Error ? e.message : "Research iter error."; setError(msg); addLogEntry('error', msg); setCurrentPhase('ERROR'); setResearchEndTime(Date.now()); setIsLoading(false); return; }
      }
      if (researchCancelledRef.current) addLogEntry('system', `Research cancelled. Processing ${localSteps.length} steps.`);
      else addLogEntry('system', `Research loop finished. ${localSteps.length} steps.`);

      if (localSteps.length > 0) {
        setLoadingMessage("Synthesizing report..."); addLogEntry('system', "Synthesizing report...");
        try {
          const report = await synthesizeReport(researchTopic, researchStrategy, localSteps, researchMode);
          setFinalReport(report); setCurrentPhase('REPORT'); addLogEntry('system', "Report generated.");
        } catch (e) { const msg = e instanceof Error ? e.message : "Report synthesis error."; setError(msg); addLogEntry('error', msg); setCurrentPhase('ERROR');}
      } else {
        addLogEntry('system', "No steps executed or results found. No report.");
        setCurrentPhase(researchCancelledRef.current ? 'INPUT' : 'STRATEGY_REVIEW'); // Go back if no results
      }
      setResearchEndTime(Date.now()); setIsLoading(false); setLoadingMessage('');
    };
    runLoop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPhase, researchTopic, researchStrategy, researchMode, maxIterations, addLogEntry, isLoading /*executedSteps removed*/]);
  
  const handleCopyMarkdown = useCallback(() => { if (!finalReport) return; navigator.clipboard.writeText(finalReport).then(() => { setCopyStatus('copied'); setTimeout(() => setCopyStatus('idle'), 2000); }).catch(err => setError("Failed to copy.")); }, [finalReport]);
  const handleDownloadTxt = useCallback(() => { if (!finalReport) return; const blob = new Blob([finalReport],{type:'text/plain;charset=utf-8'}); const link=document.createElement('a'); link.href=URL.createObjectURL(blob); link.download=`KResearch-${researchTopic.substring(0,20)}.txt`; link.click(); URL.revokeObjectURL(link.href); }, [finalReport, researchTopic]);

  return (
    <div className="bg-gray-900 text-gray-100 min-h-screen flex flex-col items-center p-4 font-sans">
      {!API_KEY_CONFIGURED && <ApiKeyWarning />}
      <div className="w-full max-w-2xl mx-auto space-y-8">
        <AppHeader />
        <main className="bg-gray-800 shadow-2xl rounded-xl p-3 sm:p-5">
          {isLoading && currentPhase !== 'EXECUTING' && <div className="mb-4"><LoadingSpinner message={loadingMessage} /></div>}
          {error && currentPhase !== 'ERROR' && <div className="mb-4 p-3 bg-red-700 bg-opacity-30 border border-red-600 text-red-300 rounded-md">Error: {error}</div>}
          
          {currentPhase === 'INPUT' && <PhaseInput researchTopic={researchTopic} setResearchTopic={setResearchTopic} researchMode={researchMode} setResearchMode={setResearchMode} maxIterations={maxIterations} setMaxIterations={setMaxIterations} handleTopicSubmit={handleTopicSubmit} isLoading={isLoading} />}
          {currentPhase === 'ITERATIVE_CLARIFICATION' && <PhaseClarification researchTopic={researchTopic} clarificationQuestions={clarificationQuestions} userAnswers={userAnswers} setUserAnswers={setUserAnswers} handleAnswersSubmit={handleAnswersSubmit} handleSkipClarification={handleSkipClarification} isLoading={isLoading} clarificationRound={clarificationRoundRef.current} onBackToTopic={() => { setCurrentPhase('INPUT'); setError(null); setClarificationQuestions([]); setUserAnswers({}); setAccumulatedAnswers([]); }} />}
          {currentPhase === 'STRATEGY_REVIEW' && <PhaseStrategyReview researchTopic={researchTopic} researchStrategy={researchStrategy} researchMode={researchMode} maxIterations={maxIterations} handleStartIterativeResearch={handleStartIterativeResearch} isLoading={isLoading} onBackToClarifications={() => { setCurrentPhase('ITERATIVE_CLARIFICATION'); setError(null);}} />}
          {currentPhase === 'EXECUTING' && <PhaseExecuting handleCancelResearch={handleCancelResearch} isLoading={isLoading} loadingMessage={loadingMessage} researchLog={researchLog} researchMode={researchMode} maxIterations={maxIterations} researchCancelled={researchCancelledRef.current} />}
          {currentPhase === 'REPORT' && <PhaseReport researchTopic={researchTopic} finalReport={finalReport} researchMode={researchMode} maxIterations={maxIterations} executedStepsCount={executedSteps.length} researchDuration={researchEndTime && researchStartTime ? researchEndTime - researchStartTime : null} allSources={allSources} areSourcesVisible={areSourcesVisible} toggleSourcesVisibility={() => setAreSourcesVisible(v => !v)} resetState={resetState} handleCopyMarkdown={handleCopyMarkdown} handleDownloadTxt={handleDownloadTxt} copyStatus={copyStatus} />}
          {currentPhase === 'ERROR' && <PhaseError error={error} resetState={resetState} />}
        </main>

        {researchLog.length > 0 && currentPhase !== 'EXECUTING' && currentPhase !== 'INPUT' && (
          <section className="bg-gray-800 shadow-xl rounded-lg p-3 sm:p-4 mt-6 w-full">
            <button onClick={() => setIsLogVisible(v => !v)} className="flex items-center justify-between w-full text-left py-2 px-1 text-lg font-semibold text-gray-300 hover:text-blue-300">
                Research Log ({researchLog.length}) {isLogVisible ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </button>
            {isLogVisible && <div ref={logEndRef}><ResearchLogView logEntries={researchLog} compact={true} /></div>}
          </section>
        )}
        <footer className="text-center py-4 text-xs text-gray-500">KResearch AI Agent v1.1</footer>
      </div>
    </div>
  );
};
export default App;
