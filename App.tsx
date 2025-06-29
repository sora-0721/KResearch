
import React, { useState, useEffect, useCallback, useRef } from 'react';
import GlassCard from './components/GlassCard';
import LiquidButton from './components/LiquidButton';
import ResearchProgress from './components/ResearchProgress';
import FinalReport from './components/FinalReport';
import ThemeSwitcher from './components/ThemeSwitcher';
import ClarificationChat from './components/ClarificationChat';
import { runIterativeDeepResearch, clarifyQuery } from './services/geminiService';
import { ResearchUpdate, FinalResearchData, ResearchMode } from './types';

type AppState = 'idle' | 'clarifying' | 'researching' | 'complete';
export interface ClarificationTurn {
    role: 'user' | 'model';
    content: string;
}

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [query, setQuery] = useState<string>('');
  const [researchUpdates, setResearchUpdates] = useState<ResearchUpdate[]>([]);
  const [finalData, setFinalData] = useState<FinalResearchData | null>(null);
  const [isLogVisible, setIsLogVisible] = useState<boolean>(true);
  const [mode, setMode] = useState<ResearchMode>('Balanced');
  const abortControllerRef = useRef<AbortController | null>(null);
  const finalReportRef = useRef<HTMLDivElement>(null);

  const [appState, setAppState] = useState<AppState>('idle');
  const [clarificationHistory, setClarificationHistory] = useState<ClarificationTurn[]>([]);
  const [clarificationLoading, setClarificationLoading] = useState<boolean>(false);
  const [clarifiedContext, setClarifiedContext] = useState<string>('');

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.style.background = 'linear-gradient(135deg, #1f2128 0%, #121212 100%)';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.background = 'linear-gradient(135deg, #e6e9f0 0%, #eef1f5 100%)';
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (appState === 'complete' && finalData && finalReportRef.current) {
        setTimeout(() => {
            finalReportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
  }, [appState, finalData]);

  const handleToggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };
  
  const handleClarificationResponse = async (history: ClarificationTurn[]) => {
      setClarificationLoading(true);
      try {
          const response = await clarifyQuery(history, mode);
          if (response.type === 'question') {
              setClarificationHistory(prev => [...prev, { role: 'model', content: response.content }]);
          } else if (response.type === 'summary') {
              setClarifiedContext(response.content);
              setAppState('researching');
          }
      } catch (error) {
          console.error("Clarification step failed:", error);
          setClarifiedContext('Clarification process failed. Proceeding with original query.');
          setAppState('researching');
      } finally {
          setClarificationLoading(false);
      }
  };

  const startClarificationProcess = () => {
      if (!query.trim() || appState !== 'idle') return;
      setAppState('clarifying');
      const initialHistory: ClarificationTurn[] = [{ role: 'user', content: query }];
      setClarificationHistory(initialHistory);
      handleClarificationResponse(initialHistory);
  };

  const handleAnswerSubmit = (answer: string) => {
      const newHistory: ClarificationTurn[] = [...clarificationHistory, { role: 'user', content: answer }];
      setClarificationHistory(newHistory);
      handleClarificationResponse(newHistory);
  };

  const startResearch = useCallback(async (context: string) => {
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const startTime = Date.now();
    setFinalData(null);
    setResearchUpdates([]);
    setIsLogVisible(true);
    
    try {
      const result = await runIterativeDeepResearch(query, (update) => {
        setResearchUpdates(prev => [...prev, update]);
      }, signal, mode, context);
      
      const endTime = Date.now();
      setFinalData({
        ...result,
        researchTimeMs: endTime - startTime,
      });

    } catch (error: any) {
        if (error.name === 'AbortError') {
             console.log("Research was cancelled by the user.");
             const endTime = Date.now();
             setFinalData({
                report: "The research process was cancelled.",
                citations: [],
                researchTimeMs: endTime - startTime,
            });
        } else {
            console.error("Research failed:", error);
            const endTime = Date.now();
            setFinalData({
                report: "An error occurred during the research process. Please check the console for details and try again.",
                citations: [],
                researchTimeMs: endTime - startTime,
            });
        }
    } finally {
      setAppState('complete');
    }
  }, [query, mode]);
  
  useEffect(() => {
    if (appState === 'researching' && clarifiedContext) {
        startResearch(clarifiedContext);
    }
  }, [appState, clarifiedContext, startResearch]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      startClarificationProcess();
    }
  };
  
  const handleStopResearch = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleReset = () => {
      abortControllerRef.current?.abort();
      setAppState('idle');
      setFinalData(null);
      setResearchUpdates([]);
      setQuery('');
      setMode('Balanced');
      setClarificationHistory([]);
      setClarifiedContext('');
      setClarificationLoading(false);
  }

  const modes: { id: ResearchMode, name: string, description: string }[] = [
    { id: 'Balanced', name: 'Balanced', description: 'Optimal mix for quality and speed.' },
    { id: 'DeepDive', name: 'Deep Dive', description: 'Highest quality using the most powerful models.' },
    { id: 'Fast', name: 'Fast', description: 'Quick results with capable models.' },
    { id: 'UltraFast', name: 'Ultra Fast', description: 'Lightning-fast results for quick checks.' },
  ];

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans text-gray-800 dark:text-gray-200 transition-colors duration-300">
      <div className="absolute top-4 right-4 z-10">
        <ThemeSwitcher isDarkMode={isDarkMode} onToggle={handleToggleTheme} />
      </div>

      <GlassCard className="w-full max-w-4xl p-6 sm:p-8 flex flex-col gap-6">
        <header className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">KResearch</h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-400">Your AI-powered deep research assistant.</p>
        </header>

        {appState === 'idle' && (
          <div className="animate-fade-in space-y-4">
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">Select Research Mode</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {modes.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`
                      p-3 rounded-lg text-sm font-semibold transition-all duration-300 text-center
                      border 
                      ${mode === m.id
                        ? 'bg-glow-light/20 dark:bg-glow-dark/30 text-gray-900 dark:text-white shadow-md border-glow-light dark:border-glow-dark'
                        : 'bg-glass-light/50 dark:bg-glass-dark/50 text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/10 border-border-light dark:border-border-dark'}
                    `}
                    title={m.description}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What is the future of AI in healthcare?"
              className="
                w-full h-32 p-4 rounded-xl resize-none
                bg-black/10 dark:bg-black/20 
                border border-transparent focus:border-glow-light dark:focus:border-glow-dark
                focus:ring-2 focus:ring-glow-light/50 dark:focus:ring-glow-dark/50
                focus:outline-none
                transition-all duration-300
              "
              disabled={appState !== 'idle'}
            />
            <LiquidButton onClick={startClarificationProcess} disabled={appState !== 'idle' || !query.trim()} className="w-full">
              Start Research
            </LiquidButton>
          </div>
        )}
        
        {appState === 'clarifying' && (
          <ClarificationChat
            history={clarificationHistory}
            onAnswerSubmit={handleAnswerSubmit}
            isLoading={clarificationLoading}
          />
        )}
        
        {appState === 'researching' && (
             <LiquidButton onClick={handleStopResearch} className="w-full bg-red-500/30 hover:bg-red-500/40 border-red-500/50">
                Stop Research
            </LiquidButton>
        )}

        {(appState === 'researching' || (appState === 'complete' && researchUpdates.length > 0)) && (
          <div className="animate-fade-in space-y-4">
            {appState === 'complete' && (
                 <button onClick={() => setIsLogVisible(!isLogVisible)} className="flex items-center justify-between w-full text-left font-semibold text-lg p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5">
                     <span>{isLogVisible ? 'Hide' : 'Show'} Research Log</span>
                     <svg className={`w-5 h-5 transition-transform ${isLogVisible ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                 </button>
            )}
             {isLogVisible && <ResearchProgress updates={researchUpdates} isResearching={appState === 'researching'} />}
          </div>
        )}
        
        {appState === 'complete' && finalData && (
            <div ref={finalReportRef} className="animate-fade-in space-y-6 border-t border-border-light dark:border-border-dark pt-6 mt-6">
                 <FinalReport data={finalData} />
                 <LiquidButton onClick={handleReset} className="w-full mt-4">
                    Start New Research
                </LiquidButton>
            </div>
        )}

      </GlassCard>
      
      <footer className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>&copy; {new Date().getFullYear()} KResearch. Powered by Gemini.</p>
      </footer>
    </div>
  );
};

export default App;
