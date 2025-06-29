
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ResearchUpdate, FinalResearchData, Citation, AgentPersona, ResearchMode } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

type ModelSet = {
    planner: string;
    searcher: string;
    synthesizer: string;
};

const researchModeModels: Record<ResearchMode, ModelSet> = {
    Balanced: {
        planner: 'gemini-2.5-pro',
        searcher: 'gemini-2.5-flash-lite-preview-06-17',
        synthesizer: 'gemini-2.5-flash'
    },
    DeepDive: {
        planner: 'gemini-2.5-pro',
        searcher: 'gemini-2.5-pro',
        synthesizer: 'gemini-2.5-pro'
    },
    Fast: {
        planner: 'gemini-2.5-flash',
        searcher: 'gemini-2.5-flash',
        synthesizer: 'gemini-2.5-flash'
    },
    UltraFast: {
        planner: 'gemini-2.5-flash-lite-preview-06-17',
        searcher: 'gemini-2.5-flash-lite-preview-06-17',
        synthesizer: 'gemini-2.5-flash-lite-preview-06-17'
    }
};


const parseJsonFromMarkdown = (text: string): any => {
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = text.match(fenceRegex);
    const jsonStr = match ? match[2].trim() : text.trim();
    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("Failed to parse JSON response:", e, "Raw text:", text);
        try {
            const openBrace = jsonStr.indexOf('{');
            const closeBrace = jsonStr.lastIndexOf('}');
            if (openBrace !== -1 && closeBrace > openBrace) {
                return JSON.parse(jsonStr.substring(openBrace, closeBrace + 1));
            }
        } catch (lenientError) {
             console.error("Lenient JSON parse also failed:", lenientError);
        }
        return null;
    }
};

interface PlannerTurn {
    thought: string;
    action: 'search' | 'continue_debate' | 'finish';
    queries?: string[] | null;
    finish_reason?: string | null;
}

const runDynamicConversationalPlanner = async (
    query: string,
    researchHistory: ResearchUpdate[],
    onUpdate: (update: ResearchUpdate) => void,
    checkSignal: () => void,
    idCounter: { current: number },
    mode: ResearchMode
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
            *   User Query: "${query}"
            *   Total search cycles so far: ${searchCycles}.
            *   Overall Research History: <history>${overallHistoryText || 'No history yet.'}</history>

            **Current Planning Conversation:**
            ${conversationText || 'You are Agent Alpha, starting the conversation. Propose the initial strategy.'}

            **Your Task & Rules:**
            1.  Critically analyze the research so far and the ongoing debate.
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

            Example (Continue Debate):
            {
              "thought": "I think we should start by verifying the existence of this product. The naming seems unusual.",
              "action": "continue_debate",
              "queries": null
            }
            
            Example (Search):
            {
              "thought": "Okay, I agree. Let's refine the queries to be more specific. I will search for the technical specs and target market.",
              "action": "search",
              "queries": ["product X detailed specs", "product X target market analysis"]
            }
        `;

        const response = await ai.models.generateContent({
            model: researchModeModels[mode].planner,
            contents: prompt,
            config: { responseMimeType: "application/json", temperature: 0.7 }
        });
        checkSignal();
        
        const parsedResponse = parseJsonFromMarkdown(response.text) as PlannerTurn;

        if (!parsedResponse || !parsedResponse.thought || !parsedResponse.action) {
            onUpdate({ id: idCounter.current++, type: 'thought', content: `Agent ${nextPersona} failed to respond. Finishing research.` });
            return { should_finish: true, search_queries: [], finish_reason: `Agent ${nextPersona} failed to generate a valid action.` };
        }

        const update = { id: idCounter.current++, type: 'thought' as const, persona: nextPersona, content: parsedResponse.thought };
        onUpdate(update);
        
        currentConversation.push({ persona: nextPersona, thought: parsedResponse.thought });

        await new Promise(res => setTimeout(res, 400));
        checkSignal();

        if (parsedResponse.action === 'finish') {
            if (searchCycles < 3) {
                 const thought = `Rule violation: Cannot finish before 3 search cycles. Continuing debate. My previous thought was: ${parsedResponse.thought}`;
                 const ruleViolationUpdate = { id: idCounter.current++, type: 'thought' as const, persona: nextPersona, content: thought };
                 onUpdate(ruleViolationUpdate);
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


const executeSingleSearch = async (searchQuery: string, mode: ResearchMode): Promise<{ text: string, citations: Citation[] }> => {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: researchModeModels[mode].searcher,
        contents: `Concisely summarize key information for the query: "${searchQuery}"`,
        config: { tools: [{ googleSearch: {} }] },
    });

    const groundingMetadata = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const citations: Citation[] = groundingMetadata
        ? groundingMetadata.map((chunk: any) => ({
              url: chunk.web.uri,
              title: chunk.web.title || chunk.web.uri,
          }))
        : [];
    
    const uniqueCitations = Array.from(new Map(citations.map(c => [c.url, c])).values());
    return { text: `Summary for "${searchQuery}": ${response.text}`, citations: uniqueCitations };
};

const synthesizeReport = async (query: string, history: ResearchUpdate[], citations: Citation[], mode: ResearchMode): Promise<FinalResearchData> => {
    const learnings = history
        .filter(h => h.type === 'read')
        .map(h => h.content)
        .join('\n\n---\n\n');
    
    const historyText = history
        .map(h => `${h.persona ? h.persona + ' ' : ''}${h.type}: ${Array.isArray(h.content) ? h.content.join(' | ') : h.content}`)
        .join('\n');
    
    const sourcesText = citations.map(c => `- ${c.title}: ${c.url}`).join('\n');

    // Step 1: Generate initial detailed report
    const initialReportPrompt = `
        You are an expert research analyst. Your task is to write a comprehensive, well-structured final report based on the provided research materials.

        **User's Core Request:**
        <REQUIREMENT>
        ${query}
        </REQUIREMENT>

        **Research Learnings (Base your report on this information):**
        <LEARNINGS>
        ${learnings || "No specific content was read during research. Base the report on the thought process."}
        </LEARNINGS>

        **Full Research History (For context on the research path):**
        <HISTORY>
        ${historyText}
        </HISTORY>

        **Instructions:**
        1. Synthesize the learnings into a detailed report. Aim for depth and comprehensiveness.
        2. Structure the report logically using markdown (headings, lists, bold text).
        3. Ensure the report directly addresses the user's core request.
        4. The report must be exclusively based on the provided research learnings.
        5. Do NOT include inline citations like [1] or [source.com].

        **Respond ONLY with the raw markdown content of the final report. Do not include any extra text, commentary, or wrappers.**
    `;

    const initialReportResponse = await ai.models.generateContent({
        model: researchModeModels[mode].synthesizer,
        contents: initialReportPrompt,
        config: { temperature: 0.5 }
    });
    
    const initialReportText = initialReportResponse.text.trim();
    if (!initialReportText) {
        return { report: "Failed to generate an initial report.", citations: [], researchTimeMs: 0 };
    }

    // Step 2: Make the report longer
    const makeLongerPrompt = `
        You are tasked with re-writing the following text to be longer and more detailed, expanding on the concepts presented. Do not change the core meaning or narrative of the text. Add more explanatory sentences, provide deeper context, and flesh out the existing points to create a more comprehensive version.

        **Original Text:**
        ---
        ${initialReportText}
        ---

        **Respond only with the updated, longer markdown text. Do not add any commentary before or after.**
    `;

    const longerReportResponse = await ai.models.generateContent({
        model: researchModeModels[mode].synthesizer,
        contents: makeLongerPrompt,
        config: { temperature: 0.6 }
    });
    
    const finalReportText = longerReportResponse.text.trim() || initialReportText;

    // Step 3: Generate Mermaid Graph from the final report
    const mermaidPrompt = `
        Based on the following article, extract the key entities (e.g., people, places, organizations, concepts) and their main relationships. Then, generate Mermaid graph code to visualize these connections.

        **Article:**
        ---
        ${finalReportText}
        ---

        ## Output format requirements
        1. Use Mermaid's \`graph TD\` (Top-Down) type.
        2. Create a unique node ID for each entity (e.g., \`PersonA\`, \`OrgB\`). Display the entity's name in the node shape (e.g., \`PersonA["Alice"]\`, \`OrgB["XYZ Company"]\`).
        3. Represent relationships as arrows with labels describing the connection (e.g., \`A -->|"Works for"| B\`).
        4. Focus on the most core entities and their most important relationships for a concise graph.
        5. **Strict Requirement:** All text for node and edge labels MUST be wrapped in double quotes (e.g., \`Node["Label"]\`, \`A -->|"Relationship"| B\`).
        6. **Respond ONLY with the complete Mermaid code block (starting with \`\`\`mermaid\` and ending with \`\`\`). Do not include any other text.**
    `;

    const mermaidResponse = await ai.models.generateContent({
        model: researchModeModels[mode].synthesizer,
        contents: mermaidPrompt,
        config: { temperature: 0.2 }
    });

    let mermaidGraphCode = mermaidResponse.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = mermaidGraphCode.match(fenceRegex);
    if (match && match[2]) {
        mermaidGraphCode = `graph TD\n${match[2].trim()}`;
    } else if (!mermaidGraphCode.trim().startsWith('graph')) {
        mermaidGraphCode = '';
    }

    return {
        report: finalReportText,
        citations: [],
        researchTimeMs: 0,
        mermaidGraph: mermaidGraphCode || undefined,
    };
};

export const runIterativeDeepResearch = async (
  query: string,
  onUpdate: (update: ResearchUpdate) => void,
  signal: AbortSignal,
  mode: ResearchMode
): Promise<FinalResearchData> => {
  console.log(`Starting DYNAMIC CONVERSATIONAL research for: ${query}`);

  let history: ResearchUpdate[] = [];
  const idCounter = { current: 0 };
  let allCitations: Citation[] = [];
  
  const checkSignal = () => {
    if (signal.aborted) throw new DOMException('Research aborted by user.', 'AbortError');
  }

  const onPlannerUpdate = (update: ResearchUpdate) => {
    history.push(update);
    onUpdate(update);
  };

  while (true) {
    checkSignal();
    await new Promise(resolve => setTimeout(resolve, 1000));
    checkSignal();
    
    const plan = await runDynamicConversationalPlanner(query, history, onPlannerUpdate, checkSignal, idCounter, mode);
    
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
      
      const combinedText = searchResults.map(r => r.text).join('\n\n');
      const combinedCitations = searchResults.flatMap(r => r.citations);
      allCitations.push(...combinedCitations);
      
      const readUpdate = { id: idCounter.current++, type: 'read' as const, content: combinedText, source: Array.from(new Set(combinedCitations.map(c => c.url))) };
      history.push(readUpdate);
      onUpdate(readUpdate);
    } else if (!plan.should_finish) {
        const safetyBreakUpdate = { id: idCounter.current++, type: 'thought' as const, content: 'Planner did not provide a search action. Concluding research to synthesize report.' };
        history.push(safetyBreakUpdate);
        onUpdate(safetyBreakUpdate);
        break;
    }
  }

  const finalReportData = await synthesizeReport(query, history, allCitations, mode);
  const uniqueCitations = Array.from(new Map(allCitations.map(c => [c.url, c])).values());

  return { ...finalReportData, citations: uniqueCitations };
};
