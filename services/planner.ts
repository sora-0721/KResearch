import { ai } from './geminiClient';
import { researchModeModels } from './models';
import { parseJsonFromMarkdown } from './utils';
import { ResearchUpdate, AgentPersona, ResearchMode, FileData } from '../types';

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
    fileData: FileData | null
): Promise<{ search_queries: string[], should_finish: boolean, finish_reason?: string }> => {
    const overallHistoryText = researchHistory.map(h => `${h.persona ? h.persona + ' ' : ''}${h.type}: ${Array.isArray(h.content) ? h.content.join(', ') : h.content}`).join('\n');
    const searchCycles = researchHistory.filter(h => h.type === 'search').length;
    let currentConversation: { persona: AgentPersona; thought: string }[] = [];
    let nextPersona: AgentPersona = 'Alpha';

    while (true) {
        checkSignal();
        const conversationText = currentConversation.map(t => `${t.persona}: ${t.thought}`).join('\n');
        const isFirstTurn = conversationText === '';

        const prompt = `
            You are Agent ${nextPersona} (${nextPersona === 'Alpha' ? 'Strategist' : 'Tactician'}).
            Engage in a critical debate to decide the next research step. The goal is to formulate the best possible search queries through collaboration.

            **Overall Research Context:**
            *   User's Original Query: "${query}"
            *   Refined Research Goal (from user conversation): "${clarifiedContext}"
            *   Provided File: ${fileData ? fileData.name : 'None'}
            *   Total search cycles so far: ${searchCycles}.
            *   Overall Research History: <history>${overallHistoryText || 'No history yet.'}</history>

            **Current Planning Conversation:**
            ${conversationText || 'You are Agent Alpha, starting the conversation. Propose the initial strategy.'}

            **Your Task & Rules:**
            1.  Critically analyze the research so far, the ongoing debate, and the content of the provided file (if any).
            2.  Provide your 'thought', addressing the other agent if they have spoken.
            3.  Choose ONE of the following actions:
                *   'continue_debate': To continue the discussion and refine the strategy. Let the other agent respond.
                *   'search': When you are confident in the next search queries. Provide 1-4 queries. This ends the current planning session.
                *   'finish': ONLY if you are certain the research is comprehensive enough to answer the user's query. You MUST provide a reason. You may only choose 'finish' if at least 3 search cycles have been completed. (Current cycles: ${searchCycles}).

            ${isFirstTurn ? `
            **Critical Rule for Agent Alpha (First Turn):** As this is the first turn of the debate, your role is to propose an initial strategy. Your action MUST be 'continue_debate'.
            ` : ''}

            ${searchCycles < 3 ? `**Note:** The 'finish' action is disabled until at least 3 search cycles are complete.` : ''}

            **RESPONSE FORMAT:**
            Your entire output MUST be a single JSON object.
        `;
        const parts: ({ text: string } | { inlineData: { mimeType: string; data: string; } })[] = [{ text: prompt }];
        if (fileData) {
            parts.push({ inlineData: { mimeType: fileData.mimeType, data: fileData.data } });
        }
        const response = await ai.models.generateContent({
            model: researchModeModels[mode].planner,
            contents: { parts },
            config: { responseMimeType: "application/json", temperature: 0.7 }
        });
        checkSignal();
        const parsedResponse = parseJsonFromMarkdown(response.text) as PlannerTurn;

        if (!parsedResponse || !parsedResponse.thought || !parsedResponse.action) {
            onUpdate({ id: idCounter.current++, type: 'thought', content: `Agent ${nextPersona} failed to respond. Finishing research.` });
            return { should_finish: true, search_queries: [], finish_reason: `Agent ${nextPersona} failed to generate a valid action.` };
        }
        onUpdate({ id: idCounter.current++, type: 'thought' as const, persona: nextPersona, content: parsedResponse.thought });
        currentConversation.push({ persona: nextPersona, thought: parsedResponse.thought });
        await new Promise(res => setTimeout(res, 400));
        checkSignal();

        if (parsedResponse.action === 'finish') {
            if (searchCycles < 3) {
                 const thought = `Rule violation: Cannot finish before 3 search cycles. Continuing debate. My previous thought was: ${parsedResponse.thought}`;
                 onUpdate({ id: idCounter.current++, type: 'thought' as const, persona: nextPersona, content: thought });
                 currentConversation.push({ persona: nextPersona, thought: thought });
                 nextPersona = (nextPersona === 'Alpha') ? 'Beta' : 'Alpha';
                 continue;
            }
            return { should_finish: true, search_queries: [], finish_reason: parsedResponse.finish_reason || `${nextPersona} decided to finish.` };
        }
        if (parsedResponse.action === 'search' && parsedResponse.queries && parsedResponse.queries.length > 0) {
            return { should_finish: false, search_queries: parsedResponse.queries };
        }
        nextPersona = (nextPersona === 'Alpha') ? 'Beta' : 'Alpha';
    }
};
