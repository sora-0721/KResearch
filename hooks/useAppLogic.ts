import { useState, useEffect, useCallback, useRef } from 'react';
import { synthesizeReport, rewriteReport, clarifyQuery, runIterativeDeepResearch, generateVisualReport, regenerateVisualReportWithFeedback } from '../services';
import { ResearchUpdate, FinalResearchData, ResearchMode, FileData, AppState, ClarificationTurn, Citation, HistoryItem } from '../types';
import { AllKeysFailedError, apiKeyService, historyService } from '../services';
import { useNotification } from '../contextx/NotificationContext';
import { executeSingleSearch } from '../services/search';

const getCleanErrorMessage = (error: any): string => {
    if (!error) return 'An unknown error occurred.';
    if (typeof error === 'string') return error;

    // Prioritize a 'message' or 'str' property, common in error-like objects (e.g., Mermaid)
    if (error.message && typeof error.message === 'string') {
        try {
            // Check for Gemini's nested error format
            const parsed = JSON.parse(error.message);
            return parsed?.error?.message || error.message;
        } catch (e) {
            return error.message;
        }
    }

    if (error.str && typeof error.str === 'string') {
        return error.str;
    }

    if (error instanceof Error) {
        return error.message;
    }

    // Fallback for other objects
    if (typeof error === 'object' && error !== null) {
        try {
            return JSON.stringify(error, null, 2);
        } catch {
            return 'Received an un-stringifiable error object.';
        }
    }

    return String(error);
};


export const useAppLogic = () => {
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
    const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
    const [history, setHistory] = useState<HistoryItem[]>(() => historyService.getHistory());
    const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);

    const abortControllerRef = useRef<AbortController | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const addNotification = useNotification();
    const researchExecutionRef = useRef<boolean>(false);
    
     useEffect(() => {
        if (currentHistoryId && finalData && appState === 'complete') {
            historyService.updateHistoryItem(currentHistoryId, finalData);
            setHistory(historyService.getHistory());
        }
    }, [finalData, currentHistoryId, appState]);

    const startResearch = useCallback(async (context: string) => {
        if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) {
            abortControllerRef.current = new AbortController();
        }
        setAppState('researching');
        const startTime = Date.now();
        try {
            const result = await runIterativeDeepResearch(query, (update) => {
                setResearchUpdates(prev => [...prev, update]);
            }, abortControllerRef.current!.signal, mode, context, selectedFile, initialSearchResult, researchUpdates);
            
            const resultData = { ...result, researchTimeMs: Date.now() - startTime };
            setFinalData(resultData);
            setAppState('complete');
            
            const newHistoryId = historyService.addHistoryItem({
                query,
                mode,
                selectedFile,
                finalData: resultData,
                researchUpdates,
                clarificationHistory,
                initialSearchResult,
                clarifiedContext: context,
            });
            setCurrentHistoryId(newHistoryId);
            setHistory(historyService.getHistory());

        } catch (error: any) {
            if (error instanceof AllKeysFailedError) {
                addNotification({ type: 'error', title: 'All API Keys Failed', message: 'You can retry the operation or check your keys in Settings.' });
                setAppState('paused');
                return;
            }

            const commonErrorData = { citations: [], researchTimeMs: Date.now() - startTime };
            if (error.name === 'AbortError') {
                addNotification({ type: 'info', title: 'Research Stopped', message: 'The research process was cancelled by the user.'});
                setFinalData({ report: "The research process was cancelled.", ...commonErrorData });
            } else {
                console.error("Research failed:", error);
                const message = getCleanErrorMessage(error);
                addNotification({ type: 'error', title: 'Research Failed', message });
                setFinalData({ report: "An error occurred during the research process.", ...commonErrorData });
            }
            setAppState('complete');
        }
    }, [query, mode, selectedFile, addNotification, initialSearchResult, researchUpdates, clarificationHistory]);

    const handleClarificationResponse = useCallback(async (history: ClarificationTurn[], searchResult: { text: string; citations: Citation[] } | null) => {
      setClarificationLoading(true);
      try {
          const response = await clarifyQuery(history, mode, selectedFile, searchResult);
          if (response.type === 'question') {
              setClarificationHistory(prev => [...prev, { role: 'model', content: response.content }]);
          } else if (response.type === 'summary') {
              setClarifiedContext(response.content);
              setAppState('researching');
          }
      } catch (error) {
            if (error instanceof AllKeysFailedError) {
                addNotification({ type: 'error', title: 'API Keys Failed', message: 'All API keys failed. You can retry the operation.' });
                setAppState('paused');
            } else {
              console.error("Clarification step failed:", error);
              const message = getCleanErrorMessage(error);
              addNotification({type: 'error', title: 'Clarification Failed', message});
              setClarifiedContext('Clarification process failed. Proceeding with original query.');
              setAppState('researching');
            }
      } finally {
          if(appState !== 'paused') {
            setClarificationLoading(false);
          }
      }
    }, [mode, selectedFile, addNotification, appState]);

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
        if (!query.trim() || appState !== 'idle') return;

        if (!apiKeyService.hasKey()) {
            addNotification({type: 'warning', title: 'API Key Required', message: 'Please set your Gemini API key in the settings before starting research.'});
            setIsSettingsOpen(true);
            return;
        }

        setAppState('researching');
        setResearchUpdates([]);

        let searchResultForClarification: { text: string; citations: Citation[] } | null = null;
        try {
            const guidedQueries = guidedSearchQuery?.split(/[\n,]+/).map(q => q.trim()).filter(Boolean) || [];
            const queriesToSearch = [query.trim(), ...guidedQueries].filter(Boolean);

            if (queriesToSearch.length === 0) {
                addNotification({ type: 'warning', title: 'Empty Query', message: 'Cannot start research with an empty query.' });
                setAppState('idle');
                return;
            }

            setResearchUpdates(prev => [...prev, { id: prev.length, type: 'search', content: queriesToSearch }]);
            
            const searchPromises = queriesToSearch.map(q => executeSingleSearch(q, mode));
            const searchResults = await Promise.all(searchPromises);
            
            const allSummaries: string[] = [];
            const allCitations: Citation[] = [];

            // Collect all summaries and citations from the initial search results.
            searchResults.forEach(result => {
                allSummaries.push(result.text);
                allCitations.push(...result.citations);
            });

            // Create a single "read" update for all initial search results to match the format of subsequent reads.
            setResearchUpdates(prev => [...prev, { 
                id: prev.length, 
                type: 'read', 
                content: allSummaries, // Now an array of strings
                source: Array.from(new Set(allCitations.map(c => c.url))) 
            }]);
            
            searchResultForClarification = {
                text: allSummaries.join('\n\n'),
                citations: Array.from(new Map(allCitations.map(c => [c.url, c])).values()),
            };
            
            setInitialSearchResult(searchResultForClarification);
            
        } catch (error) {
            console.error("Initial search failed:", error);
            const message = getCleanErrorMessage(error);
            addNotification({type: 'error', title: 'Initial Search Failed', message});
        }

        setAppState('clarifying');
        const initialQuery = selectedFile ? `${query}\n\n[File attached: ${selectedFile.name}]` : query;
        const initialHistory: ClarificationTurn[] = [{ role: 'user', content: initialQuery }];
        setClarificationHistory(initialHistory);
        handleClarificationResponse(initialHistory, searchResultForClarification);
    }, [query, appState, selectedFile, mode, addNotification, handleClarificationResponse]);

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
        setAppState('researching');
    }

    const handleGenerateReportFromPause = useCallback(async () => {
        if (appState !== 'paused') return;
    
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

        setAppState('researching');
        const startTime = Date.now();
        try {
            const citations = getCitationsFromHistory(researchUpdates);
            const result = await synthesizeReport(query, researchUpdates, citations, mode, selectedFile);
            
            setFinalData({ 
                ...result, 
                citations,
                researchTimeMs: Date.now() - startTime 
            });

            setAppState('complete');
            addNotification({ type: 'success', title: 'Report Generated', message: 'Report generated from the research completed so far.' });
        } catch (error: any) {
            if (error instanceof AllKeysFailedError) {
                 addNotification({ type: 'error', title: 'All API Keys Failed', message: 'Synthesis failed. Please check your keys in Settings.' });
            } else {
                console.error("Synthesis from paused state failed:", error);
                const message = getCleanErrorMessage(error);
                addNotification({ type: 'error', title: 'Synthesis Failed', message });
            }
            setAppState('paused');
        }
    }, [appState, researchUpdates, query, mode, selectedFile, addNotification]);

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
            addNotification({type: 'error', title: 'Visualization Failed', message});
        } finally {
            setIsVisualizing(false);
        }
    }, [mode, addNotification, visualizedReportHtml, isVisualizing]);

    const handleVisualizerFeedback = useCallback(async (feedback: string, file: FileData | null) => {
        if (!visualizedReportHtml || !finalData?.report) return;
        setIsVisualizing(true);
        try {
            const html = await regenerateVisualReportWithFeedback(finalData.report, visualizedReportHtml, feedback, file, mode);
            setVisualizedReportHtml(html);
        } catch (error) {
            console.error("Failed to update visual report with feedback:", error);
            const message = getCleanErrorMessage(error);
            throw new Error(message);
        } finally {
            setIsVisualizing(false);
        }
    }, [mode, finalData?.report, visualizedReportHtml]);


    const handleRegenerateReport = useCallback(async () => {
        if (!finalData) return;
        setIsRegenerating(true);
        try {
            const regeneratedReportData = await synthesizeReport(query, researchUpdates, finalData.citations, mode, selectedFile);
            setFinalData(prev => {
                if (!prev) return null;
                return { ...prev, report: regeneratedReportData.report };
            });
             addNotification({ type: 'success', title: 'Report Regenerated', message: 'A new version of the report has been generated.'});
        } catch(error) {
            console.error("Failed to regenerate report:", error);
            const message = getCleanErrorMessage(error);
            addNotification({ type: 'error', title: 'Regeneration Failed', message });
        } finally {
            setIsRegenerating(false);
        }
    }, [finalData, query, researchUpdates, mode, selectedFile, addNotification]);

    const handleReportRewrite = useCallback(async (instruction: string, file: FileData | null) => {
        if (!finalData?.report || isRegenerating) return;
        setIsRegenerating(true);
        try {
            const rewrittenReport = await rewriteReport(finalData.report, instruction, mode, file);
            setFinalData(prev => {
                if (!prev) return null;
                return { ...prev, report: rewrittenReport };
            });
            addNotification({ type: 'success', title: 'Report Updated', message: 'The report has been successfully rewritten.' });
        } catch (error) {
            console.error("Failed to rewrite report:", error);
            const message = getCleanErrorMessage(error);
            addNotification({ type: 'error', title: 'Rewrite Failed', message });
        } finally {
            setIsRegenerating(false);
        }
    }, [finalData, isRegenerating, mode, addNotification]);

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
        setIsSettingsOpen(false);
        setCurrentHistoryId(null);
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
                setResearchUpdates(item.researchUpdates);
                setClarificationHistory(item.clarificationHistory);
                setInitialSearchResult(item.initialSearchResult);
                setClarifiedContext(item.clarifiedContext);
                setCurrentHistoryId(item.id);
                setAppState('complete');
            }, 50)
        }
    };

    const deleteHistoryItem = (id: string) => {
        historyService.removeHistoryItem(id);
        setHistory(historyService.getHistory());
        addNotification({type: 'info', title: 'History item removed', message: 'The selected item has been deleted from your research history.'});
    };

    const clearHistory = () => {
        historyService.clearHistory();
        setHistory([]);
        addNotification({type: 'info', title: 'History cleared', message: 'All items have been removed from your research history.'});
    };


    return {
        query, setQuery, guidedQuery, setGuidedQuery, selectedFile, researchUpdates, finalData, mode, setMode, appState,
        clarificationHistory, clarificationLoading, fileInputRef, startClarificationProcess, 
        handleAnswerSubmit, handleStopResearch, handleFileChange, handleRemoveFile, handleReset,
        isVisualizing, visualizedReportHtml, isVisualizerOpen, handleVisualizeReport, handleCloseVisualizer, handleSkipClarification,
        isRegenerating, handleRegenerateReport, handleReportRewrite,
        isSettingsOpen, setIsSettingsOpen,
        handleVisualizerFeedback,
        handleContinueResearch,
        handleGenerateReportFromPause,
        history, loadFromHistory, deleteHistoryItem, clearHistory
    };
};