
import { ai } from './geminiClient';
import { getModel } from './models';
import { settingsService } from './settingsService';
import { parseJsonFromMarkdown } from './utils';
import { ResearchUpdate, AgentPersona, ResearchMode, FileData, Role } from '../types';
import { getPlannerPrompt, plannerTurnSchema } from './plannerPrompt';

interface PlannerTurn {
    thought: string;
    action: 'search' | 'continue_debate' | 'finish';
    queries?: string[] | null;
    finish_reason?: string | null;
}

export const runDynamicConversationalPlanner = async (
    query: string,
    researchHistory: ResearchUpdate[],
    onUpdate: (update: ResearchUpdate) => void,
    checkSignal: () => void,
    idCounter: { current: number },
    mode: ResearchMode,
    clarifiedContext: string,
    fileData: FileData | null,
    role: Role | null,
    searchCycles: number
): Promise<{ search_queries: string[], should_finish: boolean, finish_reason?: string }> => {
    const { minCycles, maxDebateRounds, maxCycles } = settingsService.getSettings().researchParams;

    const searchHistoryText = researchHistory.filter(h => h.type === 'search').map(h => (Array.isArray(h.content) ? h.content : [h.content]).join(', ')).join('; ');
    const readHistoryText = researchHistory.filter(h => h.type === 'read').map(h => h.content).join('\n---\n');
    
    const currentConversation: { persona: AgentPersona; thought: string }[] = [];
    let lastPersona: AgentPersona | undefined;

    // Reconstruct conversation from the tail of the history log
    for (let i = researchHistory.length - 1; i >= 0; i--) {
        const update = researchHistory[i];
        if (update.type === 'thought' && update.persona) {
            currentConversation.unshift({ persona: update.persona, thought: String(update.content) });
            if (!lastPersona) {
                lastPersona = update.persona;
            }
        } else {
            // Stop when we hit a non-thought update (e.g., 'read', 'search')
            break;
        }
    }
    
    let nextPersona: AgentPersona = lastPersona === 'Alpha' ? 'Beta' : 'Alpha';
    let debateTurns = currentConversation.length;
    let consecutiveFinishAttempts = 0;

    while (debateTurns < maxDebateRounds) {
        checkSignal();
        debateTurns++;
        
        const isFirstTurn = currentConversation.length === 0;

        const prompt = getPlannerPrompt({
            nextPersona,
            query,
            clarifiedContext,
            fileDataName: fileData ? fileData.name : null,
            role,
            searchCycles,
            searchHistoryText,
            readHistoryText,
            conversationText: currentConversation.map(t => `${t.persona}: ${t.thought}`).join('\n'),
            minCycles,
            maxCycles,
            isFirstTurn,
        });
        
        const parts: ({ text: string } | { inlineData: { mimeType: string; data: string; } })[] = [{ text: prompt }];
        if (fileData) {
            parts.push({ inlineData: { mimeType: fileData.mimeType, data: fileData.data } });
        }
        if (role?.file) {
            parts.push({ inlineData: { mimeType: role.file.mimeType, data: role.file.data } });
        }

        const response = await ai.models.generateContent({
            model: getModel('planner', mode),
            contents: { parts },
            config: { 
                responseMimeType: "application/json", 
                temperature: 0.7,
                responseSchema: plannerTurnSchema
            }
        });
        checkSignal();
        const parsedResponse = parseJsonFromMarkdown(response.text) as PlannerTurn;

        if (!parsedResponse || !parsedResponse.thought || !parsedResponse.action) {
            onUpdate({ id: idCounter.current++, type: 'thought', content: `Agent ${nextPersona} failed to respond with valid JSON. Finishing research.` });
            return { should_finish: true, search_queries: [], finish_reason: `Agent ${nextPersona} failed to generate a valid action.` };
        }
        onUpdate({ id: idCounter.current++, type: 'thought' as const, persona: nextPersona, content: parsedResponse.thought });
        currentConversation.push({ persona: nextPersona, thought: parsedResponse.thought });
        await new Promise(res => setTimeout(res, 400));
        checkSignal();

        let effectiveAction = parsedResponse.action;
        
        if (effectiveAction === 'finish') {
            consecutiveFinishAttempts++;
        } else {
            consecutiveFinishAttempts = 0;
        }
        
        if (effectiveAction === 'finish' && searchCycles < minCycles) {
             if (consecutiveFinishAttempts >= 2) {
                const thought = `Agent consensus to finish has been detected. Overriding the minimum cycle rule to conclude research.`;
                onUpdate({ id: idCounter.current++, type: 'thought' as const, content: thought });
                // Let the action proceed as 'finish' by not changing it
             } else {
                const thought = `Rule violation: Cannot finish before ${minCycles} search cycles. Forcing debate to continue.`;
                onUpdate({ id: idCounter.current++, type: 'thought' as const, persona: nextPersona, content: thought });
                effectiveAction = 'continue_debate';
             }
        }

        if (effectiveAction === 'finish') {
            return { should_finish: true, search_queries: [], finish_reason: parsedResponse.finish_reason || `${nextPersona} decided to finish.` };
        }
        
        if (effectiveAction === 'search' && parsedResponse.queries && parsedResponse.queries.length > 0) {
            return { should_finish: false, search_queries: parsedResponse.queries };
        }
        
        // if we reach here, action is 'continue_debate'
        nextPersona = (nextPersona === 'Alpha') ? 'Beta' : 'Alpha';
    }

    // If the while loop exits, it means maxDebateRounds was reached.
    onUpdate({ id: idCounter.current++, type: 'thought', content: 'Debate reached maximum turns without a decision. Forcing research to conclude.' });
    return { should_finish: true, search_queries: [], finish_reason: 'Planning debate timed out.' };
};
