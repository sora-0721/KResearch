import { useState, useEffect, useCallback, useRef } from 'react';
import { synthesizeReport, rewriteReport, clarifyQuery, runIterativeDeepResearch, generateVisualReport, regenerateVisualReportWithFeedback } from '../services';
import { ResearchUpdate, FinalResearchData, ResearchMode, FileData, AppState, ClarificationTurn, Citation } from '../types';
import { AllKeysFailedError, apiKeyService } from '../services/apiKeyService';
import { useNotification } from '../contextx/NotificationContext';
import { executeSingleSearch } from '../services/search';

const getCleanErrorMessage = (error: any): string => {
    let message = 'An unknown error occurred.';
    if (error instanceof Error) {
        try {
            const parsed = JSON.parse(error.message);
            message = parsed?.error?.message || error.message;
        } catch (e) {
            message = error.message;
        }
    } else {
        message = String(error);
    }
    return message;
};


export const useAppLogic = () => {
    const [query, setQuery] = useState<string>('');
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

    const abortControllerRef = useRef<AbortController | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const addNotification = useNotification();
    const researchExecutionRef = useRef<boolean>(false);
    
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
            setFinalData({ ...result, researchTimeMs: Date.now() - startTime });
            setAppState('complete');
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
    }, [query, mode, selectedFile, addNotification, initialSearchResult, researchUpdates]);

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
                // For now, only the main research loop is pausable. This will fall through.
            }
          console.error("Clarification step failed:", error);
          const message = getCleanErrorMessage(error);
          addNotification({type: 'error', title: 'Clarification Failed', message});
          setClarifiedContext('Clarification process failed. Proceeding with original query.');
          setAppState('researching');
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

    const startClarificationProcess = useCallback(async () => {
        if (!query.trim() || appState !== 'idle') return;

        if (!apiKeyService.hasKey()) {
            addNotification({type: 'warning', title: 'API Key Required', message: 'Please set your Gemini API key in the settings before starting research.'});
            setIsSettingsOpen(true);
            return;
        }

        setAppState('researching'); // Show log immediately
        setResearchUpdates([]); // Clear previous logs

        let searchResult: { text: string; citations: Citation[] } | null = null;
        try {
            setResearchUpdates(prev => [...prev, { id: prev.length, type: 'search', content: [query] }]);
            searchResult = await executeSingleSearch(query, mode);
            setInitialSearchResult(searchResult);
            setResearchUpdates(prev => [...prev, { id: prev.length, type: 'read', content: searchResult.text, source: searchResult.citations.map(c => c.url) }]);
        } catch (error) {
            console.error("Initial search failed:", error);
            const message = getCleanErrorMessage(error);
            addNotification({type: 'error', title: 'Initial Search Failed', message});
        }

        setAppState('clarifying');
        const initialQuery = selectedFile ? `${query}\n\n[File attached: ${selectedFile.name}]` : query;
        const initialHistory: ClarificationTurn[] = [{ role: 'user', content: initialQuery }];
        setClarificationHistory(initialHistory);
        handleClarificationResponse(initialHistory, searchResult);
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
    }

    return {
        query, setQuery, selectedFile, researchUpdates, finalData, mode, setMode, appState,
        clarificationHistory, clarificationLoading, fileInputRef, startClarificationProcess, 
        handleAnswerSubmit, handleStopResearch, handleFileChange, handleRemoveFile, handleReset,
        isVisualizing, visualizedReportHtml, isVisualizerOpen, handleVisualizeReport, handleCloseVisualizer, handleSkipClarification,
        isRegenerating, handleRegenerateReport, handleReportRewrite,
        isSettingsOpen, setIsSettingsOpen,
        handleVisualizerFeedback,
        handleContinueResearch,
    };
};