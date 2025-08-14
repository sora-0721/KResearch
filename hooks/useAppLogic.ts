


import { useState, useEffect, useCallback, useRef } from 'react';
import { synthesizeReport, rewriteReport, clarifyQuery, runIterativeDeepResearch, generateVisualReport, regenerateVisualReportWithFeedback } from '../services';
import { ResearchUpdate, FinalResearchData, ResearchMode, FileData, AppState, ClarificationTurn, Citation, HistoryItem, TranslationStyle, ReportVersion, Role } from '../types';
import { AllKeysFailedError, apiKeyService, historyService, roleService } from '../services';
import { useNotification } from '../contextx/NotificationContext';
import { useLanguage } from '../contextx/LanguageContext';
import { executeSingleSearch } from '../services/search';
import { translateText } from '../services/translation';
import { getCleanErrorMessage } from '../services/utils';

const extractTitleFromReport = (reportContent: string): string | null => {
    const match = reportContent.match(/^#\s+(.*)/);
    return match ? match[1] : null;
};

export const useAppLogic = () => {
    const { t } = useLanguage();
    const [query, setQuery] = useState<string>('');
    const [guidedQuery, setGuidedQuery] = useState<string>('');
    const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
    const [researchUpdates, setResearchUpdates] = useState<ResearchUpdate[]>([]);
    const [finalData, setFinalData] = useState<FinalResearchData | null>(null);
    const [mode, setMode] = useState<ResearchMode>('Balanced');
    const [appState, setAppState] = useState<AppState>('idle');
    const [clarificationHistory, setClarificationHistory] = useState<ClarificationTurn[]>([]);
    const [clarificationLoading, setClarificationLoading] = useState<boolean>(false);
    const [clarifiedContext, setClarifiedContext] = useState<string>('');
    const [initialSearchResult, setInitialSearchResult] = useState<{ text: string, citations: Citation[] } | null>(null);
    const [isVisualizing, setIsVisualizing] = useState<boolean>(false);
    const [visualizedReportHtml, setVisualizedReportHtml] = useState<string | null>(null);
    const [isVisualizerOpen, setIsVisualizerOpen] = useState<boolean>(false);
    const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
    const [isRewriting, setIsRewriting] = useState<boolean>(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
    const [history, setHistory] = useState<HistoryItem[]>(() => historyService.getHistory());
    const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
    const [translationLoading, setTranslationLoading] = useState<boolean>(false);
    
    // Role state
    const [roles, setRoles] = useState<Role[]>(() => roleService.getRoles());
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
    const [isRoleManagerOpen, setIsRoleManagerOpen] = useState<boolean>(false);

    const abortControllerRef = useRef<AbortController | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const addNotification = useNotification();
    const researchExecutionRef = useRef<boolean>(false);
    
     useEffect(() => {
        if (currentHistoryId && finalData && appState === 'complete') {
            const currentReport = finalData.reports[finalData.activeReportIndex];
            const title = currentReport ? extractTitleFromReport(currentReport.content) : query;
            historyService.updateHistoryItem(currentHistoryId, { finalData, title: title || query });
            setHistory(historyService.getHistory());
        }
    }, [finalData, currentHistoryId, appState, query]);

    const startResearch = useCallback(async (context: string) => {
        if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) {
            abortControllerRef.current = new AbortController();
        }
        const startTime = Date.now();
        const selectedRole = roles.find(r => r.id === selectedRoleId);

        try {
            const result = await runIterativeDeepResearch(query, (update) => {
                setResearchUpdates(prev => [...prev, update]);
            }, abortControllerRef.current!.signal, mode, context, selectedFile, selectedRole, initialSearchResult, researchUpdates);
            
            const resultData = { ...result, researchTimeMs: Date.now() - startTime };
            setFinalData(resultData);
            setResearchUpdates(resultData.researchUpdates); // Set final, definitive history
            setAppState('complete');
            
            const reportTitle = extractTitleFromReport(resultData.reports[0]?.content || '') || query;
            
            const newHistoryId = historyService.addHistoryItem({
                query,
                title: reportTitle,
                mode,
                roleId: selectedRoleId,
                selectedFile,
                finalData: resultData,
                clarificationHistory,
                initialSearchResult,
                clarifiedContext: context,
            });
            setCurrentHistoryId(newHistoryId);
            setHistory(historyService.getHistory());

        } catch (error: any) {
            if (error instanceof AllKeysFailedError) {
                addNotification({ type: 'error', title: t('allApiKeysFailedTitle'), message: t('allApiKeysFailedMessage') });
                apiKeyService.reset();
                setAppState('paused');
                return;
            }

            const searchCycles = researchUpdates.filter(u => u.type === 'search').length > 0 ? researchUpdates.filter(u => u.type === 'search').length - 1 : 0;
            const errorReport: ReportVersion = { content: "The research process was cancelled.", version: 1 };
            const commonErrorData = {
                reports: [errorReport], activeReportIndex: 0, citations: [],
                researchTimeMs: Date.now() - startTime, researchUpdates, searchCycles
            };

            if (error.name === 'AbortError') {
                addNotification({ type: 'info', title: t('researchStoppedTitle'), message: t('researchStoppedMessage')});
                setFinalData(commonErrorData);
            } else {
                console.error("Research failed:", error);
                const message = getCleanErrorMessage(error);
                addNotification({ type: 'error', title: t('researchFailedTitle'), message });
                const errorReportContent = { ...errorReport, content: "An error occurred during the research process."};
                setFinalData({ ...commonErrorData, reports: [errorReportContent] });
            }
            setAppState('complete');
        }
    }, [query, mode, selectedFile, addNotification, initialSearchResult, clarificationHistory, t, roles, selectedRoleId, researchUpdates]);

    const handleClarificationResponse = useCallback(async (history: ClarificationTurn[], searchResult: { text: string; citations: Citation[] } | null) => {
      setClarificationLoading(true);
      const selectedRole = roles.find(r => r.id === selectedRoleId);
      try {
          const response = await clarifyQuery(history, mode, selectedFile, selectedRole, searchResult);
          if (response.type === 'question') {
              setClarificationHistory(prev => [...prev, { role: 'model', content: response.content }]);
          } else if (response.type === 'summary') {
              setClarifiedContext(response.content);
              setAppState('researching');
          }
      } catch (error) {
            if (error instanceof AllKeysFailedError) {
                addNotification({ type: 'error', title: t('apiKeysFailedTitle'), message: t('apiKeysFailedMessage') });
                apiKeyService.reset();
            } else {
              console.error("Clarification step failed:", error);
              const message = getCleanErrorMessage(error);
              addNotification({type: 'error', title: t('clarificationFailedTitle'), message});
            }
            setAppState('paused'); // Pause on ANY error during clarification
      } finally {
          setClarificationLoading(false); // Always turn off loading state
      }
    }, [mode, selectedFile, addNotification, t, roles, selectedRoleId]);

    useEffect(() => {
      if (appState === 'researching' && clarifiedContext && !researchExecutionRef.current) {
          researchExecutionRef.current = true;
          startResearch(clarifiedContext)
            .finally(() => {
                researchExecutionRef.current = false;
            });
      }
    }, [appState, clarifiedContext, startResearch]);

    const startClarificationProcess = useCallback(async (guidedSearchQuery?: string) => {
        if (!query.trim() || (appState !== 'idle' && appState !== 'paused')) return;

        if (!apiKeyService.hasKey()) {
            addNotification({type: 'warning', title: t('apiKeyRequiredTitle'), message: t('apiKeyRequiredMessage')});
            setIsSettingsOpen(true);
            return;
        }

        setAppState('researching');
        setResearchUpdates([]); // Clear previous logs for a new run
        
        try {
            const guidedQueries = guidedSearchQuery?.split(/[\n,]+/).map(q => q.trim()).filter(Boolean) || [];
            const queriesToSearch = [query.trim(), ...guidedQueries].filter(Boolean);

            if (queriesToSearch.length === 0) {
                addNotification({ type: 'warning', title: t('emptyQueryTitle'), message: t('emptyQueryMessage') });
                setAppState('idle');
                return;
            }

            const initialSearchUpdate = { id: 0, type: 'search' as const, content: queriesToSearch };
            setResearchUpdates([initialSearchUpdate]);
            
            const searchPromises = queriesToSearch.map(q => executeSingleSearch(q, mode));
            const searchResults = await Promise.all(searchPromises);
            
            const allSummaries: string[] = [];
            const allCitations: Citation[] = [];

            searchResults.forEach(result => {
                allSummaries.push(result.text);
                allCitations.push(...result.citations);
            });

            const initialReadUpdate = { 
                id: 1, 
                type: 'read' as const, 
                content: allSummaries,
                source: Array.from(new Set(allCitations.map(c => c.url))) 
            };
            setResearchUpdates([initialSearchUpdate, initialReadUpdate]);
            
            const searchResultForClarification = {
                text: allSummaries.join('\n\n'),
                citations: Array.from(new Map(allCitations.map(c => [c.url, c])).values()),
            };
            
            setInitialSearchResult(searchResultForClarification);

            setAppState('clarifying');
            const initialQuery = selectedFile ? `${query}\n\n[File attached: ${selectedFile.name}]` : query;
            const initialHistory: ClarificationTurn[] = [{ role: 'user', content: initialQuery }];
            setClarificationHistory(initialHistory);
            handleClarificationResponse(initialHistory, searchResultForClarification);
            
        } catch (error) {
            console.error("Initial search failed:", error);
            if (error instanceof AllKeysFailedError) {
                apiKeyService.reset();
                addNotification({type: 'error', title: t('allApiKeysFailedTitle'), message: t('apiKeysFailedMessage')});
            } else {
                 const message = getCleanErrorMessage(error);
                 addNotification({type: 'error', title: t('initialSearchFailedTitle'), message});
            }
            setAppState('paused'); // Pause the app on failure
            return; // Stop execution
        }
    }, [query, appState, selectedFile, mode, addNotification, handleClarificationResponse, t]);

    const handleAnswerSubmit = useCallback((answer: string) => {
        const newHistory: ClarificationTurn[] = [...clarificationHistory, { role: 'user', content: answer }];
        setClarificationHistory(newHistory);
        handleClarificationResponse(newHistory, initialSearchResult);
    }, [clarificationHistory, handleClarificationResponse, initialSearchResult]);
    
    const handleSkipClarification = useCallback(() => {
        if (appState !== 'clarifying') return;

        const userHasProvidedAnswers = clarificationHistory.filter(t => t.role === 'user').length > 1;

        let contextForResearch: string;

        if (userHasProvidedAnswers) {
            contextForResearch = `The user's initial query was "${query}". The following conversation was held to clarify the topic. The research should proceed based on this context:\n${clarificationHistory.map(t => `${t.role}: ${t.content}`).join('\n')}`;
        } else {
            contextForResearch = query;
        }
        
        setClarifiedContext(contextForResearch);
        setAppState('researching');

    }, [appState, clarificationHistory, query]);

    const handleContinueResearch = () => {
        if (appState !== 'paused') return;
        
        // Case 1: Paused during the very first step (initial search failed)
        if (!initialSearchResult && clarificationHistory.length === 0) {
            startClarificationProcess(guidedQuery);
            return;
        }
    
        // Case 2: Paused during the AI clarification chat
        if (clarificationHistory.length > 0 && !clarifiedContext) {
            setAppState('clarifying');
            handleClarificationResponse(clarificationHistory, initialSearchResult);
            return;
        }
    
        // Case 3: Paused during the main research loop
        setAppState('researching');
    };

    const handleGenerateReportFromPause = useCallback(async () => {
        if (appState !== 'paused') return;
        
        const selectedRole = roles.find(r => r.id === selectedRoleId);
    
        const getCitationsFromHistory = (history: ResearchUpdate[]): Citation[] => {
            const citationsMap = new Map<string, Citation>();
            history.forEach(update => {
                if (update.type === 'read' && Array.isArray(update.source)) {
                    update.source.forEach(url => {
                        if (typeof url === 'string' && !citationsMap.has(url)) {
                            citationsMap.set(url, { url, title: url });
                        }
                    });
                }
            });
            return Array.from(citationsMap.values());
        };

        setAppState('synthesizing');
        const startTime = Date.now();
        try {
            const citations = getCitationsFromHistory(researchUpdates);
            addNotification({ type: 'info', title: t('reportGeneratedTitle'), message: t('generatingReport') });
            const result = await synthesizeReport(query, researchUpdates, citations, mode, selectedFile, selectedRole, "");
            
            const searchUpdatesCount = researchUpdates.filter(u => u.type === 'search').length;
            const searchCycles = initialSearchResult ? Math.max(0, searchUpdatesCount - 1) : searchUpdatesCount;
            
            setFinalData({ 
                ...result, 
                citations,
                researchTimeMs: Date.now() - startTime,
                researchUpdates: researchUpdates, // Persist the partial log
                searchCycles: searchCycles
            });

            setAppState('complete');
            addNotification({ type: 'success', title: t('reportGeneratedTitle'), message: t('reportGeneratedMessage') });
        } catch (error: any) {
            if (error instanceof AllKeysFailedError) {
                 addNotification({ type: 'error', title: t('synthesisFailedTitle'), message: t('synthesisFailedMessage') });
                 apiKeyService.reset();
            } else {
                console.error("Synthesis from paused state failed:", error);
                const message = getCleanErrorMessage(error);
                addNotification({ type: 'error', title: t('synthesisFailedTitle'), message });
            }
            setAppState('paused');
        }
    }, [appState, researchUpdates, query, mode, selectedFile, addNotification, initialSearchResult, t, roles, selectedRoleId]);

    const handleVisualizeReport = useCallback(async (reportMarkdown: string, forceRegenerate: boolean = false) => {
        if (isVisualizing) {
            setIsVisualizerOpen(true);
            return;
        }

        if (visualizedReportHtml && !forceRegenerate) {
            setIsVisualizerOpen(true);
            return;
        }
        
        if (!reportMarkdown) return;

        setIsVisualizing(true);
        setIsVisualizerOpen(true);
        
        if (forceRegenerate) {
            setVisualizedReportHtml(null);
        }
        
        try {
            const html = await generateVisualReport(reportMarkdown, mode);
            setVisualizedReportHtml(html);
        } catch(error) {
            console.error("Failed to generate visual report:", error);
            const message = getCleanErrorMessage(error);
            setVisualizedReportHtml(null);
            addNotification({type: 'error', title: t('visualizationFailedTitle'), message});
        } finally {
            setIsVisualizing(false);
        }
    }, [mode, addNotification, visualizedReportHtml, isVisualizing, t]);

    const handleVisualizerFeedback = useCallback(async (feedback: string, file: FileData | null) => {
        if (!visualizedReportHtml || !finalData?.reports[finalData.activeReportIndex]) return;
        setIsVisualizing(true);
        try {
            const html = await regenerateVisualReportWithFeedback(finalData.reports[finalData.activeReportIndex].content, visualizedReportHtml, feedback, file, mode);
            setVisualizedReportHtml(html);
        } catch (error) {
            console.error("Failed to update visual report with feedback:", error);
            const message = getCleanErrorMessage(error);
            throw new Error(message);
        } finally {
            setIsVisualizing(false);
        }
    }, [mode, finalData, visualizedReportHtml]);


    const handleRegenerateReport = useCallback(async () => {
        if (!finalData) return;
        setIsRegenerating(true);
        const selectedRole = roles.find(r => r.id === selectedRoleId);
        try {
            addNotification({ type: 'info', title: t('reportRegeneratedTitle'), message: t('regenerating') });
            const regeneratedReportData = await synthesizeReport(query, researchUpdates, finalData.citations, mode, selectedFile, selectedRole, "");
            setFinalData(prev => {
                if (!prev) return null;
                const newVersion: ReportVersion = { content: regeneratedReportData.reports[0].content, version: prev.reports.length + 1 };
                const updatedReports = [...prev.reports, newVersion];
                return { ...prev, reports: updatedReports, activeReportIndex: updatedReports.length - 1 };
            });
             addNotification({ type: 'success', title: t('reportRegeneratedTitle'), message: t('reportRegeneratedMessage')});
        } catch(error) {
            console.error("Failed to regenerate report:", error);
            const message = getCleanErrorMessage(error);
            addNotification({ type: 'error', title: t('regenerationFailedTitle'), message });
        } finally {
            setIsRegenerating(false);
        }
    }, [finalData, query, researchUpdates, mode, selectedFile, addNotification, t, roles, selectedRoleId]);

    const handleReportRewrite = useCallback(async (instruction: string, file: FileData | null) => {
        if (!finalData?.reports[finalData.activeReportIndex] || isRegenerating || isRewriting) return;
        setIsRewriting(true);
        const selectedRole = roles.find(r => r.id === selectedRoleId);
        try {
            const currentReport = finalData.reports[finalData.activeReportIndex].content;
            const rewrittenReport = await rewriteReport(currentReport, instruction, mode, file, selectedRole);
            setFinalData(prev => {
                if (!prev) return null;
                const newVersion: ReportVersion = { content: rewrittenReport, version: prev.reports.length + 1 };
                const updatedReports = [...prev.reports, newVersion];
                return { ...prev, reports: updatedReports, activeReportIndex: updatedReports.length - 1 };
            });
            addNotification({ type: 'success', title: t('reportUpdatedTitle'), message: t('reportUpdatedMessage') });
        } catch (error) {
            console.error("Failed to rewrite report:", error);
            const message = getCleanErrorMessage(error);
            addNotification({ type: 'error', title: t('rewriteFailedTitle'), message });
        } finally {
            setIsRewriting(false);
        }
    }, [finalData, isRegenerating, isRewriting, mode, addNotification, t, roles, selectedRoleId]);

    const handleCloseVisualizer = () => setIsVisualizerOpen(false);
    
    const handleStopResearch = () => {
        abortControllerRef.current?.abort();
        researchExecutionRef.current = false;
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target?.result as string;
        setSelectedFile({ name: file.name, mimeType: file.type, data: base64String.split(',')[1] });
      };
      reader.readAsDataURL(file);
    };

    const handleRemoveFile = () => {
      setSelectedFile(null);
      if(fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleReset = () => {
        abortControllerRef.current?.abort();
        researchExecutionRef.current = false;
        setAppState('idle');
        setFinalData(null);
        setResearchUpdates([]);
        setQuery('');
        setGuidedQuery('');
        setMode('Balanced');
        handleRemoveFile();
        setClarificationHistory([]);
        setClarifiedContext('');
        setClarificationLoading(false);
        setInitialSearchResult(null);
        setVisualizedReportHtml(null);
        setIsVisualizing(false);
        setIsVisualizerOpen(false);
        setIsRegenerating(false);
        setIsRewriting(false);
        setIsSettingsOpen(false);
        setCurrentHistoryId(null);
        setTranslationLoading(false);
        setSelectedRoleId(null);
    }
    
    const loadFromHistory = (id: string) => {
        const item = historyService.getHistoryItem(id);
        if (item) {
            handleReset(); // Ensure clean state before loading
            setTimeout(() => {
                setQuery(item.query);
                setMode(item.mode);
                setSelectedFile(item.selectedFile);
                setFinalData(item.finalData);
                setResearchUpdates(item.finalData.researchUpdates);
                setClarificationHistory(item.clarificationHistory);
                setInitialSearchResult(item.initialSearchResult);
                setClarifiedContext(item.clarifiedContext);
                setCurrentHistoryId(item.id);
                setSelectedRoleId(item.roleId || null);
                setAppState('complete');
            }, 50)
        }
    };

    const deleteHistoryItem = (id: string) => {
        historyService.removeHistoryItem(id);
        setHistory(historyService.getHistory());
        addNotification({type: 'info', title: t('historyItemRemovedTitle'), message: t('historyItemRemovedMessage')});
    };

    const clearHistory = () => {
        historyService.clearHistory();
        setHistory([]);
        addNotification({type: 'info', title: t('historyClearedTitle'), message: t('historyClearedMessage')});
    };
    
    const handleUpdateHistoryTitle = (id: string, newTitle: string) => {
        historyService.updateHistoryItemTitle(id, newTitle);
        setHistory(historyService.getHistory());
        if (id === currentHistoryId) {
            setFinalData(prev => {
                if (!prev) return null;
                const newReports = [...prev.reports];
                const activeReport = newReports[prev.activeReportIndex];
                const oldTitle = extractTitleFromReport(activeReport.content) || '';
                // Replace only the first H1 occurrence
                newReports[prev.activeReportIndex] = { ...activeReport, content: activeReport.content.replace(`# ${oldTitle}`, `# ${newTitle}`) };
                return { ...prev, reports: newReports };
            });
        }
    };

    const handleNavigateVersion = (direction: 'prev' | 'next') => {
        setFinalData(prev => {
            if (!prev) return null;
            let newIndex = prev.activeReportIndex;
            if (direction === 'next' && newIndex < prev.reports.length - 1) {
                newIndex++;
            } else if (direction === 'prev' && newIndex > 0) {
                newIndex--;
            }
            return { ...prev, activeReportIndex: newIndex };
        });
    };
    
    const handleTranslateReport = useCallback(async (language: string, style: TranslationStyle) => {
        if (!finalData?.reports[finalData.activeReportIndex] || translationLoading) return;

        setTranslationLoading(true);
        try {
            const currentReportContent = finalData.reports[finalData.activeReportIndex].content;
            const translatedContent = await translateText(currentReportContent, language, style, mode);
            
            if (!translatedContent.trim()) {
                throw new Error("Translation resulted in empty content.");
            }

            setFinalData(prev => {
                if (!prev) return null;
                const newVersion: ReportVersion = { 
                    content: translatedContent, 
                    version: prev.reports.length + 1 
                };
                const updatedReports = [...prev.reports, newVersion];
                return { ...prev, reports: updatedReports, activeReportIndex: updatedReports.length - 1 };
            });
            addNotification({ type: 'success', title: t('translationCompleteTitle'), message: t('translationCompleteMessage') });
        } catch (error) {
            console.error("Failed to translate report:", error);
            const message = getCleanErrorMessage(error);
            addNotification({ type: 'error', title: t('translationFailedTitle'), message });
        } finally {
            setTranslationLoading(false);
        }
    }, [finalData, translationLoading, mode, addNotification, t]);

    // Role Management Handlers
    const saveRole = (role: Role) => {
        roleService.saveRole(role);
        setRoles(roleService.getRoles());
    };
    const deleteRole = (id: string) => {
        roleService.deleteRole(id);
        setRoles(roleService.getRoles());
        if (selectedRoleId === id) {
            setSelectedRoleId(null);
        }
    };

    return {
        query, setQuery, guidedQuery, setGuidedQuery, selectedFile, researchUpdates, finalData, mode, setMode, appState,
        clarificationHistory, clarificationLoading, fileInputRef, startClarificationProcess, 
        handleAnswerSubmit, handleStopResearch, handleFileChange, handleRemoveFile, handleReset,
        isVisualizing, visualizedReportHtml, isVisualizerOpen, handleVisualizeReport, handleCloseVisualizer, handleSkipClarification,
        isRegenerating, isRewriting, handleRegenerateReport, handleReportRewrite,
        isSettingsOpen, setIsSettingsOpen,
        handleVisualizerFeedback,
        handleContinueResearch,
        handleGenerateReportFromPause,
        history, loadFromHistory, deleteHistoryItem, clearHistory, handleUpdateHistoryTitle,
        handleNavigateVersion,
        handleTranslateReport, translationLoading,
        roles, selectedRoleId, setSelectedRoleId, saveRole, deleteRole, isRoleManagerOpen, setIsRoleManagerOpen
    };
};