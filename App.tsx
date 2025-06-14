
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Source, AppPhase, ClarificationQuestion, UserAnswer, 
  ResearchLogEntry, ResearchLogEntryType, ExecutedStepOutcome, ResearchMode 
} from './types';
import { 
  getInitialTopicContext, generateInitialClarificationQuestions, 
  evaluateAnswersAndGenerateFollowUps, generateResearchStrategy, 
  decideNextResearchAction, executeResearchStep, summarizeText, synthesizeReport 
} from './services/geminiService';
import LoadingSpinner from './components/LoadingSpinner';
import { 
  PencilIcon, PlayIcon, ArrowPathIcon, ChevronDownIcon, ChevronUpIcon, SendIcon, StopIcon,
  ClipboardDocumentIcon, ArrowDownTrayIcon
} from './components/icons';

// Make global libraries available
declare var marked: any;
declare var mermaid: any;
declare var katex: any;
declare var renderMathInElement: any; // from KaTeX auto-render extension

// Helper to render markdown-like text with clickable links, KaTeX, and Mermaid
const MarkdownRenderer: React.FC<{ text: string }> = React.memo(({ text }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current && text) {
      // 1. Convert Markdown to HTML using Marked
      if (typeof marked !== 'undefined') {
        contentRef.current.innerHTML = marked.parse(text);
      } else {
        // Fallback: simple text rendering
        contentRef.current.innerText = text;
      }

      // 2. Transform <pre><code class="language-mermaid">...</code></pre> to <div class="mermaid">...</div>
      const preMermaidBlocks = contentRef.current.querySelectorAll('pre code.language-mermaid');
      preMermaidBlocks.forEach(codeBlock => {
        const preParent = codeBlock.parentElement as HTMLPreElement;
        if (preParent) {
          const mermaidDiv = document.createElement('div');
          mermaidDiv.className = 'mermaid';
          const codeContent = codeBlock.textContent || '';
          mermaidDiv.textContent = codeContent;
          mermaidDiv.setAttribute('data-mermaid-code', codeContent);
          preParent.parentNode?.replaceChild(mermaidDiv, preParent);
        }
      });
      
      // 3. Render KaTeX math expressions
      if (typeof katex !== 'undefined' && typeof renderMathInElement === 'function') {
        try {
          renderMathInElement(contentRef.current, {
            delimiters: [
              { left: "$$", right: "$$", display: true },
              { left: "$", right: "$", display: false },
              { left: "\\(", right: "\\)", display: false },
              { left: "\\[", right: "\\]", display: true }
            ],
            throwOnError: false
          });
        } catch(e) {
          console.error("KaTeX rendering error:", e);
        }
      }

      // 4. Render Mermaid diagrams
      if (typeof mermaid !== 'undefined') {
        const mermaidElements = Array.from(contentRef.current.querySelectorAll('div.mermaid'));
        if (mermaidElements.length > 0) {
          mermaidElements.forEach((el, i) => {
            const code = el.getAttribute('data-mermaid-code') || el.textContent || '';
            el.innerHTML = ''; 
            el.textContent = code; 
            el.removeAttribute('data-processed'); 
            el.id = `mermaid-diag-${Date.now()}-${i}`; 
          });
          try {
            mermaid.run({ nodes: mermaidElements });
          } catch (e) {
            console.error("Mermaid rendering error in MarkdownRenderer:", e);
            mermaidElements.forEach(div => div.innerHTML = `<p style="color:red;">Error rendering Mermaid diagram: ${e instanceof Error ? e.message : String(e)}</p>`);
          }
        }
      }
    }
  }, [text]); 

  return <div ref={contentRef} className="whitespace-pre-wrap break-words leading-relaxed" />;
});


const DEFAULT_MAX_ITERATIONS = 25; 
const API_KEY_CONFIGURED = !!process.env.API_KEY;

const formatDuration = (ms: number | null): string => {
  if (ms === null || ms < 0) return 'N/A';

  let seconds = Math.floor(ms / 1000);
  let minutes = Math.floor(seconds / 60);
  let hours = Math.floor(minutes / 60);
  let days = Math.floor(hours / 24);

  seconds %= 60;
  minutes %= 60;
  hours %= 24;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
  if (parts.length === 0 || (seconds > 0 && parts.length < 2 && days === 0 && hours === 0)) {
     if (seconds > 0 || (days === 0 && hours === 0 && minutes === 0) ) { 
        parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
     }
  }
  
  if (parts.length === 0) return ms > 0 ? "Less than a second" : "0 seconds";
  return parts.join(' ');
};


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
  
  const [isLogVisible, setIsLogVisible] = useState<boolean>(true);
  const [areSourcesVisible, setAreSourcesVisible] = useState<boolean>(true);

  const [researchStartTime, setResearchStartTime] = useState<number | null>(null);
  const [researchEndTime, setResearchEndTime] = useState<number | null>(null);

  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  const researchCancelledRef = useRef<boolean>(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const reportContentRef = useRef<HTMLDivElement>(null); // Still used by MarkdownRenderer for report display
  const clarificationRoundRef = useRef<number>(0);

  // Initialize Mermaid once
  useEffect(() => {
    if (typeof mermaid !== 'undefined') {
      try {
        mermaid.initialize({ 
          startOnLoad: false, 
          theme: 'neutral',
          mermaid: {
            themeVariables: {}
          }
        });
      } catch (e) {
        console.error("Mermaid initialization error:", e);
      }
    }
  }, []);

  const addLogEntry = useCallback((type: ResearchLogEntryType, content: string, sources?: Source[]) => {
    setResearchLog(prev => [...prev, { id: crypto.randomUUID(), timestamp: Date.now(), type, content, sources }]);
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [researchLog]);

  const resetState = useCallback(() => {
    setResearchTopic('');
    setResearchMode('normal');
    setMaxIterations(DEFAULT_MAX_ITERATIONS);
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
    setResearchStartTime(null);
    setResearchEndTime(null);
    setCopyStatus('idle');
  }, []);

  const handleTopicSubmit = useCallback(async () => {
    if (!researchTopic.trim()) {
      setError("Please enter a research topic.");
      return;
    }
    if (maxIterations < 1 || maxIterations > 500) { 
      setError("Please enter a maximum iteration count between 1 and 500.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setResearchLog([]); 
    setAccumulatedAnswers([]); 
    setUserAnswers({}); 
    setExecutedSteps([]);
    setAllSources([]);
    setFinalReport('');
    setResearchStartTime(null);
    setResearchEndTime(null);
    clarificationRoundRef.current = 1;
    
    addLogEntry('system', `Topic: "${researchTopic}". Mode: ${researchMode}. Max Iterations: ${maxIterations}.`);
    
    try {
      setLoadingMessage("Performing preliminary search for context...");
      addLogEntry('system', `Fetching initial context for topic: "${researchTopic}"...`);
      const initialContext = await getInitialTopicContext(researchTopic, researchMode);
      addLogEntry('summary', `Initial context summary: ${initialContext.substring(0, 200)}${initialContext.length > 200 ? '...' : ''}`);

      setLoadingMessage("Generating initial clarification questions with context...");
      addLogEntry('system', `Generating initial clarification questions (Round ${clarificationRoundRef.current})...`);
      const questions = await generateInitialClarificationQuestions(researchTopic, researchMode, initialContext);
      
      setClarificationQuestions(questions.map((q, i) => ({ id: i, question: q })));
      setCurrentPhase('ITERATIVE_CLARIFICATION');
      addLogEntry('clarification_q', `Generated ${questions.length} initial questions:\n${questions.map((q,i) => `${i+1}. ${q}`).join('\n')}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed during initial topic processing.";
      setError(msg);
      addLogEntry('error', msg);
      setCurrentPhase('ERROR');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [researchTopic, researchMode, maxIterations, addLogEntry]);

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
    setResearchStartTime(Date.now());
    setResearchEndTime(null);
    setCurrentPhase('EXECUTING');
    addLogEntry('system', `Starting iterative research (Mode: ${researchMode}, Max Iterations: ${maxIterations}). Strategy: "${researchStrategy.substring(0,100)}..."`);
  }, [researchStrategy, addLogEntry, researchMode, maxIterations]);
  
  const handleCancelResearch = () => {
    researchCancelledRef.current = true;
    addLogEntry('system', "Research cancellation requested by user.");
    setIsLoading(false); 
    setLoadingMessage("Cancelling research...");
  };

  useEffect(() => {
    if (currentPhase !== 'EXECUTING' || researchCancelledRef.current || isLoading) {
      if (researchCancelledRef.current && researchStartTime && !researchEndTime && currentPhase !== 'EXECUTING') {
          setResearchEndTime(Date.now());
      }
      return;
    }

    const runResearchLoop = async () => {
      setIsLoading(true);
      
      let loopCurrentIter = 0; 
      let stopResearch = false;
      const iterationDisplaySuffix = `/${maxIterations}`; 
      
      const localAccumulatedSteps: ExecutedStepOutcome[] = [...executedSteps];

      while(loopCurrentIter < maxIterations && !stopResearch && !researchCancelledRef.current) {
        const currentIterationNumberForDisplay = localAccumulatedSteps.length + 1;
        setLoadingMessage(`Research Iteration ${currentIterationNumberForDisplay}${iterationDisplaySuffix}... Deciding next action.`);
        addLogEntry('system', `Iteration ${currentIterationNumberForDisplay}: Deciding next research action...`);
        
        try {
          const decision = await decideNextResearchAction(
            researchTopic, 
            researchStrategy, 
            localAccumulatedSteps, 
            currentIterationNumberForDisplay, 
            maxIterations, 
            researchMode
          );

          addLogEntry('thought', `AI decided action: "${decision.action}". Reason: "${decision.reason}"`);
          
          if (researchCancelledRef.current) break;

          setLoadingMessage(`Iteration ${currentIterationNumberForDisplay}${iterationDisplaySuffix}: Executing "${decision.action.substring(0, 50)}..."`);
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

          setLoadingMessage(`Iteration ${currentIterationNumberForDisplay}${iterationDisplaySuffix}: Summarizing findings...`);
          const summary = await summarizeText(stepResult.text, researchMode, researchTopic);
          addLogEntry('summary', `Summary for step ${currentIterationNumberForDisplay}: ${summary}`);

          const currentOutcome: ExecutedStepOutcome = {
            action: decision.action,
            reason: decision.reason,
            rawResultText: stepResult.text,
            summary: summary,
            sources: stepResult.sources
          };
          
          localAccumulatedSteps.push(currentOutcome); 
          setExecutedSteps(prev => [...prev, currentOutcome]); 


          stopResearch = decision.shouldStop;
          if (decision.shouldStop) {
            addLogEntry('system', "AI determined sufficient information gathered or criteria met to stop iterative research.");
          }
          if ((loopCurrentIter + 1) >= maxIterations && !stopResearch) { 
             addLogEntry('system', `Reached max iterations (${maxIterations}). Stopping research.`);
             stopResearch = true;
          }

        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : "An unknown error occurred during research iteration.";
          setError(`Error in iteration ${localAccumulatedSteps.length + 1}: ${errorMsg}`);
          addLogEntry('error', `Error in iteration ${localAccumulatedSteps.length + 1}: ${errorMsg}`);
          setCurrentPhase('ERROR'); 
          setResearchEndTime(Date.now());
          setIsLoading(false); 
          return; 
        }
        loopCurrentIter++;
        if (researchCancelledRef.current) {
            addLogEntry('system', "Research process was cancelled by the user during iterations.");
            break; 
        }
      } 

      if (localAccumulatedSteps.length > 0) {
        if (researchCancelledRef.current) {
            addLogEntry('system', `Research cancelled. Synthesizing report from ${localAccumulatedSteps.length} completed steps...`);
            setLoadingMessage("Synthesizing report from partial results...");
        } else {
            addLogEntry('system', `Iterative research completed after ${localAccumulatedSteps.length} steps. Synthesizing final report...`);
            setLoadingMessage("Synthesizing final report...");
        }
        try {
          const report = await synthesizeReport(researchTopic, researchStrategy, localAccumulatedSteps, researchMode);
          setFinalReport(report);
          setCurrentPhase('REPORT');
          addLogEntry('system', researchCancelledRef.current ? "Partial report generated successfully." : "Final report generated successfully.");
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : "An unknown error occurred during report synthesis.";
          setError(`Failed to synthesize report: ${errorMsg}`);
          addLogEntry('error', `Report synthesis failed: ${errorMsg}`);
          setCurrentPhase('ERROR');
        }
      } else { 
          if (researchCancelledRef.current) {
              addLogEntry('system', "Research cancelled before any steps were completed in this run. No report to generate.");
              setLoadingMessage("Research cancelled.");
          } else {
              addLogEntry('system', "No research steps were successfully executed or yielded results in this run. No report to generate.");
          }
          setCurrentPhase('STRATEGY_REVIEW'); 
      }
      
      setResearchEndTime(Date.now());
      setIsLoading(false);
      setLoadingMessage('');
    };

    runResearchLoop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPhase, researchTopic, researchStrategy, researchMode, maxIterations, addLogEntry, /* executedSteps removed due to causing loop with localAccumulatedSteps */ isLoading]); 

  const ActionButton: React.FC<{ onClick: () => void; children: React.ReactNode; className?: string; disabled?: boolean; title?: string }> = ({ onClick, children, className, disabled, title }) => (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      title={title}
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
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-300">Research Mode:</label>
          <div className="flex space-x-4 mt-1">
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
                <span className="text-gray-300 capitalize">{mode} Mode</span>
              </label>
            ))}
          </div>
          {researchMode === 'deeper' && <p className="text-xs text-gray-500 mt-1">Deeper mode uses the recommended model for higher quality analysis.</p>}
        </div>
        
        <div>
          <label htmlFor="max-iterations" className="block text-sm font-medium text-gray-300">Maximum Research Iterations:</label>
          <input
            type="number"
            id="max-iterations"
            value={maxIterations}
            onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) {
                    if (val < 1) setMaxIterations(1);
                    else if (val > 500) setMaxIterations(500);
                    else setMaxIterations(val);
                } else if (e.target.value === '') {
                     setMaxIterations(0); 
                }
            }}
            onBlur={(e) => { 
                if (maxIterations === 0 || isNaN(maxIterations)) setMaxIterations(DEFAULT_MAX_ITERATIONS);
                else if (maxIterations < 1) setMaxIterations(1);
                else if (maxIterations > 500) setMaxIterations(500);
            }}
            min="1"
            max="500" 
            className="mt-1 w-24 p-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-600"
            disabled={isLoading}
            aria-label="Maximum Research Iterations"
          />
           <p className="text-xs text-gray-500 mt-1">Defines how many research steps the AI can take (1-500).</p>
        </div>
      </div>
      <ActionButton 
        onClick={handleTopicSubmit} 
        className="w-full flex items-center justify-center space-x-2"
        disabled={isLoading || !researchTopic.trim() || maxIterations < 1 || maxIterations > 500}
      >
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
        <PlayIcon /> <span>Start Deep Research ({researchMode} mode, {maxIterations} iter.)</span>
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
        <h3 className="text-lg font-semibold text-gray-300 mb-2 sticky top-0 bg-gray-800 py-1 z-10">Live Research Log (Mode: {researchMode}, Max Iterations: {maxIterations}):</h3>
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

  const handleCopyMarkdown = useCallback(() => {
    if (!finalReport) return;
    navigator.clipboard.writeText(finalReport).then(() => {
        setCopyStatus('copied');
        setTimeout(() => setCopyStatus('idle'), 2000);
    }).catch(err => {
        console.error('Failed to copy report:', err);
        setError("Failed to copy report to clipboard.");
    });
  }, [finalReport]);

  const handleDownloadTxt = useCallback(() => {
    if (!finalReport) return;
    const blob = new Blob([finalReport], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `kresearch-report-${(researchTopic || 'untitled').substring(0,30).replace(/\s+/g, '_').replace(/[^\w-]/g, '')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }, [finalReport, researchTopic]);

  const renderReportPhase = () => (
    <div className="space-y-6 p-2 w-full max-w-4xl">
      <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
        <h2 className="text-3xl font-bold text-blue-300 text-center sm:text-left">Final Research Report</h2>
        <ActionButton onClick={resetState} className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 focus:ring-green-500">
            <ArrowPathIcon className="w-5 h-5"/> <span>Start New Research</span>
        </ActionButton>
      </div>
      
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
        <h3 className="text-xl font-semibold text-gray-300 mb-1">Topic:</h3>
        <p className="text-blue-300 text-lg mb-4">{researchTopic}</p>
        
        <div className="flex space-x-2 mb-4">
            <ActionButton onClick={handleCopyMarkdown} className="text-sm px-3 py-1.5 flex items-center space-x-1.5" title="Copy report as Markdown">
                <ClipboardDocumentIcon />
                <span>{copyStatus === 'copied' ? 'Copied!' : 'Copy Markdown'}</span>
            </ActionButton>
            <ActionButton onClick={handleDownloadTxt} className="text-sm px-3 py-1.5 bg-teal-600 hover:bg-teal-700 focus:ring-teal-500 flex items-center space-x-1.5" title="Download report as .txt">
                <ArrowDownTrayIcon />
                <span>Download .txt</span>
            </ActionButton>
        </div>
        
        <p className="text-sm text-gray-400 mb-1">Research Mode: <span className="font-semibold text-gray-300 capitalize">{researchMode}</span></p>
        <p className="text-sm text-gray-400 mb-1">Max Iterations Setting: <span className="font-semibold text-gray-300">{maxIterations}</span></p>
        <p className="text-sm text-gray-400 mb-1">Actual Iterations: <span className="font-semibold text-gray-300">{executedSteps.length}</span></p>
        {researchStartTime && researchEndTime && (
          <p className="text-sm text-gray-400 mb-4">
            Research Duration: <span className="font-semibold text-gray-300">{formatDuration(researchEndTime - researchStartTime)}</span>
          </p>
        )}

        <div 
          ref={reportContentRef} 
          id="reportContentArea"
          className="prose prose-sm sm:prose-base prose-invert max-w-none bg-gray-700 p-4 rounded-md max-h-[60vh] overflow-y-auto"
        >
          <MarkdownRenderer text={finalReport} />
        </div>
      </div>

      <div>
        <button onClick={() => setAreSourcesVisible(!areSourcesVisible)} className="flex items-center justify-between w-full text-left py-2 px-3 bg-gray-700 hover:bg-gray-600 rounded-md text-lg font-semibold text-gray-300">
            All Sources ({allSources.length})
            {areSourcesVisible ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </button>
        {areSourcesVisible && (
            <div className="mt-2 p-3 bg-gray-800 rounded-lg max-h-60 overflow-y-auto text-sm space-y-1">
            {allSources.length > 0 ? allSources.map(s => (
                <a key={s.uri} href={s.uri} target="_blank" rel="noopener noreferrer" className="block p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-blue-400 hover:underline truncate" title={s.uri}>
                {s.title || s.uri}
                </a>
            )) : <p className="text-gray-400">No sources were cited during this research.</p>}
            </div>
        )}
      </div>
    </div>
  );

  const renderErrorPhase = () => (
    <div className="space-y-6 p-4 text-center">
      <h2 className="text-2xl font-semibold text-red-400">An Error Occurred</h2>
      <p className="text-gray-300 bg-red-900 bg-opacity-50 p-3 rounded-md whitespace-pre-wrap">{error}</p>
      <ActionButton onClick={resetState} className="w-full sm:w-auto flex items-center justify-center space-x-2">
        <ArrowPathIcon className="w-5 h-5"/> <span>Start Over</span>
      </ActionButton>
    </div>
  );

  const renderApiKeyWarning = () => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-red-800 p-8 rounded-lg shadow-2xl text-white max-w-md text-center">
            <h2 className="text-2xl font-bold mb-4">API Key Missing</h2>
            <p className="mb-3">The Gemini API key (process.env.API_KEY) is not configured.</p>
            <p className="mb-6">This application requires a valid API key to function. Please ensure it is set in your environment variables.</p>
            <p className="text-sm text-red-300">The application will not work correctly without it.</p>
        </div>
    </div>
  );

  return (
    <div className="bg-gray-900 text-gray-100 min-h-screen flex flex-col items-center p-4 font-sans">
      {!API_KEY_CONFIGURED && renderApiKeyWarning()}
      <div className="w-full max-w-2xl mx-auto space-y-8">
        <header className="text-center py-2">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
            KResearch AI Agent
          </h1>
          <p className="text-gray-400 mt-1">Your Iterative Research Assistant</p>
        </header>

        <main className="bg-gray-800 shadow-2xl rounded-xl p-3 sm:p-5">
          {isLoading && currentPhase !== 'EXECUTING' && <div className="mb-4"><LoadingSpinner message={loadingMessage} /></div>}
          {error && currentPhase !== 'ERROR' && (
            <div className="mb-4 p-3 bg-red-700 bg-opacity-30 border border-red-600 text-red-300 rounded-md">
              Error: {error}
            </div>
          )}
          
          {currentPhase === 'INPUT' && renderInputPhase()}
          {currentPhase === 'ITERATIVE_CLARIFICATION' && renderClarificationPhase()}
          {currentPhase === 'STRATEGY_REVIEW' && renderStrategyReviewPhase()}
          {currentPhase === 'EXECUTING' && renderExecutionPhase()}
          {currentPhase === 'REPORT' && renderReportPhase()}
          {currentPhase === 'ERROR' && renderErrorPhase()}
        </main>

        {researchLog.length > 0 && currentPhase !== 'EXECUTING' && currentPhase !== 'INPUT' && (
          <section className="bg-gray-800 shadow-xl rounded-lg p-3 sm:p-4 mt-6 w-full">
            <button onClick={() => setIsLogVisible(!isLogVisible)} className="flex items-center justify-between w-full text-left py-2 px-1 text-lg font-semibold text-gray-300 hover:text-blue-300">
                Research Log Details ({researchLog.length} entries)
                {isLogVisible ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </button>
            {isLogVisible && (
              <div className="mt-2 p-1 bg-gray-900 bg-opacity-50 rounded max-h-96 overflow-y-auto text-xs space-y-1.5" ref={logEndRef}>
                {researchLog.map((log) => (
                  <div key={log.id} className={`p-1 rounded border-l-2 ${
                    log.type === 'error' ? 'border-red-400' : 
                    log.type === 'thought' ? 'border-purple-400' : 
                    log.type === 'action' ? 'border-yellow-400' :
                    log.type === 'summary' ? 'border-green-400' :
                    log.type === 'sources' ? 'border-teal-400' :
                    log.type === 'clarification_q' ? 'border-cyan-400' :
                    log.type === 'clarification_a' ? 'border-indigo-400' :
                    'border-gray-500'}`}>
                    <span className="text-gray-500 mr-1.5">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className={`font-medium ${
                        log.type === 'error' ? 'text-red-300' : 
                        log.type === 'thought' ? 'text-purple-300' :
                        log.type === 'action' ? 'text-yellow-300' :
                        log.type === 'summary' ? 'text-green-300' :
                        log.type === 'sources' ? 'text-teal-300' :
                        log.type === 'clarification_q' ? 'text-cyan-300' :
                        log.type === 'clarification_a' ? 'text-indigo-300' :
                        'text-gray-400'}`}>
                        {log.type.replace(/_/g, ' ').toUpperCase()}:
                    </span>
                    <span className="ml-1 text-gray-300 whitespace-pre-wrap break-words">{log.content}</span>
                     {log.type === 'sources' && log.sources && log.sources.length > 0 && (
                        <div className="mt-0.5 pl-3">
                            {log.sources.map(s => (
                                <a key={s.uri} href={s.uri} target="_blank" rel="noopener noreferrer" className="block text-blue-400 hover:underline truncate text-[0.9em]">
                                - {s.title || s.uri}
                                </a>
                            ))}
                        </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
        <footer className="text-center py-4 text-xs text-gray-500">
          KResearch AI Agent v1.0
        </footer>
      </div>
    </div>
  );
};

export default App;
