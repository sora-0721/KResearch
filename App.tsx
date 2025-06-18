
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Source, AppPhase, ClarificationQuestion, UserAnswer, ResearchLogEntry, ResearchLogEntryType, ExecutedStepOutcome, ResearchMode, ProposedActionDetails, CheckpointName, CheckpointData, ReportChunk } from './types';
import { getInitialTopicContext, generateInitialClarificationQuestions, evaluateAnswersAndGenerateFollowUps, generateResearchStrategy, decideNextResearchAction, executeResearchStep, summarizeText, synthesizeReport, EvaluatedAnswers } from './services/geminiService';

import LoadingSpinner from './components/LoadingSpinner';
import { ChevronDownIcon, ChevronUpIcon, ArrowDownOnSquareStackIcon } from './components/icons';
import { DEFAULT_MAX_ITERATIONS, API_KEY_CONFIGURED } from './utils/appConstants';
import { formatDuration } from './utils/formatters';

import AppHeader from './components/AppHeader';
import ApiKeyWarning from './components/ApiKeyWarning';
import ResearchLogView from './components/ResearchLogView';
import PhaseInput from './components/phases/PhaseInput';
import PhaseClarification from './components/phases/PhaseClarification';
import PhaseStrategyReview from './components/phases/PhaseStrategyReview';
import PhaseActionReview from './components/phases/PhaseActionReview';
import PhaseExecuting from './components/phases/PhaseExecuting';
import PhaseReport from './components/phases/PhaseReport';
import PhaseError from './components/phases/PhaseError';

declare var mermaid: any;

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
  const [initialStreamingReportContent, setInitialStreamingReportContent] = useState<string>('');
  const [elaboratedStreamingReportContent, setElaboratedStreamingReportContent] = useState<string>('');
  const [isElaboratingReport, setIsElaboratingReport] = useState<boolean>(false);
  
  const [allSources, setAllSources] = useState<Source[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessageBase, setLoadingMessageBase] = useState<string>('');
  const [loadingDots, setLoadingDots] = useState<string>('');
  const [keepAlivePing, setKeepAlivePing] = useState<string | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  
  const [isLogVisible, setIsLogVisible] = useState<boolean>(true);
  const [areSourcesVisible, setAreSourcesVisible] = useState<boolean>(true);
  
  const [researchStartTime, setResearchStartTime] = useState<number | null>(null);
  const [researchEndTime, setResearchEndTime] = useState<number | null>(null);
  
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [proposedFirstAction, setProposedFirstAction] = useState<ProposedActionDetails | null>(null);

  const [savedCheckpoints, setSavedCheckpoints] = useState<Record<CheckpointName, CheckpointData | null>>({
    POST_CLARIFICATION: null,
    POST_STRATEGY: null,
  });
  const [showCheckpointsDropdown, setShowCheckpointsDropdown] = useState<boolean>(false);

  const researchCancelledRef = useRef<boolean>(false);
  const clarificationRoundRef = useRef<number>(0);
  const logEndRef = useRef<HTMLDivElement>(null);
  const activeTimers = useRef<number[]>([]);

  useEffect(() => {
    if (typeof mermaid !== 'undefined') { try { mermaid.initialize({ startOnLoad: false, theme: 'neutral' }); } catch (e) { console.error("Mermaid init error:", e); } }
  }, []);

  const clearTimers = useCallback(() => {
    activeTimers.current.forEach(timerId => {
      clearInterval(timerId as any); // Works for both interval and timeout if ID is stored
      clearTimeout(timerId as any);
    });
    activeTimers.current = [];
  }, []);

  // Effect for Dot Animation
  useEffect(() => {
    let dotTimerId: number | undefined = undefined;
    if (isLoading && loadingMessageBase) {
      setLoadingDots(''); // Reset dots when base message changes or loading starts
      let dotCount = 0;
      dotTimerId = setInterval(() => {
        dotCount = (dotCount + 1) % 4;
        setLoadingDots('.'.repeat(dotCount));
      }, 1000) as any as number;
      
      activeTimers.current.push(dotTimerId);
      const currentTimerId = dotTimerId;
      return () => {
        clearInterval(currentTimerId);
        activeTimers.current = activeTimers.current.filter(id => id !== currentTimerId);
        setLoadingDots(''); 
      };
    } else {
      setLoadingDots(''); 
    }
  }, [isLoading, loadingMessageBase]);

  // Effect for Minute Keep-Alive Ping
  useEffect(() => {
    let minuteTimerId: number | undefined = undefined;
    const localPingClearTimerIds: number[] = [];

    if (isLoading) {
      let minutePingCount = 0;
      minuteTimerId = setInterval(() => {
        minutePingCount++;
        setKeepAlivePing(`Still working... (${minutePingCount} min passed)`);
        const pingClearTimerId = setTimeout(() => {
          setKeepAlivePing(null);
          const idx = localPingClearTimerIds.indexOf(pingClearTimerId);
          if (idx > -1) localPingClearTimerIds.splice(idx, 1);
          activeTimers.current = activeTimers.current.filter(id => id !== pingClearTimerId);
        }, 5000) as any as number;
        localPingClearTimerIds.push(pingClearTimerId);
        activeTimers.current.push(pingClearTimerId);
      }, 60000) as any as number;
      activeTimers.current.push(minuteTimerId);
    } else {
      setKeepAlivePing(null);
    }

    const currentMinuteTimerId = minuteTimerId;
    return () => {
      if (currentMinuteTimerId !== undefined) {
        clearInterval(currentMinuteTimerId);
        activeTimers.current = activeTimers.current.filter(id => id !== currentMinuteTimerId);
      }
      localPingClearTimerIds.forEach(id => {
        clearTimeout(id);
        activeTimers.current = activeTimers.current.filter(tid => tid !== id);
      });
      setKeepAlivePing(null);
    };
  }, [isLoading]);


  const addLogEntry = useCallback((type: ResearchLogEntryType, content: string, sources?: Source[]) => {
    setResearchLog(prev => [...prev, { id: crypto.randomUUID(), timestamp: Date.now(), type, content, sources }]);
  }, []);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [researchLog]);

  const handleError = useCallback((errorMessage: string, phaseOverride?: AppPhase) => {
    console.error("KResearch Error:", errorMessage);
    setError(errorMessage);
    setCurrentPhase(phaseOverride || 'ERROR');
    setIsLoading(false);
    setLoadingMessageBase('');
    setLoadingDots('');
    setKeepAlivePing(null);
    clearTimers();
    if (researchStartTime && !researchEndTime) setResearchEndTime(Date.now());
  }, [researchStartTime, researchEndTime, clearTimers]);

  const resetState = useCallback((isFullReset: boolean = true) => {
    if (isFullReset) {
      setResearchTopic('');
      setSavedCheckpoints({ POST_CLARIFICATION: null, POST_STRATEGY: null });
    }
    setResearchMode('normal'); setMaxIterations(DEFAULT_MAX_ITERATIONS);
    setClarificationQuestions([]); setUserAnswers({}); setAccumulatedAnswers([]); setResearchStrategy('');
    setCurrentPhase(isFullReset ? 'INPUT' : currentPhase); 
    setResearchLog([]); setExecutedSteps([]); setFinalReport(''); setAllSources([]);
    setInitialStreamingReportContent(''); setElaboratedStreamingReportContent(''); setIsElaboratingReport(false);
    setIsLoading(false); setLoadingMessageBase(''); setLoadingDots(''); setError(null); setKeepAlivePing(null);
    researchCancelledRef.current = false; clarificationRoundRef.current = 0;
    setResearchStartTime(null); setResearchEndTime(null); setCopyStatus('idle');
    setProposedFirstAction(null);
    clearTimers();
  }, [currentPhase, clearTimers]);


  const saveCheckpoint = useCallback((name: CheckpointName, data: Partial<CheckpointData>) => {
    const checkpointToSave: CheckpointData = {
        phaseToRestore: 'INPUT', 
        researchTopic, researchMode, maxIterations,
        accumulatedAnswers: [...accumulatedAnswers],
        clarificationQuestions: [...clarificationQuestions], 
        userAnswers: {...userAnswers}, 
        researchStrategy: researchStrategy,
        ...data,
    };
    setSavedCheckpoints(prev => ({ ...prev, [name]: checkpointToSave }));
    addLogEntry('system', `Checkpoint "${name}" saved.`);
  }, [researchTopic, researchMode, maxIterations, accumulatedAnswers, researchStrategy, clarificationQuestions, userAnswers, addLogEntry]);

  const loadCheckpoint = useCallback((name: CheckpointName) => {
    const checkpoint = savedCheckpoints[name];
    if (!checkpoint) {
      handleError(`Checkpoint "${name}" not found or is invalid.`);
      return;
    }
    addLogEntry('system', `Loading checkpoint "${name}"...`);
    resetState(false); 

    setResearchTopic(checkpoint.researchTopic);
    setResearchMode(checkpoint.researchMode);
    setMaxIterations(checkpoint.maxIterations);
    setAccumulatedAnswers(checkpoint.accumulatedAnswers || []);
    setResearchStrategy(checkpoint.researchStrategy || '');
    setClarificationQuestions(checkpoint.clarificationQuestions || []);
    setUserAnswers(checkpoint.userAnswers || {});
    
    if (name === 'POST_CLARIFICATION') {
      if (checkpoint.researchStrategy) { 
        setResearchStrategy(checkpoint.researchStrategy);
        setCurrentPhase('STRATEGY_REVIEW');
      } else {
        if ((checkpoint.accumulatedAnswers && checkpoint.accumulatedAnswers.length > 0) || checkpoint.researchTopic) {
             setIsLoading(true); setLoadingMessageBase("Re-generating strategy from checkpoint...");
             generateResearchStrategy(checkpoint.researchTopic, checkpoint.accumulatedAnswers || [], checkpoint.researchMode)
                .then(strategy => {
                    setResearchStrategy(strategy);
                    setCurrentPhase('STRATEGY_REVIEW');
                    addLogEntry('system', `Strategy regenerated from checkpoint.`);
                })
                .catch(e => handleError(e.message || "Failed to regenerate strategy from checkpoint."))
                .finally(() => { setIsLoading(false); setLoadingMessageBase(''); });
        } else {
            setCurrentPhase('ITERATIVE_CLARIFICATION'); 
        }
      }
    } else if (name === 'POST_STRATEGY') {
      if(checkpoint.researchStrategy) setResearchStrategy(checkpoint.researchStrategy);
      setCurrentPhase('STRATEGY_REVIEW'); 
    } else {
      setCurrentPhase(checkpoint.phaseToRestore);
    }
    setShowCheckpointsDropdown(false);
  }, [savedCheckpoints, resetState, addLogEntry, handleError]);


  const handleTopicSubmit = useCallback(async () => {
    if (!researchTopic.trim() || maxIterations < 1 || maxIterations > 500) {
      setError(!researchTopic.trim() ? "Please enter a topic." : "Max iterations: 1-500."); return;
    }
    setIsLoading(true); setError(null); setLoadingMessageBase("Initializing research...");
    setResearchLog([]); setAccumulatedAnswers([]); setUserAnswers({}); 
    setExecutedSteps([]); setAllSources([]); setFinalReport(''); 
    setInitialStreamingReportContent(''); setElaboratedStreamingReportContent(''); setIsElaboratingReport(false);
    setResearchStartTime(null); setResearchEndTime(null);
    setProposedFirstAction(null);
    clarificationRoundRef.current = 1;
    addLogEntry('system', `Topic: "${researchTopic}". Mode: ${researchMode}. Max Iter: ${maxIterations}.`);
    try {
      setLoadingMessageBase("Fetching initial context...");
      const initialContext = await getInitialTopicContext(researchTopic, researchMode);
      addLogEntry('summary', `Initial context: ${initialContext.substring(0, 100)}...`);
      setLoadingMessageBase("Generating clarification questions...");
      const questions = await generateInitialClarificationQuestions(researchTopic, researchMode, initialContext);
      setClarificationQuestions(questions.map((q, i) => ({ id: i, question: q })));
      setCurrentPhase('ITERATIVE_CLARIFICATION');
      addLogEntry('clarification_q', `Generated ${questions.length} initial questions.`);
    } catch (e) { handleError(e instanceof Error ? e.message : "Initial processing failed.");} 
    finally { setIsLoading(false); setLoadingMessageBase(''); }
  }, [researchTopic, researchMode, maxIterations, addLogEntry, handleError]);

  const handleAnswersSubmit = useCallback(async () => {
    const currentAnswersArray = clarificationQuestions.map(cq => ({ questionId: cq.id, questionText: cq.question, answer: userAnswers[cq.id]?.trim() || "" })).filter(ans => ans.answer);
    if (currentAnswersArray.length < clarificationQuestions.length && clarificationQuestions.length > 0) { 
        setError("Please answer all questions or skip clarification."); return; 
    }

    setIsLoading(true); setLoadingMessageBase(`Evaluating answers (Round ${clarificationRoundRef.current})...`); setError(null);
    addLogEntry('clarification_a', `Answers for round ${clarificationRoundRef.current} submitted.`);
    const newAccumulated = [...accumulatedAnswers, ...currentAnswersArray];
    setAccumulatedAnswers(newAccumulated);
    try {
      const evalResult: EvaluatedAnswers = await evaluateAnswersAndGenerateFollowUps(researchTopic, clarificationQuestions, currentAnswersArray, researchMode);
      if (evalResult.areAnswersSufficient || clarificationQuestions.length === 0) {
        addLogEntry('system', "Answers sufficient. Generating strategy..."); setLoadingMessageBase("Generating strategy...");
        const strategy = await generateResearchStrategy(researchTopic, newAccumulated, researchMode);
        setResearchStrategy(strategy); 
        setCurrentPhase('STRATEGY_REVIEW'); 
        addLogEntry('system', `Strategy: "${strategy.substring(0,100)}..."`);
        saveCheckpoint('POST_CLARIFICATION', { accumulatedAnswers: newAccumulated, researchStrategy: strategy, phaseToRestore: 'STRATEGY_REVIEW' });
      } else if (evalResult.followUpQuestions?.length) {
        clarificationRoundRef.current++; addLogEntry('system', `More clarification needed (Round ${clarificationRoundRef.current}).`);
        setClarificationQuestions(evalResult.followUpQuestions.map((q, i) => ({ id: i, question: q })));
        setUserAnswers({}); setCurrentPhase('ITERATIVE_CLARIFICATION'); addLogEntry('clarification_q', `Generated ${evalResult.followUpQuestions.length} follow-up questions.`);
      } else { 
        addLogEntry('system', "No further questions or deemed sufficient. Generating strategy..."); setLoadingMessageBase("Generating strategy...");
        const strategy = await generateResearchStrategy(researchTopic, newAccumulated, researchMode);
        setResearchStrategy(strategy); setCurrentPhase('STRATEGY_REVIEW'); addLogEntry('system', `Strategy generated.`);
        saveCheckpoint('POST_CLARIFICATION', { accumulatedAnswers: newAccumulated, researchStrategy: strategy, phaseToRestore: 'STRATEGY_REVIEW' });
      }
    } catch (e) { handleError(e instanceof Error ? e.message : "Clarification/strategy failed.");}
    finally { setIsLoading(false); setLoadingMessageBase('');}
  }, [userAnswers, clarificationQuestions, researchTopic, researchMode, addLogEntry, accumulatedAnswers, handleError, saveCheckpoint]);
  
  const handleSkipClarification = useCallback(async () => {
    setIsLoading(true); setLoadingMessageBase("Skipping clarification, generating strategy..."); setError(null);
    addLogEntry('system', 'User skipped clarification. Generating strategy.');
    try {
      const strategy = await generateResearchStrategy(researchTopic, accumulatedAnswers, researchMode);
      setResearchStrategy(strategy); setCurrentPhase('STRATEGY_REVIEW'); addLogEntry('system', `Strategy generated (skipped clarification).`);
      saveCheckpoint('POST_CLARIFICATION', { accumulatedAnswers: [...accumulatedAnswers], researchStrategy: strategy, phaseToRestore: 'STRATEGY_REVIEW' });
    } catch (e) { handleError(e instanceof Error ? e.message : "Strategy gen failed (skip).");}
    finally { setIsLoading(false); setLoadingMessageBase('');}
  }, [researchTopic, accumulatedAnswers, researchMode, addLogEntry, handleError, saveCheckpoint]);

  const handleProceedToActionReview = useCallback(async (updatedStrategy: string) => {
    if (!updatedStrategy.trim()) { setError("Strategy cannot be empty."); return; }
    setIsLoading(true); setLoadingMessageBase("Deciding first research action..."); setError(null);
    setExecutedSteps([]); setAllSources([]); setFinalReport(''); researchCancelledRef.current = false;
    setInitialStreamingReportContent(''); setElaboratedStreamingReportContent(''); setIsElaboratingReport(false);
    setResearchStartTime(null); setResearchEndTime(null); 
    
    setResearchStrategy(updatedStrategy); 
    addLogEntry('system', `Strategy approved/updated. Deciding first action for review.`);
    addLogEntry('system', `Current Strategy: "${updatedStrategy.substring(0,150)}..."`);
    saveCheckpoint('POST_STRATEGY', { researchStrategy: updatedStrategy, phaseToRestore: 'ACTION_REVIEW' });

    try {
      const firstActionDetails = await decideNextResearchAction(researchTopic, updatedStrategy, [], 1, maxIterations, researchMode);
      setProposedFirstAction(firstActionDetails);
      setCurrentPhase('ACTION_REVIEW');
      addLogEntry('thought', `AI proposed first action: "${firstActionDetails.action}". Reason: "${firstActionDetails.reason}".`);
    } catch (e) { handleError(e instanceof Error ? e.message : "Failed to decide first action.");
    } finally { setIsLoading(false); setLoadingMessageBase(''); }
  }, [researchTopic, researchMode, maxIterations, addLogEntry, handleError, saveCheckpoint]);
  
  const handleExecuteInitialActionAndProceed = useCallback(async (actionToExecute: string, reasonForAction: string) => {
    setIsLoading(true); setLoadingMessageBase("Executing initial validated action...");
    addLogEntry('action', `User validated/AI initiated action: "${actionToExecute}"`);
    if (!researchStartTime) setResearchStartTime(Date.now());
    
    try {
      const stepResult = await executeResearchStep(actionToExecute, researchMode);
      if (!stepResult.text && stepResult.sources.length === 0) {
        addLogEntry('system', `Warning: Initial action "${actionToExecute}" yielded no text and no sources.`);
      }
      if (stepResult.sources.length) {
        addLogEntry('sources', `Found ${stepResult.sources.length} sources.`, stepResult.sources);
        setAllSources(prev => [...prev, ...stepResult.sources.filter(ns => !prev.some(es => es.uri === ns.uri))]);
      }
      setLoadingMessageBase("Summarizing initial action results...");
      const summary = await summarizeText(stepResult.text, researchMode, researchTopic);
      addLogEntry('summary', `Summary (initial step): ${summary}`);
      const outcome: ExecutedStepOutcome = {
        action: actionToExecute,
        reason: reasonForAction,
        rawResultText: stepResult.text,
        summary,
        sources: stepResult.sources
      };
      setExecutedSteps([outcome]); 
      setCurrentPhase('EXECUTING');
      addLogEntry('system', "Initial action executed. Starting iterative research.");
    } catch (e) {
      handleError(e instanceof Error ? e.message : "Failed to execute initial action.");
    } finally {
      if (currentPhase !== 'EXECUTING' && currentPhase !== 'ERROR') {
          setIsLoading(false); setLoadingMessageBase('');
      }
    }
  }, [researchTopic, researchMode, addLogEntry, researchStartTime, handleError, currentPhase]); 

  const handleStartResearchDirectly = useCallback(async (updatedStrategy: string) => {
    if (!updatedStrategy.trim()) { setError("Strategy cannot be empty."); return; }
    setIsLoading(true); setLoadingMessageBase("Preparing to start research directly..."); setError(null);
    setExecutedSteps([]); setAllSources([]); setFinalReport(''); researchCancelledRef.current = false;
    setInitialStreamingReportContent(''); setElaboratedStreamingReportContent(''); setIsElaboratingReport(false);
    setResearchStartTime(Date.now()); setResearchEndTime(null);

    setResearchStrategy(updatedStrategy);
    addLogEntry('system', `Strategy approved. User skipped action review. Starting research directly.`);
    addLogEntry('system', `Current Strategy: "${updatedStrategy.substring(0,150)}..."`);
    saveCheckpoint('POST_STRATEGY', { researchStrategy: updatedStrategy, phaseToRestore: 'EXECUTING' });
    
    try {
      setLoadingMessageBase("Deciding first research action (auto-execute)...");
      const firstActionDetails = await decideNextResearchAction(researchTopic, updatedStrategy, [], 1, maxIterations, researchMode);
      addLogEntry('thought', `AI proposed first action (auto-executing): "${firstActionDetails.action}". Reason: "${firstActionDetails.reason}".`);
      await handleExecuteInitialActionAndProceed(firstActionDetails.action, firstActionDetails.reason);
    } catch (e) {
      handleError(e instanceof Error ? e.message : "Failed to start research directly.");
    } 
  }, [researchTopic, researchMode, maxIterations, addLogEntry, handleExecuteInitialActionAndProceed, handleError, saveCheckpoint]);


  const handleCancelResearch = () => {
    researchCancelledRef.current = true; addLogEntry('system', "User requested cancellation.");
    setIsLoading(false); setLoadingMessageBase("Cancelling research..."); clearTimers(); 
  };

  useEffect(() => { 
    if (currentPhase !== 'EXECUTING' || researchCancelledRef.current || isLoading) {
      if (researchCancelledRef.current && researchStartTime && !researchEndTime && currentPhase !== 'EXECUTING') {
        setResearchEndTime(Date.now());
        if (isLoading) setIsLoading(false); 
        if (loadingMessageBase) setLoadingMessageBase('');
        clearTimers();
      }
      return;
    }
    const runLoop = async () => {
      setIsLoading(true); 
      let localSteps: ExecutedStepOutcome[] = [...executedSteps]; 
      
      for (let i = localSteps.length; i < maxIterations && !researchCancelledRef.current; i++) {
        const iterNum = i + 1; 
        setLoadingMessageBase(`Iter ${iterNum}/${maxIterations}: Deciding action...`); addLogEntry('system', `Iter ${iterNum}: Deciding...`);
        try {
          const decision = await decideNextResearchAction(researchTopic, researchStrategy, localSteps, iterNum, maxIterations, researchMode);
          addLogEntry('thought', `AI action: "${decision.action}". Reason: "${decision.reason}"`);
          if (researchCancelledRef.current) break;

          setLoadingMessageBase(`Iter ${iterNum}: Executing "${decision.action.substring(0,30)}..."`); addLogEntry('action', `Executing: "${decision.action}"`);
          const stepResult = await executeResearchStep(decision.action, researchMode);
          if (!stepResult.text && stepResult.sources.length === 0) {
            addLogEntry('system', `Warning: Action (Iter ${iterNum}) "${decision.action}" yielded no text and no sources.`);
          }
          if (researchCancelledRef.current) break;

          if (stepResult.sources.length) {
            addLogEntry('sources', `Found ${stepResult.sources.length} sources.`, stepResult.sources);
            setAllSources(prev => [...prev, ...stepResult.sources.filter(ns => !prev.some(es => es.uri === ns.uri))]);
          }
          setLoadingMessageBase(`Iter ${iterNum}: Summarizing...`);
          const summary = await summarizeText(stepResult.text, researchMode, researchTopic);
          addLogEntry('summary', `Summary (step ${iterNum}): ${summary}`);
          const outcome: ExecutedStepOutcome = { ...decision, rawResultText: stepResult.text, summary, sources: stepResult.sources };
          localSteps.push(outcome); setExecutedSteps(prev => [...prev, outcome]); 
          if (decision.shouldStop) { addLogEntry('system', "AI suggests stopping."); break; }
        } catch (e) { handleError(e instanceof Error ? e.message : "Research iter error."); return; }
      }
      if (researchCancelledRef.current) addLogEntry('system', `Research cancelled. Processing ${localSteps.length} steps.`);
      else addLogEntry('system', `Research loop finished. ${localSteps.length} steps.`);

      if (localSteps.length > 0) {
        setLoadingMessageBase("Synthesizing report (initial)..."); addLogEntry('system', "Synthesizing report...");
        setInitialStreamingReportContent(''); setElaboratedStreamingReportContent(''); setIsElaboratingReport(false);
        let tempInitialReport = "";
        let tempElaboratedReport = "";
        let finalSynthesizedReport = "";

        try {
          for await (const chunk of synthesizeReport(researchTopic, researchStrategy, localSteps, researchMode)) {
            if (researchCancelledRef.current && chunk.type !== 'initial_report_complete' && chunk.type !== 'elaborated_report_complete') {
                addLogEntry('system', "Report synthesis cancelled by user.");
                break;
            }
            switch (chunk.type) {
              case 'initial_chunk':
                tempInitialReport += chunk.content;
                setInitialStreamingReportContent(prev => prev + (chunk.content || ''));
                break;
              case 'initial_report_complete':
                addLogEntry('system', "Initial report draft generated.");
                if (chunk.error) addLogEntry('error', `Initial report error: ${chunk.error}`);
                finalSynthesizedReport = chunk.fullReportText || tempInitialReport; 
                setInitialStreamingReportContent(''); 
                setIsElaboratingReport(true);
                setLoadingMessageBase("Elaborating report...");
                break;
              case 'elaborated_chunk':
                tempElaboratedReport += chunk.content;
                setElaboratedStreamingReportContent(prev => prev + (chunk.content || ''));
                break;
              case 'elaborated_report_complete':
                addLogEntry('system', "Report elaboration complete.");
                if (chunk.error) addLogEntry('error', `Report elaboration error: ${chunk.error}`);
                if (chunk.note) addLogEntry('system', `Elaboration note: ${chunk.note}`);
                finalSynthesizedReport = chunk.fullReportText || tempElaboratedReport || finalSynthesizedReport; 
                break;
            }
          }
          if (researchCancelledRef.current) {
             addLogEntry('system', "Report was cancelled. Displaying available content.");
             setFinalReport(tempElaboratedReport || tempInitialReport || "Report generation was cancelled.");
          } else {
            setFinalReport(finalSynthesizedReport);
          }
          setCurrentPhase('REPORT'); addLogEntry('system', "Report phase ready.");
        } catch (e) { handleError(e instanceof Error ? e.message : "Report synthesis stream error."); }
      } else {
        addLogEntry('system', "No steps executed or results found. No report.");
        setCurrentPhase(researchCancelledRef.current && localSteps.length === 0 ? 'INPUT' : 'STRATEGY_REVIEW'); 
      }
      setResearchEndTime(Date.now()); setIsLoading(false); setLoadingMessageBase(''); clearTimers();
    };
    runLoop();
  }, [currentPhase, researchTopic, researchStrategy, researchMode, maxIterations, addLogEntry, handleError, executedSteps, isLoading, researchStartTime, researchEndTime, clearTimers, loadingMessageBase]); // Added isLoading, researchStartTime, researchEndTime, clearTimers, loadingMessageBase to dependencies
  
  const handleCopyMarkdown = useCallback(() => { if (!finalReport) return; navigator.clipboard.writeText(finalReport).then(() => { setCopyStatus('copied'); setTimeout(() => setCopyStatus('idle'), 2000); }).catch(err => setError("Failed to copy: "+err)); }, [finalReport]);
  const handleDownloadTxt = useCallback(() => { if (!finalReport) return; const blob = new Blob([finalReport],{type:'text/plain;charset=utf-8'}); const link=document.createElement('a'); link.href=URL.createObjectURL(blob); link.download=`KResearch-${researchTopic.substring(0,20)}.txt`; link.click(); URL.revokeObjectURL(link.href); }, [finalReport, researchTopic]);

  const toggleCheckpointsDropdown = () => setShowCheckpointsDropdown(prev => !prev);

  const effectiveLoadingMessage = `${loadingMessageBase}${loadingDots}`;

  return (
    <div className="bg-gray-900 text-gray-100 min-h-screen flex flex-col items-center p-4 font-sans">
      {!API_KEY_CONFIGURED && <ApiKeyWarning />}
      <div className="w-full max-w-2xl mx-auto space-y-8">
        <div className="flex justify-between items-start">
            <AppHeader />
            <div className="relative mt-2">
                <button 
                    onClick={toggleCheckpointsDropdown}
                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md text-gray-300 hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    title="Load Checkpoint"
                    aria-haspopup="true"
                    aria-expanded={showCheckpointsDropdown}
                >
                    <ArrowDownOnSquareStackIcon className="w-5 h-5" />
                </button>
                {showCheckpointsDropdown && (
                    <div className="absolute right-0 mt-2 w-72 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-20 p-2 space-y-2">
                        <p className="text-sm text-gray-400 px-2">Load a saved checkpoint:</p>
                        {Object.entries(savedCheckpoints).map(([key, value]) => (
                            <button
                                key={key}
                                onClick={() => loadCheckpoint(key as CheckpointName)}
                                disabled={!value}
                                className="w-full text-left px-3 py-2 text-sm rounded-md bg-gray-700 hover:bg-blue-600 disabled:bg-gray-600 disabled:text-gray-500 disabled:cursor-not-allowed text-gray-200"
                            >
                                {key === 'POST_CLARIFICATION' ? 'Clarification Complete (Strategy Next)' : 'Strategy Approved (Execution Next)'}
                                {!value && <span className="text-xs text-gray-500 ml-1">(Not Reached)</span>}
                            </button>
                        ))}
                         <button onClick={() => setShowCheckpointsDropdown(false)} className="mt-2 text-xs text-gray-500 hover:text-gray-300 w-full">Close</button>
                    </div>
                )}
            </div>
        </div>

        <main className="bg-gray-800 shadow-2xl rounded-xl p-3 sm:p-5">
          {isLoading && currentPhase !== 'EXECUTING' && <div className="mb-4"><LoadingSpinner message={effectiveLoadingMessage || "Processing..."} /></div>}
          {keepAlivePing && <div className="mb-2 p-2 text-center text-sm bg-blue-900 bg-opacity-40 border border-blue-700 text-blue-300 rounded-md">{keepAlivePing}</div>}
          {error && currentPhase !== 'ERROR' && <div className="mb-4 p-3 bg-red-700 bg-opacity-30 border border-red-600 text-red-300 rounded-md">Error: {error} <button onClick={() => setError(null)} className="ml-2 text-xs underline">(Dismiss)</button></div>}
          
          {currentPhase === 'INPUT' && <PhaseInput researchTopic={researchTopic} setResearchTopic={setResearchTopic} researchMode={researchMode} setResearchMode={setResearchMode} maxIterations={maxIterations} setMaxIterations={setMaxIterations} handleTopicSubmit={handleTopicSubmit} isLoading={isLoading} />}
          {currentPhase === 'ITERATIVE_CLARIFICATION' && <PhaseClarification researchTopic={researchTopic} clarificationQuestions={clarificationQuestions} userAnswers={userAnswers} setUserAnswers={setUserAnswers} handleAnswersSubmit={handleAnswersSubmit} handleSkipClarification={handleSkipClarification} isLoading={isLoading} clarificationRound={clarificationRoundRef.current} onBackToTopic={() => { resetState(true); setCurrentPhase('INPUT'); }} />}
          {currentPhase === 'STRATEGY_REVIEW' && <PhaseStrategyReview researchTopic={researchTopic} initialStrategy={researchStrategy} researchMode={researchMode} maxIterations={maxIterations} handleProceedToActionReview={handleProceedToActionReview} handleStartResearchDirectly={handleStartResearchDirectly} isLoading={isLoading} onBackToClarifications={() => { setCurrentPhase('ITERATIVE_CLARIFICATION'); setError(null);}} />}
          {currentPhase === 'ACTION_REVIEW' && proposedFirstAction && <PhaseActionReview researchTopic={researchTopic} researchStrategy={researchStrategy} proposedAction={proposedFirstAction} isLoading={isLoading} handleExecuteInitialActionAndProceed={handleExecuteInitialActionAndProceed} onBackToStrategy={() => {setCurrentPhase('STRATEGY_REVIEW'); setError(null); setProposedFirstAction(null); setIsLoading(false);}} maxIterations={maxIterations} researchMode={researchMode}/>}
          {currentPhase === 'EXECUTING' && <PhaseExecuting handleCancelResearch={handleCancelResearch} isLoading={isLoading} loadingMessage={effectiveLoadingMessage || "Executing research steps..."} researchLog={researchLog} researchMode={researchMode} maxIterations={maxIterations} researchCancelled={researchCancelledRef.current} />}
          {currentPhase === 'REPORT' && <PhaseReport researchTopic={researchTopic} finalReport={finalReport} researchMode={researchMode} maxIterations={maxIterations} executedStepsCount={executedSteps.length} researchDuration={researchEndTime && researchStartTime ? researchEndTime - researchStartTime : null} allSources={allSources} areSourcesVisible={areSourcesVisible} toggleSourcesVisibility={() => setAreSourcesVisible(v => !v)} resetState={() => resetState(true)} handleCopyMarkdown={handleCopyMarkdown} handleDownloadTxt={handleDownloadTxt} copyStatus={copyStatus} initialStreamingContent={initialStreamingReportContent} elaboratedStreamingContent={elaboratedStreamingReportContent} isElaborating={isElaboratingReport} />}
          {currentPhase === 'ERROR' && <PhaseError error={error} resetState={() => resetState(true)} />}
        </main>

        {researchLog.length > 0 && currentPhase !== 'EXECUTING' && currentPhase !== 'INPUT' && (
          <section className="bg-gray-800 shadow-xl rounded-lg p-3 sm:p-4 mt-6 w-full">
            <button onClick={() => setIsLogVisible(v => !v)} className="flex items-center justify-between w-full text-left py-2 px-1 text-lg font-semibold text-gray-300 hover:text-blue-300">
                Research Log ({researchLog.length}) {isLogVisible ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </button>
            {isLogVisible && <div ref={logEndRef}><ResearchLogView logEntries={researchLog} compact={true} /></div>}
          </section>
        )}
        <footer className="text-center py-4 text-xs text-gray-500">KResearch AI Agent v1.3</footer>
      </div>
    </div>
  );
};
export default App;
