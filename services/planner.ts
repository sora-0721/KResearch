
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

const plannerTurnSchema = {
    type: 'object',
    properties: {
        thought: { type: 'string', description: 'Your reasoning and analysis for the chosen action.' },
        action: { type: 'string', enum: ['search', 'continue_debate', 'finish'] },
        queries: { type: 'array', items: { type: 'string' }, nullable: true, description: "1-4 search queries if action is 'search'." },
        finish_reason: { type: 'string', nullable: true, description: "Reason for finishing if action is 'finish'." }
    },
    required: ['thought', 'action'],
};

const MAX_DEBATE_TURNS = 6; // Maximum number of back-and-forth turns in a single planning phase.

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
    const searchHistoryText = researchHistory.filter(h => h.type === 'search').map(h => (Array.isArray(h.content) ? h.content : [h.content]).join(', ')).join('; ');
    const readHistoryText = researchHistory.filter(h => h.type === 'read').map(h => h.content).join('\n---\n');
    const searchCycles = researchHistory.filter(h => h.type === 'search').length;

    let currentConversation: { persona: AgentPersona; thought: string }[] = [];
    let nextPersona: AgentPersona = 'Alpha';
    let debateTurns = 0;

    while (debateTurns < MAX_DEBATE_TURNS) {
        checkSignal();
        debateTurns++;
        const conversationText = currentConversation.map(t => `${t.persona}: ${t.thought}`).join('\n');
        const isFirstTurn = conversationText === '';

        const prompt = `
            You are Agent ${nextPersona} (${nextPersona === 'Alpha' ? 'Strategist' : 'Tactician'}).
            Engage in a critical debate to decide the next research step. Your response must be a single JSON object matching the provided schema.

            **Overall Research Context:**
            *   User's Original Query: "${query}"
            *   Refined Research Goal (from user conversation): "${clarifiedContext}"
            *   Provided File: ${fileData ? fileData.name : 'None'}
            *   Total search cycles so far: ${searchCycles}.
            *   Previously Executed Searches: <searches>${searchHistoryText || 'None yet.'}</searches>
            *   Synthesized Learnings from Past Searches: <learnings>${readHistoryText || 'No learnings yet.'}</learnings>

            **Current Planning Conversation:**
            ${conversationText || 'You are Agent Alpha, starting the conversation. Propose the initial strategy.'}

            **Your Task & Rules:**
            1.  **Analyze All Context:** Critically analyze the refined goal, the learnings from past searches, the provided file content, and the ongoing debate.
            2.  **Avoid Redundancy:** Do NOT propose search queries that are identical or semantically very similar to queries already in <searches>. Your goal is to explore new avenues, deepen understanding, or challenge existing findings, not repeat work.
            3.  **Provide Your 'thought':** Articulate your reasoning for the chosen action in the 'thought' field.
            4.  **Choose ONE Action:** The 'action' field must be 'continue_debate', 'search', or 'finish'.
            5.  **Research Cycle Rules:**
                *   The 'finish' action is disabled until at least 7 search cycles are complete. (Current cycles: ${searchCycles}).
                *   You should aim to conclude the research between 7 and 17 cycles. Do not extend research unnecessarily.

            ${isFirstTurn ? `**Critical Rule for Agent Alpha (First Turn):** As this is the first turn of the debate, propose an initial strategy. Your action MUST be 'continue_debate'.` : ''}
        `;
        const parts: ({ text: string } | { inlineData: { mimeType: string; data: string; } })[] = [{ text: prompt }];
        if (fileData) {
            parts.push({ inlineData: { mimeType: fileData.mimeType, data: fileData.data } });
        }
        const response = await ai.models.generateContent({
            model: researchModeModels[mode].planner,
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
        
        if (effectiveAction === 'finish' && searchCycles < 7) {
             const thought = `Rule violation: Cannot finish before 7 search cycles. Forcing debate to continue.`;
             onUpdate({ id: idCounter.current++, type: 'thought' as const, persona: nextPersona, content: thought });
             effectiveAction = 'continue_debate';
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

    // If the while loop exits, it means MAX_DEBATE_TURNS was reached.
    onUpdate({ id: idCounter.current++, type: 'thought', content: 'Debate reached maximum turns without a decision. Forcing research to conclude.' });
    return { should_finish: true, search_queries: [], finish_reason: 'Planning debate timed out.' };
};
