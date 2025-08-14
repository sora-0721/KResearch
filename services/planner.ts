

import { ai } from './geminiClient';
import { getModel } from './models';
import { settingsService } from './settingsService';
import { parseJsonFromMarkdown, getCleanErrorMessage } from './utils';
import { ResearchUpdate, AgentPersona, ResearchMode, FileData, Role } from '../types';
import { getPlannerPrompt, plannerTurnSchema } from './plannerPrompt';
import { forceFormatPlannerResponse } from './formatter';

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

        let parsedResponse: PlannerTurn | null = null;
        let lastError: any = null;

        // Helper function to attempt a planning turn with a specific model
        const attemptPlanningWithModel = async (modelName: string) => {
            let retryCount = 0;
            const maxJsonRetries = 2;
            let lastRawResponseText = '';

            while (retryCount <= maxJsonRetries) {
                checkSignal();
                if (retryCount > 0) {
                    onUpdate({ id: idCounter.current++, type: 'thought', content: `Agent ${nextPersona} failed to respond with valid JSON using ${modelName}. Retrying... (Attempt ${retryCount}/${maxJsonRetries})` });
                    await new Promise(res => setTimeout(res, 1000 * retryCount));
                }

                try {
                    const response = await ai.models.generateContent({
                        model: modelName,
                        contents: { parts },
                        config: { 
                            responseMimeType: "application/json", 
                            temperature: Math.min(0.9, 0.7 + retryCount * 0.1),
                            responseSchema: plannerTurnSchema
                        }
                    });
                    
                    lastRawResponseText = response.text;
                    const tempParsed = parseJsonFromMarkdown(response.text) as PlannerTurn;
                    
                    if (tempParsed && tempParsed.thought && tempParsed.action) {
                        return tempParsed; // Success
                    } else {
                        console.warn(`[Planner] Invalid JSON from ${modelName} on attempt ${retryCount}:`, response.text);
                        retryCount++;
                    }
                } catch (error) {
                    console.error(`[Planner] API error with ${modelName}.`, error);
                    lastError = error;
                    return null; // Fatal API error for this model, break the inner loop
                }
            }
            
            // If all JSON retries fail, try to salvage
            if (lastRawResponseText) {
                onUpdate({ id: idCounter.current++, type: 'thought', content: `Agent ${nextPersona} failed all JSON retries with ${modelName}. Attempting to salvage...` });
                return await forceFormatPlannerResponse(lastRawResponseText);
            }

            return null; // Failed to get anything
        };

        // --- Main execution logic ---
        const primaryModel = getModel('planner', mode);
        onUpdate({ id: idCounter.current++, type: 'thought', content: `Agent ${nextPersona} planning with primary model (${primaryModel})...` });
        parsedResponse = await attemptPlanningWithModel(primaryModel);

        if (!parsedResponse) {
            const fallbackModel = 'gemini-2.5-flash'; // Hardcode a reliable fallback
            onUpdate({ id: idCounter.current++, type: 'thought', content: `Primary planner model failed. Switching to fallback (${fallbackModel}). Last error: ${getCleanErrorMessage(lastError)}` });
            parsedResponse = await attemptPlanningWithModel(fallbackModel);
        }

        if (!parsedResponse) {
            onUpdate({ id: idCounter.current++, type: 'thought', content: `Agent ${nextPersona} and fallback model failed. Finishing research.` });
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
        
        nextPersona = (nextPersona === 'Alpha') ? 'Beta' : 'Alpha';
    }

    onUpdate({ id: idCounter.current++, type: 'thought', content: 'Debate reached maximum turns without a decision. Forcing research to conclude.' });
    return { should_finish: true, search_queries: [], finish_reason: 'Planning debate timed out.' };
};