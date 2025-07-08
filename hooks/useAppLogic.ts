import { useState, useEffect, useCallback, useRef } from 'react';
import { runIterativeDeepResearch, clarifyQuery, generateVisualReport, synthesizeReport } from '../services';
import { ResearchUpdate, FinalResearchData, ResearchMode, FileData, AppState, ClarificationTurn, Citation } from '../types';
import { apiKeyService } from '../services/apiKeyService';
import { useNotification } from '../contextx/NotificationContext';

const getCleanErrorMessage = (error: any): string => {
    let message = 'An unknown error occurred.';
    if (error instanceof Error) {
        // API errors from the Gemini client often have a nested structure.
        if (error.message.includes('FetchError')) {
             return 'A network error occurred. Please check your connection and try again.';
        }
        if (error.message.includes('429')) {
            return 'You have exceeded your API quota. Please check your Gemini API plan and billing details.';
        }
        message = error.message;
    } else {
        message = String(error);
    }
    return message;
};


export const useAppLogic = () => {
    const [query, setQuery] = useState<string>('');
    const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
    const [researchUpdates, setResearchUpdates] = useState<ResearchUpdate[]>([]);
    const [allCitations, setAllCitations] = useState<Citation[]>([]);
    const [finalData, setFinalData] = useState<FinalResearchData | null>(null);
    const [mode, setMode] = useState<ResearchMode>('Balanced');
    const [appState, setAppState] = useState<AppState>('idle');
    const [clarificationHistory, setClarificationHistory] = useState<ClarificationTurn[]>([]);
    const [clarificationLoading, setClarificationLoading] = useState<boolean>(false);
    const [clarifiedContext, setClarifiedContext] = useState<string>('');
    const [isVisualizing, setIsVisualizing] = useState<boolean>(false);
    const [visualizedReportHtml, setVisualizedReportHtml] = useState<string | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
    const [lastError, setLastError] = useState<string | null>(null);
    const [canContinueResearch, setCanContinueResearch] = useState(true);

    const abortControllerRef = useRef<AbortController | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const researchStartTimeRef = useRef<number>(0);
    const addNotification = useNotification();

    const handleGenerateFinalReport = useCallback(async () => {
        setAppState('synthesizing');
        try {
            const finalReportData = await synthesizeReport(query, researchUpdates, allCitations, mode, selectedFile);
            const uniqueCitations = Array.from(new Map(allCitations.map(c => [c.url, c])).values());
            const researchTime = researchStartTimeRef.current > 0 ? Date.now() - researchStartTimeRef.current : 0;
            setFinalData({ ...finalReportData, citations: uniqueCitations, researchTimeMs: researchTime });
        } catch(error) {
            console.error("Synthesis failed:", error);
            const message = getCleanErrorMessage(error);
            addNotification({ type: 'error', title: 'Synthesis Failed', message });
             setFinalData({ report: "An error occurred during the final report generation.", citations: [], researchTimeMs: 0 });
        } finally {
            setAppState('complete');
        }

    }, [query, researchUpdates, allCitations, mode, selectedFile, addNotification]);
    
    const executeResearch = useCallback(async () => {
        setLastError(null);
        abortControllerRef.current = new AbortController();

        try {
            const { report, citations, canContinue } = await runIterativeDeepResearch(
                query,
                (update) => setResearchUpdates(prev => [...prev, update]),
                (newCitations) => setAllCitations(prev => [...prev, ...newCitations]),
                abortControllerRef.current.signal,
                mode,
                clarifiedContext,
                selectedFile,
                researchUpdates,
            );
            
            // This part runs if research completes without throwing an error
            setCanContinueResearch(canContinue);
            await handleGenerateFinalReport();

        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error("Research process failed:", error);
                setLastError(getCleanErrorMessage(error));
                setAppState('paused_error');
            }
            // AbortError is handled by the stop button, which calls handleGenerateFinalReport.
        }
    }, [query, mode, clarifiedContext, selectedFile, researchUpdates, handleGenerateFinalReport]);

    useEffect(() => {
        if (appState === 'researching') {
            executeResearch();
        }
    }, [appState, executeResearch]);

    const handleClarificationResponse = useCallback(async (history: ClarificationTurn[]) => {
      setClarificationLoading(true);
      try {
          const response = await clarifyQuery(history, mode, selectedFile);
          if (response.type === 'question') {
              setClarificationHistory(prev => [...prev, { role: 'model', content: response.content }]);
          } else if (response.type === 'summary') {
              setClarifiedContext(response.content);
              setAppState('researching');
          }
      } catch (error) {
          console.error("Clarification step failed:", error);
          const message = getCleanErrorMessage(error);
          addNotification({type: 'error', title: 'Clarification Failed', message});
          setAppState('idle');
      } finally {
          setClarificationLoading(false);
      }
    }, [mode, selectedFile, addNotification]);

    const startClarificationProcess = useCallback(() => {
        if (!query.trim() || appState !== 'idle') return;

        if (!apiKeyService.hasKey()) {
            addNotification({type: 'warning', title: 'API Key Required', message: 'Please set your Gemini API key in the settings before starting research.'});
            setIsSettingsOpen(true);
            return;
        }

        researchStartTimeRef.current = Date.now();
        setAppState('clarifying');
        const initialQuery = selectedFile ? `${query}\n\n[File attached: ${selectedFile.name}]` : query;
        const initialHistory: ClarificationTurn[] = [{ role: 'user', content: initialQuery }];
        setClarificationHistory(initialHistory);
        handleClarificationResponse(initialHistory);
    }, [query, appState, selectedFile, handleClarificationResponse, addNotification]);

    const handleAnswerSubmit = useCallback((answer: string) => {
        const newHistory: ClarificationTurn[] = [...clarificationHistory, { role: 'user', content: answer }];
        setClarificationHistory(newHistory);
        handleClarificationResponse(newHistory);
    }, [clarificationHistory, handleClarificationResponse]);
    
    const handleSkipClarification = useCallback(() => {
        if (appState !== 'clarifying') return;
        const contextForResearch = clarificationHistory.length > 1 
            ? `The user's initial query was "${query}". The following conversation was held to clarify: ${clarificationHistory.map(t => `${t.role}: ${t.content}`).join('\n')}`
            : query;
        setClarifiedContext(contextForResearch);
        setAppState('researching');
    }, [appState, clarificationHistory, query]);

    const handleVisualizeReport = useCallback(async (reportMarkdown: string) => {
        if (!reportMarkdown) return;
        setIsVisualizing(true);
        setVisualizedReportHtml(null);
        try {
            const html = await generateVisualReport(reportMarkdown, mode);
            setVisualizedReportHtml(html);
        } catch(error) {
            console.error("Failed to generate visual report:", error);
            const message = getCleanErrorMessage(error);
            addNotification({type: 'error', title: 'Visualization Failed', message});
        } finally {
            setIsVisualizing(false);
        }
    }, [mode, addNotification]);

    const handleContinueFromError = () => setAppState('researching');
    const handleGenerateReportFromError = () => handleGenerateFinalReport();
    const handleContinueFromCompletion = () => {
        setFinalData(null);
        setAppState('researching');
    };

    const handleCloseVisualizer = () => setVisualizedReportHtml(null);
    const handleStopResearch = () => {
        abortControllerRef.current?.abort();
        handleGenerateFinalReport();
    }

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
        setAppState('idle');
        setFinalData(null);
        setResearchUpdates([]);
        setAllCitations([]);
        setQuery('');
        setMode('Balanced');
        handleRemoveFile();
        setClarificationHistory([]);
        setClarifiedContext('');
        setClarificationLoading(false);
        setVisualizedReportHtml(null);
        setIsVisualizing(false);
        setIsSettingsOpen(false);
        setLastError(null);
        setCanContinueResearch(true);
        researchStartTimeRef.current = 0;
    }

    return {
        query, setQuery, selectedFile, researchUpdates, finalData, mode, setMode, appState,
        clarificationHistory, clarificationLoading, fileInputRef, startClarificationProcess, 
        handleAnswerSubmit, handleStopResearch, handleFileChange, handleRemoveFile, handleReset,
        isVisualizing, visualizedReportHtml, handleVisualizeReport, handleCloseVisualizer, handleSkipClarification,
        isSettingsOpen, setIsSettingsOpen, lastError, handleContinueFromError, handleGenerateReportFromError,
        canContinueResearch, handleContinueFromCompletion,
    };
};
