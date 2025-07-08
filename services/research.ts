import { runDynamicConversationalPlanner } from './planner';
import { executeSingleSearch } from './search';
import { settingsService } from './settingsService';
import { ResearchUpdate, Citation, ResearchMode, FileData } from '../types';

interface ResearchResult {
  report: string; // This will be empty as synthesis is moved out
  citations: Citation[];
  canContinue: boolean;
}

export const runIterativeDeepResearch = async (
  query: string,
  onUpdate: (update: ResearchUpdate) => void,
  onNewCitations: (citations: Citation[]) => void,
  signal: AbortSignal,
  mode: ResearchMode,
  clarifiedContext: string,
  fileData: FileData | null,
  initialHistory: ResearchUpdate[] = []
): Promise<ResearchResult> => {
  console.log(`Starting/Continuing research for: ${query}`);

  let history: ResearchUpdate[] = [...initialHistory];
  const idCounter = { current: initialHistory.length };
  const { maxCycles } = settingsService.getSettings().researchParams;
  
  const checkSignal = () => {
    if (signal.aborted) throw new DOMException('Research aborted by user.', 'AbortError');
  }

  while (true) {
    checkSignal();
    const searchCycles = history.filter(h => h.type === 'search').length;
    if (searchCycles >= maxCycles) {
        const finishUpdate = { id: idCounter.current++, type: 'thought' as const, content: `Maximum research cycles (${maxCycles}) reached. Concluding to synthesize report.` };
        history.push(finishUpdate);
        onUpdate(finishUpdate);
        return { report: '', citations: [], canContinue: true }; // Can continue if they raise the limit
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    checkSignal();
    
    const plan = await runDynamicConversationalPlanner(query, history, onUpdate, checkSignal, idCounter, mode, clarifiedContext, fileData);
    checkSignal();

    if (plan.should_finish) {
        const finishReason = plan.finish_reason || 'Research concluded.';
        const finishUpdate = { id: idCounter.current++, type: 'thought' as const, content: `Finished research: ${finishReason}` };
        history.push(finishUpdate);
        onUpdate(finishUpdate);
        // If the planner explicitly finishes, we cannot continue.
        return { report: '', citations: [], canContinue: false };
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
      
      const combinedText = searchResults.map(r => r.text).join('\n\n');
      const combinedCitations = searchResults.flatMap(r => r.citations);
      onNewCitations(combinedCitations);
      
      const readUpdate = { id: idCounter.current++, type: 'read' as const, content: combinedText, source: Array.from(new Set(combinedCitations.map(c => c.url))) };
      history.push(readUpdate);
      onUpdate(readUpdate);
    } else if (!plan.should_finish) {
        const safetyBreakUpdate = { id: idCounter.current++, type: 'thought' as const, content: 'Planner did not provide a search action. Concluding research to synthesize report.' };
        history.push(safetyBreakUpdate);
        onUpdate(safetyBreakUpdate);
        return { report: '', citations: [], canContinue: true };
    }
  }
};
