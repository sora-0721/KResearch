
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { NotificationProvider } from './contextx/NotificationContext';
import { LanguageProvider, useLanguage } from './contextx/LanguageContext';
import GlassCard from './components/GlassCard';
import LiquidButton from './components/LiquidButton';
import ResearchProgress from './components/ResearchProgress';
import FinalReport from './components/FinalReport';
import ThemeSwitcher from './components/ThemeSwitcher';
import LanguageSwitcher from './components/LanguageSwitcher';
import ClarificationChat from './components/ClarificationChat';
import ReportVisualizer from './components/ReportVisualizer';
import SettingsModal from './components/SettingsModal';
import HistoryPanel from './components/HistoryPanel';
import { useAppLogic } from './hooks/useAppLogic';
import { ResearchMode } from './types';

const App: React.FC = () => {
    return (
        <NotificationProvider>
            <LanguageProvider>
                <AppContent />
            </LanguageProvider>
        </NotificationProvider>
    )
}

const AppContent: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const finalReportRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();
  
  const {
      query, setQuery, guidedQuery, setGuidedQuery, selectedFile, researchUpdates, finalData, mode, setMode, appState,
      clarificationHistory, clarificationLoading, startClarificationProcess, handleAnswerSubmit,
      handleStopResearch, handleFileChange, handleRemoveFile, handleReset, fileInputRef,
      isVisualizing, visualizedReportHtml, handleVisualizeReport, handleCloseVisualizer, handleSkipClarification,
      isRegenerating, isRewriting, handleRegenerateReport, handleReportRewrite,
      isSettingsOpen, setIsSettingsOpen,
      isVisualizerOpen, handleVisualizerFeedback,
      handleContinueResearch,
      handleGenerateReportFromPause,
      history, loadFromHistory, deleteHistoryItem, clearHistory, handleUpdateHistoryTitle,
      handleNavigateVersion,
      handleTranslateReport, translationLoading
  } = useAppLogic();

  const [isLogVisible, setIsLogVisible] = useState<boolean>(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isGuidedSearchOpen, setIsGuidedSearchOpen] = useState(false);
  
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Also set the lang attribute on the html element
    document.documentElement.lang = t('langCode', { code: 'en' }); // t function can provide the language code
  }, [isDarkMode, t]);

  useEffect(() => {
    if (appState === 'complete' && finalData && finalReportRef.current) {
        setTimeout(() => {
            finalReportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
  }, [appState, finalData]);

  const handleStart = () => {
    startClarificationProcess(guidedQuery);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleStart();
    }
  };
  
  const handleLoadFromHistory = (id: string) => {
    loadFromHistory(id);
    setIsHistoryOpen(false);
  }

  const modes: { id: ResearchMode, name: string, description: string }[] = [
    { id: 'Balanced', name: t('modeBalanced'), description: t('modeBalancedDesc') },
    { id: 'DeepDive', name: t('modeDeepDive'), description: t('modeDeepDiveDesc') },
    { id: 'Fast', name: t('modeFast'), description: t('modeFastDesc') },
    { id: 'UltraFast', name: t('modeUltraFast'), description: t('modeUltraFastDesc') },
  ];

  const handleVisualizationRequest = (reportMarkdown: string) => {
    const currentReport = finalData?.reports[finalData.activeReportIndex]?.content;
    handleVisualizeReport(currentReport ?? '', false);
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-4 sm:p-6 lg:p-8 font-sans text-gray-800 dark:text-gray-200 transition-colors duration-300">
      
      <div className="w-full max-w-4xl flex flex-col gap-4">
        {/* Toolbar: No longer absolute, part of the layout flow */}
        <div className="flex justify-end items-center gap-2 sm:gap-4">
          <LanguageSwitcher />
          <button onClick={() => setIsHistoryOpen(true)} className="p-2 rounded-full cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors" title={t('history')}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="sr-only">{t('history')}</span>
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors" title={t('settings')}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <span className="sr-only">{t('settings')}</span>
          </button>
          <a href="https://github.com/KuekHaoYang/KResearch" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors" title={t('github')}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-6 w-6 text-gray-600 dark:text-gray-400">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              <span className="sr-only">{t('github')}</span>
          </a>
          <ThemeSwitcher isDarkMode={isDarkMode} onToggle={() => setIsDarkMode(!isDarkMode)} />
        </div>

        <GlassCard className="p-6 sm:p-8 flex flex-col gap-6">
          <header className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">KResearch</h1>
            <p className="mt-2 text-base text-gray-600 dark:text-gray-400">{t('appTagline')}</p>
          </header>

          {appState === 'idle' && (
            <div className="animate-fade-in space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {modes.map((m) => (
                  <button key={m.id} onClick={() => setMode(m.id)} className={`p-3 rounded-2xl text-sm font-semibold transition-all duration-300 text-center border ${mode === m.id ? 'bg-glow-light/20 dark:bg-glow-dark/30 text-gray-900 dark:text-white shadow-md border-glow-light dark:border-glow-dark' : 'bg-glass-light/50 dark:bg-glass-dark/50 text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/10 border-border-light dark:border-border-dark'}`} title={m.description}>{m.name}</button>
                ))}
              </div>
              <div className="relative">
                <textarea value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown} placeholder={t('mainQueryPlaceholder')} className="w-full h-32 p-4 pr-12 rounded-2xl resize-none bg-white/40 dark:bg-black/20 border border-transparent focus:border-glow-light dark:focus:border-glow-dark focus:ring-2 focus:ring-glow-light/50 dark:focus:ring-glow-dark/50 focus:outline-none transition-all duration-300" disabled={appState !== 'idle'}/>
                <div className="absolute inset-y-0 right-0 flex items-end p-3">
                    <input type="file" id="file-upload" ref={fileInputRef} className="hidden" onChange={handleFileChange} disabled={appState !== 'idle'} />
                    <label htmlFor="file-upload" className="p-2 rounded-full cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors" title={t('attachFile')}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg><span className="sr-only">{t('attachFile')}</span></label>
                </div>
              </div>
              <div className="rounded-2xl bg-white/40 dark:bg-black/20 border border-transparent focus-within:border-glow-light dark:focus-within:border-glow-dark focus-within:ring-2 focus-within:ring-glow-light/50 dark:focus-within:ring-glow-dark/50 transition-all duration-300">
                  <button onClick={() => setIsGuidedSearchOpen(prev => !prev)} className={`flex items-center justify-between w-full text-left p-4 text-sm text-gray-600 dark:text-gray-400 font-medium ${isGuidedSearchOpen ? 'pb-2' : ''}`} aria-expanded={isGuidedSearchOpen} aria-controls="guided-search-panel">
                      <span>{t('advancedSearch')}</span>
                      <svg className={`w-5 h-5 transition-transform duration-300 ${isGuidedSearchOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  <div id="guided-search-panel" className={`transition-all duration-500 ease-in-out overflow-hidden ${isGuidedSearchOpen ? 'max-h-40' : 'max-h-0'}`}>
                      <textarea
                          value={guidedQuery}
                          onChange={(e) => setGuidedQuery(e.target.value)}
                          placeholder={t('guidedSearchPlaceholder')}
                          className="w-full h-24 px-4 pb-4 bg-transparent resize-none focus:outline-none transition-all duration-300 placeholder:text-gray-500/80 dark:placeholder:text-gray-500/80"
                          disabled={appState !== 'idle'}
                      />
                  </div>
              </div>
              {selectedFile && <div className="flex items-center justify-between px-3 py-2 text-sm rounded-2xl bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/20 dark:border-blue-400/20"><span className="truncate text-gray-700 dark:text-gray-300" title={selectedFile.name}>{selectedFile.name}</span><button onClick={handleRemoveFile} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10" title={t('removeFile')}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg><span className="sr-only">{t('removeFile')}</span></button></div>}
              <LiquidButton onClick={handleStart} disabled={appState !== 'idle' || !query.trim()} className="w-full">{t('startResearch')}</LiquidButton>
            </div>
          )}
          
          {appState === 'clarifying' && (<ClarificationChat history={clarificationHistory} onAnswerSubmit={handleAnswerSubmit} onSkip={handleSkipClarification} isLoading={clarificationLoading}/>)}
          
          {appState === 'researching' && (<LiquidButton onClick={handleStopResearch} className="w-full bg-red-500/30 hover:bg-red-500/40 border-red-500/50">{t('stopResearch')}</LiquidButton>)}
          
          {appState === 'paused' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
                <LiquidButton onClick={handleContinueResearch} className="w-full">{t('continueResearch')}</LiquidButton>
                <LiquidButton onClick={handleGenerateReportFromPause} className="w-full bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400 hover:shadow-none hover:-translate-y-0 active:translate-y-px">{t('generateReport')}</LiquidButton>
            </div>
          )}

          {(appState === 'researching' || appState === 'paused' || (appState === 'complete' && researchUpdates.length > 0)) && (
            <div className="animate-fade-in space-y-4">
              {appState === 'complete' && (<button onClick={() => setIsLogVisible(!isLogVisible)} className="flex items-center justify-between w-full text-left font-semibold text-lg p-2 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5"><span>{t('toggleResearchLog', { action: isLogVisible ? t('hide') : t('show')})}</span><svg className={`w-5 h-5 transition-transform ${isLogVisible ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>)}
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
                      isRewriting={isRewriting}
                      onRewrite={handleReportRewrite}
                      onNavigateVersion={handleNavigateVersion}
                      onTranslate={handleTranslateReport}
                      isTranslating={translationLoading}
                   />
              </div>
          )}
        </GlassCard>
      </div>
      
       {appState === 'complete' && (
         <div className="fixed bottom-8 right-8 z-50 animate-fade-in">
             <LiquidButton onClick={handleReset} className="px-5 py-5 !rounded-full shadow-lg hover:shadow-2xl hover:-translate-y-2" title={t('startNewResearch')}>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                 <span className="sr-only">{t('startNewResearch')}</span>
            </LiquidButton>
         </div>
      )}

      <HistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onLoad={handleLoadFromHistory}
        onDelete={deleteHistoryItem}
        onClear={clearHistory}
        onUpdateTitle={handleUpdateHistoryTitle}
      />

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} currentMode={mode} />

      <ReportVisualizer 
        isOpen={isVisualizerOpen}
        isLoading={isVisualizing} 
        htmlContent={visualizedReportHtml} 
        onClose={handleCloseVisualizer} 
        onRegenerate={finalData?.reports[finalData.activeReportIndex] ? () => handleVisualizeReport(finalData.reports[finalData.activeReportIndex].content, true) : undefined}
        onSubmitFeedback={handleVisualizerFeedback}
      />
      
      <footer className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>&copy; {new Date().getFullYear()} KResearch. {t('footerPoweredBy')}</p>
      </footer>
    </div>
  );
};

export default App;
