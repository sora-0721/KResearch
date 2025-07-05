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
            2.  **Progressive Deepening:** Your primary mission is to build a comprehensive and detailed report. Once a high-level topic is sufficiently established (e.g., the likelihood of a product's release and its general timeline), you MUST pivot to explore deeper, more granular details. Do not repeatedly re-verify the same high-level concepts. Instead, dive into specifics like:
                *   What are the rumored camera sensor models, their sizes, and aperture specs?
                *   What is the detailed display technology (e.g., resolution, LTPO version, peak brightness, manufacturer)?
                *   What are the specifics of the chipset architecture (e.g., core counts, clock speeds, manufacturing process)?
                *   What new materials, design changes, or color options are being discussed?
                *   What are the battery capacity, charging speed, and connectivity (e.g., Wi-Fi standard) specifications?
                *   What is the specific battery chemistry being used (e.g., NCM 811, LFP, silicon anode)? Who is the rumored battery cell supplier (e.g., CATL, LG Chem, Panasonic)?
                *   What is the exact battery pack capacity in kWh (e.g., 112 kWh usable)?
                *   Is it built on a 400V, 800V, or 900V+ electrical architecture?
                *   What is the peak DC fast charging rate in kW, and what is the charging curve (e.g., how long does it take to charge from 10-80%)?
                *   What are the specific models and power outputs (in hp or kW) of the front and rear electric motors? Are they permanent magnet, induction, or a hybrid?
                *   What is the vehicle's coefficient of drag (Cd)?
                *   What are the precise 0-60 mph times for different trim levels?
                *   What specific grade of aluminum or high-strength steel is used in the chassis? Is it a unibody or body-on-frame design?
                *   What is the suspension type (e.g., air suspension, multi-link, double wishbone)?
                *   What are the names of the paint color options and the specific interior materials (e.g., "Mojave Purluxe leather alternative," "Reclaimed Juniper wood trim")?
                *   What is the specific sensor suite for the ADAS (Advanced Driver-Assistance Systems)? (e.g., number of cameras, inclusion of LiDAR, type of radar).
                *   Who is the supplier for the central infotainment processor (e.g., Qualcomm Snapdragon, NVIDIA Orin)?
                *   What version of the infotainment OS will it launch with? Does it support Apple CarPlay or Android Auto?
                *   What is the specific architecture (e.g., Mixture-of-Experts (MoE), Transformer, a new hybrid design)?
                *   What is the rumored parameter count (e.g., 2.5 Trillion parameters)?
                *   How many experts are used in the MoE architecture? What is the context window length (e.g., 1M tokens)?    *   What is the composition of the training data (e.g., percentage of proprietary code, scientific papers, synthetic data)?
                *   What was the total training compute used, measured in FLOPs?
                *   What specific reinforcement learning or alignment technique is being used (e.g., PPO, DPO, constitutional AI)?
                *   What are its benchmark scores on specific academic tests (e.g., MMLU, GPQA, HumanEval)?
                *   What new modalities are being introduced (e.g., video understanding, 3D asset generation, direct robotic control)?
                *   What is its inference speed (tokens/second) on specific hardware like Google's own TPUs?
                *   What will the pricing structure be (e.g., per-token, per-character, subscription tiers)?
                *   Will there be different model sizes available through the API (e.g., a "Flash" and "Pro" version)?
                *   What are the specific rate limits or safety filters being implemented at the API level?
                *   What is the exact legal definition of "personal information" and "sensitive data" in the bill's text?
                *   What are the specific requirements for user consent (e.g., opt-in vs. opt-out for different data types)?
                *   Does the bill include a "private right of action," allowing individuals to sue companies directly for violations?
                *   Which federal agency is tasked with enforcement (e.g., the FTC, a new dedicated Data Protection Agency)?
                *   What is the precise structure for fines (e.g., "up to 4% of global annual revenue" or a fixed amount per violation)?
                *   What are the specific auditing and reporting requirements for companies?
                *   What are the revenue or data processing thresholds for a business to be subject to the law?
                *   Are there specific exemptions for small businesses, journalism, or non-profit organizations?
                *   How does the bill preempt or interact with existing state laws like the CCPA in California?
                *   What is the proposed date for the law to go into effect after being signed?
                *   Is there a grace period for companies to achieve compliance?
                *   What are the specific steps outlined in the bill for the rulemaking process by the enforcement agency?
            3.  **Avoid Redundancy:** Do NOT propose search queries that are identical or semantically very similar to queries already in <searches>. Your goal is to explore new, deeper avenues based on the "Progressive Deepening" rule, not repeat work.
            4.  **Provide Your 'thought':** Articulate your reasoning for the chosen action in the 'thought' field, explicitly referencing how your plan follows the "Progressive Deepening" principle.
            5.  **Choose ONE Action:** The 'action' field must be 'continue_debate', 'search', or 'finish'.
            6.  **Research Cycle Rules:**
                *   The 'finish' action is disabled until at least 3 search cycles are complete.
                *   You should aim to conclude the research between 5 and 15 cycles. Do not extend research unnecessarily.

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
        
        if (effectiveAction === 'finish' && searchCycles < 3) {
             const thought = `Rule violation: Cannot finish before 3 search cycles. Forcing debate to continue.`;
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