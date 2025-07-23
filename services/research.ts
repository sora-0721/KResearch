import { runDynamicConversationalPlanner } from './planner';
import { executeSingleSearch } from './search';
import { synthesizeReport } from './synthesis';
import { settingsService } from './settingsService';
import { ResearchUpdate, Citation, FinalResearchData, ResearchMode, FileData } from '../types';
import { generateOutline } from './outline';

export const runIterativeDeepResearch = async (
  query: string,
  onUpdate: (update: ResearchUpdate) => void,
  signal: AbortSignal,
  mode: ResearchMode,
  clarifiedContext: string,
  fileData: FileData | null,
  initialSearchResult: { text: string, citations: Citation[] } | null,
  existingHistory: ResearchUpdate[]
): Promise<Omit<FinalResearchData, 'researchTimeMs'>> => {
  console.log(`Starting/Continuing DYNAMIC CONVERSATIONAL research for: ${query}`);

  let history: ResearchUpdate[] = [...existingHistory];
  const idCounter = { current: existingHistory.length };
  let allCitations: Citation[] = [];
  
  if (initialSearchResult) {
      allCitations.push(...initialSearchResult.citations);
  }
  existingHistory.forEach(update => {
      if (update.type === 'read' && Array.isArray(update.source)) {
          update.source.forEach(url => {
              if (!allCitations.some(c => c.url === url)) {
                  allCitations.push({ url, title: url });
              }
          });
      }
  });

  const { maxCycles } = settingsService.getSettings().researchParams;
  let internalSearchCycles = 0;
  
  const checkSignal = () => {
    if (signal.aborted) throw new DOMException('Research aborted by user.', 'AbortError');
  }

  const onPlannerUpdate = (update: ResearchUpdate) => {
    history.push(update);
    onUpdate(update);
  };

  while (true) {
    checkSignal();
    const totalSearchUpdates = history.filter(h => h.type === 'search').length;
    // The initial search happens before this loop. It shouldn't count towards the max cycle limit.
    internalSearchCycles = initialSearchResult ? Math.max(0, totalSearchUpdates - 1) : totalSearchUpdates;

    if (internalSearchCycles >= maxCycles) {
        const finishUpdate = { id: idCounter.current++, type: 'thought' as const, content: `Maximum research cycles (${maxCycles}) reached. Forcing conclusion to synthesize report.` };
        history.push(finishUpdate);
        onUpdate(finishUpdate);
        break;
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    checkSignal();
    
    // The planner needs the *total* number of searches to make decisions about minCycles.
    const plan = await runDynamicConversationalPlanner(query, history, onPlannerUpdate, checkSignal, idCounter, mode, clarifiedContext, fileData, totalSearchUpdates);
    
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
  
  checkSignal();
  const outlineUpdate = { id: idCounter.current++, type: 'outline' as const, content: 'Generating report outline...' };
  history.push(outlineUpdate);
  onUpdate(outlineUpdate);
  const reportOutline = await generateOutline(query, history, mode, fileData);
  
  checkSignal();
  const finalReportData = await synthesizeReport(query, history, allCitations, mode, fileData, reportOutline);
  const uniqueCitations = Array.from(new Map(allCitations.map(c => [c.url, c])).values());

  return { 
    ...finalReportData, 
    citations: uniqueCitations,
    researchUpdates: history,
    searchCycles: internalSearchCycles
  };
};