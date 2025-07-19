import { runDynamicConversationalPlanner } from './planner';
import { executeSingleSearch } from './search';
import { synthesizeReport } from './synthesis';
import { settingsService } from './settingsService';
import { ResearchUpdate, Citation, FinalResearchData, ResearchMode, FileData } from '../types';

export const runIterativeDeepResearch = async (
  query: string,
  onUpdate: (update: ResearchUpdate) => void,
  signal: AbortSignal,
  mode: ResearchMode,
  clarifiedContext: string,
  fileData: FileData | null,
  initialSearchResult: { text: string, citations: Citation[] } | null
): Promise<FinalResearchData> => {
  console.log(`Starting DYNAMIC CONVERSATIONAL research for: ${query}`);

  let history: ResearchUpdate[] = [];
  const idCounter = { current: 0 };
  let allCitations: Citation[] = [];
  
  if (initialSearchResult) {
      const searchUpdate = { id: idCounter.current++, type: 'search' as const, content: [query] };
      const readUpdate = { 
          id: idCounter.current++, 
          type: 'read' as const, 
          content: initialSearchResult.text, 
          source: initialSearchResult.citations.map(c => c.url) 
      };
      history.push(searchUpdate, readUpdate);
      allCitations.push(...initialSearchResult.citations);
  }

  const { maxCycles } = settingsService.getSettings().researchParams;
  
  const checkSignal = () => {
    if (signal.aborted) throw new DOMException('Research aborted by user.', 'AbortError');
  }

  const onPlannerUpdate = (update: ResearchUpdate) => {
    history.push(update);
    onUpdate(update);
  };

  while (true) {
    checkSignal();
    const searchCycles = history.filter(h => h.type === 'search').length;
    if (searchCycles >= maxCycles) {
        const finishUpdate = { id: idCounter.current++, type: 'thought' as const, content: `Maximum research cycles (${maxCycles}) reached. Forcing conclusion to synthesize report.` };
        history.push(finishUpdate);
        onUpdate(finishUpdate);
        break;
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    checkSignal();
    
    const plan = await runDynamicConversationalPlanner(query, history, onPlannerUpdate, checkSignal, idCounter, mode, clarifiedContext, fileData);
    
    checkSignal();

    if (plan.should_finish) {
        const finishReason = plan.finish_reason || 'Research concluded.';
        const finishUpdate = { id: idCounter.current++, type: 'thought' as const, content: `Finished research: ${finishReason}` };
        history.push(finishUpdate);
        onUpdate(finishUpdate);
        break;
    }

    const searchQueries = plan.search_queries;

    if (searchQueries && searchQueries.length > 0) {
      const searchUpdate = { id: idCounter.current++, type: 'search' as const, content: searchQueries, source: searchQueries.map(q => `https://www.google.com/search?q=${encodeURIComponent(q)}`) };
      history.push(searchUpdate);
      onUpdate(searchUpdate);
      
      checkSignal();

      const searchPromises = searchQueries.map(q => executeSingleSearch(q, mode));
      const searchResults = await Promise.all(searchPromises);
      checkSignal();
      
      const readContents = searchResults.map(r => r.text);
      const combinedCitations = searchResults.flatMap(r => r.citations);
      allCitations.push(...combinedCitations);
      
      const readUpdate = { 
        id: idCounter.current++, 
        type: 'read' as const, 
        content: readContents, 
        source: Array.from(new Set(combinedCitations.map(c => c.url))) 
      };
      history.push(readUpdate);
      onUpdate(readUpdate);
    } else if (!plan.should_finish) {
        const safetyBreakUpdate = { id: idCounter.current++, type: 'thought' as const, content: 'Planner did not provide a search action. Concluding research to synthesize report.' };
        history.push(safetyBreakUpdate);
        onUpdate(safetyBreakUpdate);
        break;
    }
  }

  const finalReportData = await synthesizeReport(query, history, allCitations, mode, fileData);
  const uniqueCitations = Array.from(new Map(allCitations.map(c => [c.url, c])).values());

  return { ...finalReportData, citations: uniqueCitations, researchTimeMs: 0 };
};