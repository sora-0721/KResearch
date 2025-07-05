import { useState, useEffect, useCallback, useRef } from 'react';
import { clarifyQuery, runIterativeDeepResearch, generateVisualReport } from '../services';
import { ResearchUpdate, FinalResearchData, ResearchMode, FileData, AppState, ClarificationTurn } from '../types';
import { apiKeyService } from '../services/apiKeyService';

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
    const [isVisualizing, setIsVisualizing] = useState<boolean>(false);
    const [visualizedReportHtml, setVisualizedReportHtml] = useState<string | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

    const abortControllerRef = useRef<AbortController | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
          alert(`An error occurred: ${error instanceof Error ? error.message : String(error)}`);
          setClarifiedContext('Clarification process failed. Proceeding with original query.');
          setAppState('researching');
      } finally {
          setClarificationLoading(false);
      }
    }, [mode, selectedFile]);

    const startResearch = useCallback(async (context: string) => {
      abortControllerRef.current = new AbortController();
      const startTime = Date.now();
      try {
        const result = await runIterativeDeepResearch(query, (update) => {
          setResearchUpdates(prev => [...prev, update]);
        }, abortControllerRef.current.signal, mode, context, selectedFile);
        setFinalData({ ...result, researchTimeMs: Date.now() - startTime });
      } catch (error: any) {
        const commonErrorData = { citations: [], researchTimeMs: Date.now() - startTime };
        if (error.name === 'AbortError') {
             setFinalData({ report: "The research process was cancelled.", ...commonErrorData });
        } else {
            console.error("Research failed:", error);
            alert(`An error occurred during research: ${error.message}`);
            setFinalData({ report: "An error occurred during the research process.", ...commonErrorData });
        }
      } finally {
        setAppState('complete');
      }
    }, [query, mode, selectedFile]);

    useEffect(() => {
      if (appState === 'researching' && clarifiedContext) {
          startResearch(clarifiedContext);
      }
    }, [appState, clarifiedContext, startResearch]);

    const startClarificationProcess = useCallback(() => {
        if (!query.trim() || appState !== 'idle') return;

        if (!apiKeyService.hasKey()) {
            setIsSettingsOpen(true);
            return;
        }

        setAppState('clarifying');
        const initialQuery = selectedFile ? `${query}\n\n[File attached: ${selectedFile.name}]` : query;
        const initialHistory: ClarificationTurn[] = [{ role: 'user', content: initialQuery }];
        setClarificationHistory(initialHistory);
        handleClarificationResponse(initialHistory);
    }, [query, appState, selectedFile, handleClarificationResponse]);

    const handleAnswerSubmit = useCallback((answer: string) => {
        const newHistory: ClarificationTurn[] = [...clarificationHistory, { role: 'user', content: answer }];
        setClarificationHistory(newHistory);
        handleClarificationResponse(newHistory);
    }, [clarificationHistory, handleClarificationResponse]);
    
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

    const handleVisualizeReport = useCallback(async (reportMarkdown: string) => {
        if (!reportMarkdown) return;
        setIsVisualizing(true);
        setVisualizedReportHtml(null);
        try {
            const html = await generateVisualReport(reportMarkdown, mode);
            setVisualizedReportHtml(html);
        } catch(error) {
            console.error("Failed to generate visual report:", error);
            alert("Sorry, the visual report could not be generated.");
        } finally {
            setIsVisualizing(false);
        }
    }, [mode]);

    const handleCloseVisualizer = () => setVisualizedReportHtml(null);
    const handleStopResearch = () => abortControllerRef.current?.abort();

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
        setQuery('');
        setMode('Balanced');
        handleRemoveFile();
        setClarificationHistory([]);
        setClarifiedContext('');
        setClarificationLoading(false);
        setVisualizedReportHtml(null);
        setIsVisualizing(false);
        setIsSettingsOpen(false);
    }

    return {
        query, setQuery, selectedFile, researchUpdates, finalData, mode, setMode, appState,
        clarificationHistory, clarificationLoading, fileInputRef, startClarificationProcess, 
        handleAnswerSubmit, handleStopResearch, handleFileChange, handleRemoveFile, handleReset,
        isVisualizing, visualizedReportHtml, handleVisualizeReport, handleCloseVisualizer, handleSkipClarification,
        isSettingsOpen, setIsSettingsOpen
    };
};