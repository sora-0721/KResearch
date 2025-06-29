
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

const clarificationModels: Record<ResearchMode, string> = {
    Balanced: 'gemini-2.5-flash',
    DeepDive: 'gemini-2.5-pro',
    Fast: 'gemini-2.5-flash',
    UltraFast: 'gemini-2.5-flash-lite-preview-06-17',
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

export interface ClarificationResponse {
    type: 'question' | 'summary';
    content: string;
}

export const clarifyQuery = async (
    history: { role: 'user' | 'model', content: string }[],
    mode: ResearchMode
): Promise<ClarificationResponse> => {
    const systemPrompt = `You are a helpful AI assistant. Your goal is to clarify a user's research request by asking a series of targeted questions.

Follow these rules:
1.  Engage in a conversation, asking one clarifying question at a time.
2.  Base each new question on the user's previous answers to narrow down their intent.
3.  Provide examples or options in your questions to guide the user. For example: "Are you interested in performance for gaming, video editing, or something else?"
4.  After asking at least 3-5 questions and you feel you have a very clear understanding of the user's goal, stop asking questions.
5.  When you stop asking questions, you MUST generate a concise, one-paragraph summary of the refined research goal. This summary will be passed to other AI agents.

Your entire output must be a single JSON object with one of two formats:
- If you are asking a question: \`{ "type": "question", "content": "Your question here..." }\`
- When you are finished and providing the summary: \`{ "type": "summary", "content": "Your final summary paragraph here..." }\`

Example flow:
User says: "Tell me about the M2 Ultra vs 4060"
Your first response would be: \`{ "type": "question", "content": "To give you the best comparison, what aspect are you most interested in? For example, are you focused on gaming performance, video editing capabilities, power efficiency, or something else?" }\`
User answers.
Your next response would be: \`{ "type": "question", "content": "Great, for gaming performance, are there any specific games or genres you're curious about? Or should I look for general benchmarks across a wide range of popular titles?" }\`
... after a few more turns ...
Your final response would be: \`{ "type": "summary", "content": "The user wants a detailed comparison between the M2 Ultra and the Nvidia 4060, with a primary focus on gaming performance. They are specifically interested in benchmarks and real-world frame rates for modern AAA titles like Cyberpunk 2077 and Alan Wake 2, and are less concerned with power consumption or video editing." }\`
`;
    
    const contents = history.map(turn => ({
        role: turn.role,
        parts: [{ text: turn.content }]
    }));

    const modelName = clarificationModels[mode];

    const response = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            temperature: 0.5
        }
    });

    const parsedResponse = parseJsonFromMarkdown(response.text) as ClarificationResponse;

    if (!parsedResponse || !parsedResponse.type || !parsedResponse.content) {
        console.error("Failed to parse clarification response:", response.text);
        return { type: 'summary', content: 'AI clarification failed. Proceeding with original query.' };
    }
    
    return parsedResponse;
};


const runDynamicConversationalPlanner = async (
    query: string,
    researchHistory: ResearchUpdate[],
    onUpdate: (update: ResearchUpdate) => void,
    checkSignal: () => void,
    idCounter: { current: number },
    mode: ResearchMode,
    clarifiedContext: string
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

const synthesizeReport = async (query: string, history: ResearchUpdate[], citations: Citation[], mode: ResearchMode): Promise<Omit<FinalResearchData, 'researchTimeMs'>> => {
    const learnings = history
        .filter(h => h.type === 'read')
        .map(h => h.content)
        .join('\n\n---\n\n');
    
    const historyText = history
        .map(h => `${h.persona ? h.persona + ' ' : ''}${h.type}: ${Array.isArray(h.content) ? h.content.join(' | ') : h.content}`)
        .join('\n');

    const initialReportPrompt = `You are an expert Senior Research Analyst and Strategist, specializing in synthesizing complex information into clear, insightful, and decision-ready reports for executive-level stakeholders.

Your mission is to transform the provided raw research materials into a polished and comprehensive final report that not only answers the user's request but also provides strategic context and actionable insights.

**User's Core Request:**
<REQUIREMENT>
${query}
</REQUIREMENT>

**Synthesized Research Learnings (Primary Source for the Report):**
<LEARNINGS>
${learnings || "No specific content was read during research. Base the report on the thought process."}
</LEARNINGS>

**Full Research History (For Context and Nuance Only):**
<HISTORY>
${historyText}
</HISTORY>

**--- INSTRUCTIONS ---**

**1. Report Structure & Content:**
Adhere to the following professional report structure. Each section should be clearly delineated.

*   **Title:** Create a concise and descriptive title for the report.
*   **Executive Summary:** Begin with a brief, high-level overview. This section is for busy executives and should summarize the core request, the most critical findings, and the key recommendations in a few paragraphs or bullet points.
*   **Introduction:** State the original request and the objective of the report. Briefly outline the report's scope and methodology (i.e., synthesis of the provided research learnings).
*   **Detailed Analysis / Key Findings:** This is the main body of the report.
    *   Synthesize the information from the \`<LEARNINGS>\` block into a thorough and coherent analysis.
    *   Organize findings thematically using clear headings and subheadings.
    *   Directly address all parts of the user's \`<REQUIREMENT>\`.
*   **Strategic Recommendations / Implications:** Go beyond summarizing. Based *only* on the findings, provide actionable recommendations, outline potential strategic implications, or identify opportunities and risks.
*   **Conclusion:** Provide a concise final summary of the report's findings and their significance.

**2. Tone and Style:**
*   Maintain a professional, objective, and analytical tone.
*   The report's content must be based **exclusively** on the information within the \`<LEARNINGS>\` block. Use the \`<HISTORY>\` block for contextual understanding only, not as a source for new facts.
*   Do NOT include inline citations (e.g., [1], [source.com]) or invent sources.

**3. Data Visualization and Formatting:**
Enhance readability and impact by incorporating visual elements where appropriate.

*   **Markdown Tables:** Use tables to present structured data, comparisons (e.g., pros/cons, feature comparisons), or quantitative information in a clear and organized manner.
*   **Mermaid Charts:** Use Mermaid syntax (within a \`\`\`mermaid ... \`\`\` code block) to create diagrams and charts. This is crucial for visualizing processes, relationships, and distributions.
    *   Use \`graph TD\` or \`flowchart TD\` for processes and flowcharts.
    *   Use \`pieChart\` for market share, budget allocations, or other proportional data.
    *   Use \`gantt\` for project timelines or roadmaps.
    *   Use \`mindmap\` to illustrate complex relationships or brainstorming sessions.
*   **Rich Text Formatting:** Use **bold text** for emphasis on key terms and conclusions, *italics* for nuance, and nested bullet points and blockquotes (\`>\`) to structure information effectively.

**4. Final Output:**
Respond ONLY with the raw markdown content of the final report. Do not include any preamble (e.g., "Here is the report you requested"), commentary, or post-report summaries. The output should begin directly with the report's title.
`;

    const reportResponse = await ai.models.generateContent({
        model: researchModeModels[mode].synthesizer,
        contents: initialReportPrompt,
        config: { temperature: 0.5 }
    });
    
    const reportText = reportResponse.text.trim();
    if (!reportText) {
        return { report: "Failed to generate an initial report.", citations: [] };
    }

    return {
        report: reportText,
        citations: [],
    };
};

export const runIterativeDeepResearch = async (
  query: string,
  onUpdate: (update: ResearchUpdate) => void,
  signal: AbortSignal,
  mode: ResearchMode,
  clarifiedContext: string
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
    
    const plan = await runDynamicConversationalPlanner(query, history, onPlannerUpdate, checkSignal, idCounter, mode, clarifiedContext);
    
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

  return { ...finalReportData, citations: uniqueCitations, researchTimeMs: 0 };
};
