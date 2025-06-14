
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Source, AppPhase, ClarificationQuestion, UserAnswer, 
  ResearchLogEntry, ResearchLogEntryType, ExecutedStepOutcome, ResearchMode 
} from './types';
import { 
  generateInitialClarificationQuestions, evaluateAnswersAndGenerateFollowUps, generateResearchStrategy, 
  decideNextResearchAction, executeResearchStep, summarizeText, synthesizeReport 
} from './services/geminiService';
import LoadingSpinner from './components/LoadingSpinner';
import { 
  PencilIcon, PlayIcon, ArrowPathIcon, ChevronDownIcon, ChevronUpIcon, SendIcon, StopIcon 
} from './components/icons';

// Helper to render markdown-like text with clickable links
const MarkdownRenderer: React.FC<{ text: string }> = React.memo(({ text }) => {
  const processText = (inputText: string): React.ReactNode[] => {
    const linkRegex = /\[([^\]]+)]\((https?:\/\/[^\s)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(inputText)) !== null) {
      if (match.index > lastIndex) {
        parts.push(inputText.substring(lastIndex, match.index));
      }
      const linkText = match[1];
      const linkUrl = match[2];
      parts.push(
        <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline" key={`${linkUrl}-${match.index}`}>
          {linkText}
        </a>
      );
      lastIndex = linkRegex.lastIndex;
    }

    if (lastIndex < inputText.length) {
      parts.push(inputText.substring(lastIndex));
    }
    
    return parts.map((part, index) => <React.Fragment key={index}>{part}</React.Fragment>);
  };
  
  return (
    <div className="whitespace-pre-wrap break-words leading-relaxed">
      {text.split(/(\n)/).map((line, index) => 
        line === '\n' ? <br key={`br-${index}`} /> : <span key={`line-${index}`}>{processText(line)}</span>
      )}
    </div>
  );
});

const NORMAL_MODE_MAX_ITERATIONS = 25;
const DEEPER_MODE_MAX_ITERATIONS = 25; 
const API_KEY_CONFIGURED = !!process.env.API_KEY;


const App: React.FC = () => {
  const [researchTopic, setResearchTopic] = useState<string>('');
  const [researchMode, setResearchMode] = useState<ResearchMode>('normal');
  const [clarificationQuestions, setClarificationQuestions] = useState<ClarificationQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({}); // Answers for the current batch of questions
  const [accumulatedAnswers, setAccumulatedAnswers] = useState<UserAnswer[]>([]); // All answers from all clarification rounds
  const [researchStrategy, setResearchStrategy] = useState<string>('');
  
  const [currentPhase, setCurrentPhase] = useState<AppPhase>('INPUT');
  const [researchLog, setResearchLog] = useState<ResearchLogEntry[]>([]);
  const [executedSteps, setExecutedSteps] = useState<ExecutedStepOutcome[]>([]);
  const [finalReport, setFinalReport] = useState<string>('');
  const [allSources, setAllSources] = useState<Source[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  const [isLogVisible, setIsLogVisible] = useState<boolean>(true);
  const [areSourcesVisible, setAreSourcesVisible] = useState<boolean>(true);

  const researchCancelledRef = useRef<boolean>(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const clarificationRoundRef = useRef<number>(0);

  const addLogEntry = useCallback((type: ResearchLogEntryType, content: string, sources?: Source[]) => {
    setResearchLog(prev => [...prev, { id: crypto.randomUUID(), timestamp: Date.now(), type, content, sources }]);
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [researchLog]);

  const resetState = useCallback(() => {
    setResearchTopic('');
    setResearchMode('normal');
    setClarificationQuestions([]);
    setUserAnswers({});
    setAccumulatedAnswers([]);
    setResearchStrategy('');
    setCurrentPhase('INPUT');
    setResearchLog([]);
    setExecutedSteps([]);
    setFinalReport('');
    setAllSources([]);
    setIsLoading(false);
    setLoadingMessage('');
    setError(null);
    researchCancelledRef.current = false;
    clarificationRoundRef.current = 0;
  }, []);

  const handleTopicSubmit = useCallback(async () => {
    if (!researchTopic.trim()) {
      setError("Please enter a research topic.");
      return;
    }
    setIsLoading(true);
    setLoadingMessage("Generating initial clarification questions...");
    setError(null);
    setResearchLog([]); 
    setAccumulatedAnswers([]); 
    setUserAnswers({}); 
    clarificationRoundRef.current = 1;
    addLogEntry('system', `Topic: "${researchTopic}". Mode: ${researchMode}. Generating initial clarification questions (Round ${clarificationRoundRef.current})...`);
    
    try {
      const questions = await generateInitialClarificationQuestions(researchTopic, researchMode);
      setClarificationQuestions(questions.map((q, i) => ({ id: i, question: q })));
      setCurrentPhase('ITERATIVE_CLARIFICATION');
      addLogEntry('clarification_q', `Generated ${questions.length} initial questions:\n${questions.map((q,i) => `${i+1}. ${q}`).join('\n')}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to generate initial clarification questions.";
      setError(msg);
      addLogEntry('error', msg);
      setCurrentPhase('ERROR');
    } finally {
      setIsLoading(false);
    }
  }, [researchTopic, researchMode, addLogEntry]);

  const handleAnswersSubmit = useCallback(async () => {
    const currentAnswersArray: UserAnswer[] = clarificationQuestions
      .map(cq => ({
          questionId: cq.id,
          questionText: cq.question,
          answer: userAnswers[cq.id]?.trim() || ""
      }))
      .filter(ans => ans.answer); 

    if (currentAnswersArray.length < clarificationQuestions.length) {
      setError("Please answer all clarification questions.");
      return;
    }

    setIsLoading(true);
    setLoadingMessage(`Evaluating answers (Round ${clarificationRoundRef.current})...`);
    setError(null);
    addLogEntry('clarification_a', `Answers submitted for round ${clarificationRoundRef.current}:\n${currentAnswersArray.map(ua => `Q: ${ua.questionText}\nA: ${ua.answer}`).join('\n---\n')}`);
    
    const newAccumulatedAnswers = [...accumulatedAnswers, ...currentAnswersArray];
    setAccumulatedAnswers(newAccumulatedAnswers);

    try {
      const evaluation = await evaluateAnswersAndGenerateFollowUps(researchTopic, clarificationQuestions, currentAnswersArray, researchMode);
      
      if (evaluation.areAnswersSufficient) {
        addLogEntry('system', "AI determined answers are sufficient. Generating research strategy...");
        setLoadingMessage("Generating research strategy...");
        const strategy = await generateResearchStrategy(researchTopic, newAccumulatedAnswers, researchMode);
        setResearchStrategy(strategy);
        setCurrentPhase('STRATEGY_REVIEW');
        addLogEntry('system', `Research strategy generated: "${strategy.substring(0,150)}..."`);
      } else if (evaluation.followUpQuestions && evaluation.followUpQuestions.length > 0) {
        clarificationRoundRef.current += 1;
        addLogEntry('system', `Answers require further clarification. Generating follow-up questions (Round ${clarificationRoundRef.current}).`);
        setClarificationQuestions(evaluation.followUpQuestions.map((q, i) => ({ id: i, question: q })));
        setUserAnswers({}); 
        setCurrentPhase('ITERATIVE_CLARIFICATION'); 
        addLogEntry('clarification_q', `Generated ${evaluation.followUpQuestions.length} follow-up questions:\n${evaluation.followUpQuestions.map((q,i) => `${i+1}. ${q}`).join('\n')}`);
      } else {
        addLogEntry('system', "AI determined answers sufficient (or no further questions provided). Generating research strategy.");
        setLoadingMessage("Generating research strategy...");
        const strategy = await generateResearchStrategy(researchTopic, newAccumulatedAnswers, researchMode);
        setResearchStrategy(strategy);
        setCurrentPhase('STRATEGY_REVIEW');
        addLogEntry('system', `Research strategy generated: "${strategy.substring(0,150)}..."`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed during clarification/strategy generation.";
      setError(msg);
      addLogEntry('error', msg);
      setCurrentPhase('ERROR');
    } finally {
      setIsLoading(false);
    }
  }, [userAnswers, clarificationQuestions, researchTopic, researchMode, addLogEntry, accumulatedAnswers]);

  const handleSkipClarification = useCallback(async () => {
    setIsLoading(true);
    setLoadingMessage("Skipping clarification, generating research strategy...");
    setError(null);
    addLogEntry('system', 'User skipped clarification. Proceeding to generate research strategy based on available information.');

    try {
      const strategy = await generateResearchStrategy(researchTopic, accumulatedAnswers, researchMode); 
      setResearchStrategy(strategy);
      setCurrentPhase('STRATEGY_REVIEW');
      addLogEntry('system', `Research strategy generated: "${strategy.substring(0,150)}..."`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to generate research strategy after skipping clarification.";
      setError(msg);
      addLogEntry('error', msg);
      setCurrentPhase('ERROR');
    } finally {
      setIsLoading(false);
    }
  }, [researchTopic, accumulatedAnswers, researchMode, addLogEntry]);

  const handleStartIterativeResearch = useCallback(() => {
    if (!researchStrategy) {
      setError("Research strategy is not available.");
      return;
    }
    setError(null);
    setExecutedSteps([]);
    setAllSources([]);
    setFinalReport('');
    researchCancelledRef.current = false;
    setCurrentPhase('EXECUTING');
    addLogEntry('system', `Starting iterative research (Mode: ${researchMode}). Strategy: "${researchStrategy.substring(0,100)}..."`);
  }, [researchStrategy, addLogEntry, researchMode]);
  
  const handleCancelResearch = () => {
    researchCancelledRef.current = true;
    addLogEntry('system', "Research cancellation requested by user.");
    setIsLoading(false); 
  };

  useEffect(() => {
    if (currentPhase !== 'EXECUTING' || researchCancelledRef.current || isLoading) return; 

    const runResearchLoop = async () => {
      setIsLoading(true); 
      
      let currentIter = 0;
      let stopResearch = false;
      const maxIterations = researchMode === 'deeper' ? DEEPER_MODE_MAX_ITERATIONS : NORMAL_MODE_MAX_ITERATIONS;
      const iterationDisplaySuffix = `/${maxIterations}`; // Both modes have same max iteration now

      while(currentIter < maxIterations && !stopResearch && !researchCancelledRef.current) {
        setLoadingMessage(`Research Iteration ${currentIter + 1}${iterationDisplaySuffix}... Deciding next action.`);
        addLogEntry('system', `Iteration ${currentIter + 1}: Deciding next research action...`);
        
        try {
          const decision = await decideNextResearchAction(
            researchTopic, 
            researchStrategy, 
            executedSteps, 
            currentIter + 1,
            maxIterations,
            researchMode
          );

          addLogEntry('thought', `AI decided action: "${decision.action}". Reason: "${decision.reason}"`);
          
          if (researchCancelledRef.current) break;

          setLoadingMessage(`Iteration ${currentIter + 1}${iterationDisplaySuffix}: Executing "${decision.action.substring(0, 50)}..."`);
          addLogEntry('action', `Executing: "${decision.action}"`);
          const stepResult = await executeResearchStep(decision.action, researchMode);
          
          if (researchCancelledRef.current) break;

          addLogEntry('system', `Found ${stepResult.sources.length} sources for this step.`);
          if (stepResult.sources.length > 0) {
             addLogEntry('sources', `Sources: ${stepResult.sources.map(s => s.title || s.uri).join(', ')}`, stepResult.sources);
             setAllSources(prevAllSources => {
                const newSourcesToAdd = stepResult.sources.filter(
                  newSrc => !prevAllSources.some(existingSrc => existingSrc.uri === newSrc.uri)
                );
                return [...prevAllSources, ...newSourcesToAdd];
             });
          }

          setLoadingMessage(`Iteration ${currentIter + 1}${iterationDisplaySuffix}: Summarizing findings...`);
          const summary = await summarizeText(stepResult.text, researchMode, researchTopic);
          addLogEntry('summary', `Summary for step ${currentIter + 1}: ${summary}`);

          const currentOutcome: ExecutedStepOutcome = {
            action: decision.action,
            reason: decision.reason,
            rawResultText: stepResult.text,
            summary: summary,
            sources: stepResult.sources
          };
          setExecutedSteps(prev => [...prev, currentOutcome]);

          stopResearch = decision.shouldStop;
          if (decision.shouldStop) {
            addLogEntry('system', "AI determined sufficient information gathered or criteria met to stop iterative research.");
          }
          if ((currentIter + 1) >= maxIterations && !stopResearch) { // Check applicable to both modes
             addLogEntry('system', `Reached max iterations (${maxIterations}). Stopping research.`);
             stopResearch = true;
          }

        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : "An unknown error occurred during research iteration.";
          setError(`Error in iteration ${currentIter + 1}: ${errorMsg}`);
          addLogEntry('error', `Error in iteration ${currentIter + 1}: ${errorMsg}`);
          setCurrentPhase('ERROR'); 
          setIsLoading(false); 
          return; 
        }
        currentIter++;
        if (researchCancelledRef.current) {
            addLogEntry('system', "Research process was cancelled by the user.");
            break;
        }
      } 

      if (researchCancelledRef.current) {
        setIsLoading(false);
        return;
      }

      addLogEntry('system', `Iterative research completed after ${currentIter} steps. Synthesizing final report...`);
      setLoadingMessage("Synthesizing final report...");
      try {
        const report = await synthesizeReport(researchTopic, researchStrategy, executedSteps, researchMode);
        setFinalReport(report);
        setCurrentPhase('REPORT');
        addLogEntry('system', "Final report generated successfully.");
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : "An unknown error occurred during report synthesis.";
        setError(`Failed to synthesize report: ${errorMsg}`);
        addLogEntry('error', `Report synthesis failed: ${errorMsg}`);
        setCurrentPhase('ERROR');
      } finally {
        setIsLoading(false);
        setLoadingMessage('');
      }
    };

    runResearchLoop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPhase, researchTopic, researchStrategy, researchMode, addLogEntry]);

  const ActionButton: React.FC<{ onClick: () => void; children: React.ReactNode; className?: string; disabled?: boolean }> = ({ onClick, children, className, disabled }) => (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`px-4 py-2 font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-colors duration-150
                  bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500
                  disabled:bg-gray-500 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );

  const renderInputPhase = () => (
    <div className="space-y-6 p-2">
      <h2 className="text-2xl font-semibold text-center text-blue-300">Enter Your Research Topic</h2>
      <textarea
        value={researchTopic}
        onChange={(e) => setResearchTopic(e.target.value)}
        placeholder="e.g., The future of decentralized finance (DeFi)"
        className="w-full h-32 p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
        disabled={isLoading}
        aria-label="Research Topic Input"
      />
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">Research Mode:</label>
        <div className="flex space-x-4">
          {(['normal', 'deeper'] as ResearchMode[]).map(mode => (
            <label key={mode} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="researchMode"
                value={mode}
                checked={researchMode === mode}
                onChange={() => setResearchMode(mode)}
                className="form-radio h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                disabled={isLoading}
              />
              <span className="text-gray-300 capitalize">{mode} Mode (~{NORMAL_MODE_MAX_ITERATIONS} iterations)</span>
            </label>
          ))}
        </div>
         {researchMode === 'deeper' && <p className="text-xs text-gray-500 mt-1">Deeper mode uses a more advanced model ('gemini-2.5-pro') for higher quality analysis.</p>}
         {researchMode === 'normal' && <p className="text-xs text-gray-500 mt-1">Normal mode uses a fast model ('gemini-2.5-flash') for quicker results.</p>}
      </div>
      <ActionButton onClick={handleTopicSubmit} className="w-full flex items-center justify-center space-x-2">
        <PencilIcon /> <span>Next: Clarify Topic</span>
      </ActionButton>
    </div>
  );

  const renderClarificationPhase = () => (
    <div className="space-y-6 p-2">
      <h2 className="text-2xl font-semibold text-center text-blue-300">Clarify Your Research Focus (Round {clarificationRoundRef.current})</h2>
      <p className="text-gray-400"><span className="font-semibold text-gray-300">Topic:</span> {researchTopic}</p>
      <div className="space-y-4 max-h-96 overflow-y-auto p-1">
        {clarificationQuestions.map(q => (
          <div key={q.id} className="p-3 bg-gray-700 rounded-md">
            <label htmlFor={`q-${q.id}`} className="block text-sm font-medium text-gray-300 mb-1">{q.question}</label>
            <textarea
              id={`q-${q.id}`}
              value={userAnswers[q.id] || ''}
              onChange={(e) => setUserAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
              placeholder="Your answer..."
              className="w-full p-2 bg-gray-600 border border-gray-500 rounded-md focus:ring-1 focus:ring-blue-500 outline-none resize-y min-h-[60px]"
              rows={2}
              disabled={isLoading}
              aria-label={`Answer to: ${q.question}`}
            />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <ActionButton 
          onClick={handleAnswersSubmit} 
          className="w-full flex items-center justify-center space-x-2"
          disabled={isLoading || clarificationQuestions.some(q => !(userAnswers[q.id]?.trim()))}
        >
          <SendIcon /> <span>Submit Answers & Proceed</span>
        </ActionButton>
        <ActionButton 
          onClick={handleSkipClarification} 
          className="w-full flex items-center justify-center space-x-2 bg-gray-600 hover:bg-gray-500 focus:ring-gray-400"
          disabled={isLoading}
        >
          <PlayIcon className="w-5 h-5"/> <span>Skip Clarification & Generate Strategy</span>
        </ActionButton>
      </div>
      <button 
        onClick={() => { 
            setCurrentPhase('INPUT'); 
            setError(null); 
            setClarificationQuestions([]); 
            setUserAnswers({}); 
            setAccumulatedAnswers([]);
        }} 
        className="text-sm text-gray-400 hover:text-gray-300 w-full mt-2 disabled:text-gray-600" disabled={isLoading}>
          Back to Topic
      </button>
    </div>
  );

  const renderStrategyReviewPhase = () => (
    <div className="space-y-6 p-2">
      <h2 className="text-2xl font-semibold text-center text-blue-300">Review Research Strategy</h2>
      <p className="text-gray-400"><span className="font-semibold text-gray-300">Topic:</span> {researchTopic}</p>
      <div className="p-3 bg-gray-700 rounded-md">
        <h3 className="text-md font-semibold text-gray-300 mb-1">Proposed Strategy:</h3>
        <p className="text-gray-400 whitespace-pre-wrap">{researchStrategy}</p>
      </div>
      <ActionButton onClick={handleStartIterativeResearch} className="w-full flex items-center justify-center space-x-2">
        <PlayIcon /> <span>Start Deep Research ({researchMode} mode)</span>
      </ActionButton>
       <button onClick={() => { 
           setCurrentPhase('ITERATIVE_CLARIFICATION'); 
           setError(null); 
        }} className="text-sm text-gray-400 hover:text-gray-300 w-full mt-2 disabled:text-gray-600" disabled={isLoading}>
          Back to Clarifications
      </button>
    </div>
  );
  
  const renderExecutionPhase = () => (
    <div className="space-y-4 p-2">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-blue-300">Research in Progress...</h2>
        <ActionButton onClick={handleCancelResearch} className="bg-red-600 hover:bg-red-700 focus:ring-red-500 flex items-center space-x-1 px-3 py-1.5 text-sm" disabled={!isLoading && researchCancelledRef.current && !loadingMessage}>
          <StopIcon className="w-4 h-4" /> <span>Cancel</span>
        </ActionButton>
      </div>
      {(isLoading || (researchCancelledRef.current && loadingMessage)) && <LoadingSpinner message={loadingMessage || (researchCancelledRef.current ? "Cancelling research..." : "Processing...")} />}
      <div className="mt-4 p-3 bg-gray-800 rounded-lg max-h-[60vh] overflow-y-auto text-sm" ref={logEndRef}>
        <h3 className="text-lg font-semibold text-gray-300 mb-2 sticky top-0 bg-gray-800 py-1 z-10">Live Research Log ({researchMode} mode):</h3>
        {researchLog.map((log) => (
          <div key={log.id} className={`mb-2 p-1.5 rounded-md border-l-4 ${
            log.type === 'error' ? 'border-red-500 bg-red-900 bg-opacity-30' : 
            log.type === 'thought' ? 'border-purple-500 bg-purple-900 bg-opacity-20' : 
            log.type === 'action' ? 'border-yellow-500 bg-yellow-900 bg-opacity-20' :
            log.type === 'summary' ? 'border-green-500 bg-green-900 bg-opacity-20' :
            log.type === 'sources' ? 'border-teal-500 bg-teal-900 bg-opacity-20' :
            log.type === 'clarification_q' ? 'border-cyan-500 bg-cyan-900 bg-opacity-20' :
            log.type === 'clarification_a' ? 'border-indigo-500 bg-indigo-900 bg-opacity-20' :
            'border-gray-600'}`}>
            <span className="text-xs text-gray-500 mr-2">{new Date(log.timestamp).toLocaleTimeString()}</span>
            <span className={`font-semibold ${
                log.type === 'error' ? 'text-red-400' : 
                log.type === 'thought' ? 'text-purple-400' :
                log.type === 'action' ? 'text-yellow-400' :
                log.type === 'summary' ? 'text-green-400' :
                log.type === 'sources' ? 'text-teal-400' :
                log.type === 'clarification_q' ? 'text-cyan-400' :
                log.type === 'clarification_a' ? 'text-indigo-400' :
                 'text-gray-300'}`}>
                {log.type.replace(/_/g, ' ').toUpperCase()}:
            </span>
            <span className="ml-1 text-gray-300 whitespace-pre-wrap break-words">{log.content}</span>
            {log.type === 'sources' && log.sources && log.sources.length > 0 && (
                <div className="mt-1 pl-4 text-xs">
                    {log.sources.map(s => (
                        <a key={s.uri} href={s.uri} target="_blank" rel="noopener noreferrer" className="block text-blue-400 hover:underline truncate">
                           - {s.title || s.uri}
                        </a>
                    ))}
                </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderReportPhase = () => (
    <div className="space-y-6 p-2">
      <h2 className="text-2xl font-semibold text-center text-blue-300">Deep Research Report</h2>
      <p className="text-gray-400"><span className="font-semibold text-gray-300">Original Topic:</span> {researchTopic} ({researchMode} mode)</p>
      
      <div className="p-4 bg-gray-800 rounded-lg prose prose-invert max-w-none prose-a:text-blue-400 hover:prose-a:text-blue-300 max-h-[60vh] overflow-y-auto">
        <h3 className="text-xl font-semibold text-gray-200 border-b border-gray-700 pb-2 mb-3">Generated Report</h3>
        {finalReport ? <MarkdownRenderer text={finalReport} /> : <p>No report generated.</p>}
      </div>

      <CollapsibleSection title="All Sources Gathered" isOpen={areSourcesVisible} setIsOpen={setAreSourcesVisible}>
        <ul className="list-disc list-inside space-y-1 text-sm max-h-60 overflow-y-auto p-1">
          {allSources && allSources.length > 0 ? allSources.map((source, index) => (
            <li key={index}>
              <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline">
                {source.title || source.uri}
              </a>
            </li>
          )) : <li className="text-gray-500">No sources were gathered during this research.</li>}
        </ul>
      </CollapsibleSection>

      <CollapsibleSection title="Research Strategy & Full Log" isOpen={isLogVisible} setIsOpen={setIsLogVisible}>
        <div className="text-sm space-y-3">
          <div>
            <h4 className="font-semibold text-gray-300 mb-1">Guiding Strategy:</h4>
            <p className="text-gray-400 whitespace-pre-wrap bg-gray-700 p-2 rounded-md">{researchStrategy || "N/A"}</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-300 mb-1">Full Research Log:</h4>
            <div className="max-h-80 overflow-y-auto bg-gray-700 p-2 rounded-md text-xs">
              {researchLog.map((log) => (
                <div key={log.id} className="mb-1 border-b border-gray-600 pb-1">
                    <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()} [{log.type.replace(/_/g, ' ').toUpperCase()}]: </span> 
                    <span className="whitespace-pre-wrap break-words">{log.content}</span>
                </div>))}
            </div>
          </div>
        </div>
      </CollapsibleSection>
      
      <ActionButton onClick={resetState} className="w-full flex items-center justify-center space-x-2">
        <ArrowPathIcon /> <span>Start New Research</span>
      </ActionButton>
    </div>
  );
  
  const CollapsibleSection: React.FC<{title: string, isOpen: boolean, setIsOpen: (isOpen: boolean) => void, children: React.ReactNode}> = ({ title, isOpen, setIsOpen, children }) => (
    <div className="bg-gray-800 rounded-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-3 text-left text-gray-200 hover:bg-gray-700 rounded-t-lg focus:outline-none"
        aria-expanded={isOpen}
        aria-controls={`collapsible-section-${title.replace(/\s+/g, '-')}`}
      >
        <h3 className="text-lg font-semibold">{title}</h3>
        {isOpen ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
      </button>
      {isOpen && (
        <div id={`collapsible-section-${title.replace(/\s+/g, '-')}`} className="p-3 border-t border-gray-700">
          {children}
        </div>
      )}
    </div>
  );

  const renderErrorState = () => (
    <div className="space-y-6 p-4 text-center">
      <h2 className="text-2xl font-semibold text-red-400">An Error Occurred</h2>
      <p className="text-red-300 bg-red-900 bg-opacity-50 p-3 rounded-md whitespace-pre-wrap">{error}</p>
      <ActionButton onClick={() => { 
        setError(null); 
        if (currentPhase === 'ERROR') { 
            if (finalReport) setCurrentPhase('REPORT');
            else if (researchStrategy) setCurrentPhase('STRATEGY_REVIEW');
            else if (clarificationQuestions.length > 0) setCurrentPhase('ITERATIVE_CLARIFICATION');
            else setCurrentPhase('INPUT');
        }
      }} 
      className="w-full"
      >
        Go Back / Acknowledge Error
      </ActionButton>
      <ActionButton onClick={resetState} className="w-full bg-gray-600 hover:bg-gray-500">
        Start New Research
      </ActionButton>
    </div>
  );

  const renderCurrentPhase = () => {
    if (!API_KEY_CONFIGURED) {
      return (
        <div className="p-4 text-center space-y-4">
          <h2 className="text-2xl font-semibold text-red-400">API Key Not Configured</h2>
          <p className="text-red-300 bg-red-900 bg-opacity-50 p-3 rounded-md">
            The Gemini API Key (process.env.API_KEY) is not configured. 
            Please ensure it is set in your environment for the application to function.
          </p>
          <p className="text-gray-400 text-sm">
            This application requires a valid API key to interact with Google Gemini services.
          </p>
        </div>
      );
    }

    if (error && currentPhase === 'ERROR') return renderErrorState(); 
    
    if (isLoading && currentPhase !== 'EXECUTING') { 
        return <div className="flex flex-col justify-center items-center h-64 space-y-3">
                    <LoadingSpinner message={loadingMessage} />
                </div>;
    }

    switch (currentPhase) {
      case 'INPUT': return renderInputPhase();
      case 'ITERATIVE_CLARIFICATION': return renderClarificationPhase();
      case 'STRATEGY_REVIEW': return renderStrategyReviewPhase();
      case 'EXECUTING': return renderExecutionPhase(); 
      case 'REPORT': return renderReportPhase();
      default: 
        addLogEntry('error', `Unknown application state. Current phase: ${currentPhase}. Resetting.`);
        resetState(); 
        return <p>Unknown application state. Resetting app...</p>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 selection:bg-blue-500 selection:text-white">
      <div className="w-full max-w-3xl bg-gray-800 shadow-2xl rounded-xl p-6 my-8">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            KResearch
          </h1>
          <p className="text-gray-400 mt-2">AI-powered iterative research and report generation</p>
        </header>
        
        {error && currentPhase !== 'ERROR' && ( 
           <div className="my-4 p-3 bg-red-900 bg-opacity-75 text-red-300 rounded-md text-sm flex justify-between items-center" role="alert">
             <span><strong>Notice:</strong> {error}</span>
             <button onClick={() => setError(null)} className="ml-2 px-2 py-0.5 bg-red-700 rounded hover:bg-red-600 text-xs">Dismiss</button>
           </div>
         )}

        <main>
          {renderCurrentPhase()}
        </main>
      </div>
       <footer className="text-center text-xs text-gray-500 mt-auto pb-4">
        Powered by Google Gemini. {API_KEY_CONFIGURED ? "Iterative research, verify critical information." : "API Key must be configured."}
      </footer>
    </div>
  );
};

export default App;
