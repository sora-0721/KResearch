import React, { useState, useEffect, useCallback, useRef } from 'react';
import { NotificationProvider } from './contextx/NotificationContext';
import GlassCard from './components/GlassCard';
import LiquidButton from './components/LiquidButton';
import ResearchProgress from './components/ResearchProgress';
import FinalReport from './components/FinalReport';
import ThemeSwitcher from './components/ThemeSwitcher';
import ClarificationChat from './components/ClarificationChat';
import ReportVisualizer from './components/ReportVisualizer';
import SettingsModal from './components/SettingsModal';
import { useAppLogic } from './hooks/useAppLogic';
import { ResearchMode } from './types';

const App: React.FC = () => {
    return (
        <NotificationProvider>
            <AppContent />
        </NotificationProvider>
    )
}

const AppContent: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const finalReportRef = useRef<HTMLDivElement>(null);
  
  const {
      query, setQuery, selectedFile, researchUpdates, finalData, mode, setMode, appState,
      clarificationHistory, clarificationLoading, startClarificationProcess, handleAnswerSubmit,
      handleStopResearch, handleFileChange, handleRemoveFile, handleReset, fileInputRef,
      isVisualizing, visualizedReportHtml, handleVisualizeReport, handleCloseVisualizer, handleSkipClarification,
      isRegenerating, handleRegenerateReport, handleReportRewrite,
      isSettingsOpen, setIsSettingsOpen,
      isVisualizerOpen, handleVisualizerFeedback,
      handleContinueResearch,
      handleGenerateReportFromPause,
  } = useAppLogic();

  const [isLogVisible, setIsLogVisible] = useState<boolean>(true);
  
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (appState === 'complete' && finalData && finalReportRef.current) {
        setTimeout(() => {
            finalReportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
  }, [appState, finalData]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      startClarificationProcess();
    }
  };

  const modes: { id: ResearchMode, name: string, description: string }[] = [
    { id: 'Balanced', name: 'Balanced', description: 'Optimal mix for quality and speed.' },
    { id: 'DeepDive', name: 'Deep Dive', description: 'Highest quality using the most powerful models.' },
    { id: 'Fast', name: 'Fast', description: 'Quick results with capable models.' },
    { id: 'UltraFast', name: 'Ultra Fast', description: 'Lightning-fast results for quick checks.' },
  ];

  const handleVisualizationRequest = (reportMarkdown: string) => {
    handleVisualizeReport(reportMarkdown, false);
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans text-gray-800 dark:text-gray-200 transition-colors duration-300">
      <div className="absolute top-4 right-4 z-10 flex items-center gap-4">
        <ThemeSwitcher isDarkMode={isDarkMode} onToggle={() => setIsDarkMode(!isDarkMode)} />
        <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors" title="Settings">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span className="sr-only">Settings</span>
        </button>
      </div>

      <GlassCard className="w-full max-w-4xl p-6 sm:p-8 flex flex-col gap-6">
        <header className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">KResearch</h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-400">Your AI-powered deep research assistant.</p>
        </header>

        {appState === 'idle' && (
          <div className="animate-fade-in space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {modes.map((m) => (
                <button key={m.id} onClick={() => setMode(m.id)} className={`p-3 rounded-2xl text-sm font-semibold transition-all duration-300 text-center border ${mode === m.id ? 'bg-glow-light/20 dark:bg-glow-dark/30 text-gray-900 dark:text-white shadow-md border-glow-light dark:border-glow-dark' : 'bg-glass-light/50 dark:bg-glass-dark/50 text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/10 border-border-light dark:border-border-dark'}`} title={m.description}>{m.name}</button>
              ))}
            </div>
            <div className="relative">
              <textarea value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown} placeholder="What is the future of AI in healthcare? (You can also attach a file)" className="w-full h-32 p-4 pr-12 rounded-2xl resize-none bg-white/40 dark:bg-black/20 border border-transparent focus:border-glow-light dark:focus:border-glow-dark focus:ring-2 focus:ring-glow-light/50 dark:focus:ring-glow-dark/50 focus:outline-none transition-all duration-300" disabled={appState !== 'idle'}/>
              <div className="absolute inset-y-0 right-0 flex items-end p-3">
                  <input type="file" id="file-upload" ref={fileInputRef} className="hidden" onChange={handleFileChange} disabled={appState !== 'idle'} />
                  <label htmlFor="file-upload" className="p-2 rounded-full cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors" title="Attach file"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg><span className="sr-only">Attach file</span></label>
              </div>
            </div>
            {selectedFile && <div className="flex items-center justify-between px-3 py-2 text-sm rounded-2xl bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/20 dark:border-blue-400/20"><span className="truncate text-gray-700 dark:text-gray-300" title={selectedFile.name}>{selectedFile.name}</span><button onClick={handleRemoveFile} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10" title="Remove file"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg><span className="sr-only">Remove file</span></button></div>}
            <LiquidButton onClick={startClarificationProcess} disabled={appState !== 'idle' || !query.trim()} className="w-full">Start Research</LiquidButton>
          </div>
        )}
        
        {appState === 'clarifying' && (<ClarificationChat history={clarificationHistory} onAnswerSubmit={handleAnswerSubmit} onSkip={handleSkipClarification} isLoading={clarificationLoading}/>)}
        
        {appState === 'researching' && (<LiquidButton onClick={handleStopResearch} className="w-full bg-red-500/30 hover:bg-red-500/40 border-red-500/50">Stop Research</LiquidButton>)}
        
        {appState === 'paused' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
              <LiquidButton onClick={handleContinueResearch} className="w-full">Continue Research</LiquidButton>
              <LiquidButton onClick={handleGenerateReportFromPause} className="w-full bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400 hover:shadow-none hover:-translate-y-0 active:translate-y-px">Generate Report</LiquidButton>
          </div>
        )}

        {(appState === 'researching' || appState === 'paused' || (appState === 'complete' && researchUpdates.length > 0)) && (
          <div className="animate-fade-in space-y-4">
            {appState === 'complete' && (<button onClick={() => setIsLogVisible(!isLogVisible)} className="flex items-center justify-between w-full text-left font-semibold text-lg p-2 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5"><span>{isLogVisible ? 'Hide' : 'Show'} Research Log</span><svg className={`w-5 h-5 transition-transform ${isLogVisible ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>)}
            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isLogVisible ? 'max-h-[30rem]' : 'max-h-0'}`}>
                <ResearchProgress updates={researchUpdates} isResearching={appState === 'researching'} />
            </div>
          </div>
        )}
        
        {appState === 'complete' && finalData && (
            <div ref={finalReportRef} className="animate-fade-in space-y-6 border-t border-border-light dark:border-border-dark pt-6 mt-6">
                 <FinalReport 
                    data={finalData} 
                    onVisualize={handleVisualizationRequest}
                    isVisualizing={isVisualizing}
                    onRegenerate={handleRegenerateReport}
                    isRegenerating={isRegenerating}
                    onRewrite={handleReportRewrite}
                 />
                 <LiquidButton onClick={handleReset} className="w-full mt-4">Start New Research</LiquidButton>
            </div>
        )}
      </GlassCard>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} currentMode={mode} />

      <ReportVisualizer 
        isOpen={isVisualizerOpen}
        isLoading={isVisualizing} 
        htmlContent={visualizedReportHtml} 
        onClose={handleCloseVisualizer} 
        onRegenerate={finalData?.report ? () => handleVisualizeReport(finalData.report, true) : undefined}
        onSubmitFeedback={handleVisualizerFeedback}
      />
      
      <footer className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>&copy; {new Date().getFullYear()} KResearch. Powered by Gemini.</p>
      </footer>
    </div>
  );
};

export default App;
