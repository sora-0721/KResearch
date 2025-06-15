
import { Source, GroundingChunk, ExecutedStepOutcome, ResearchMode, GeminiResponseForSearch, ProposedActionDetails } from '../../types';
import { getModelNameForMode, MAX_CONTEXT_TOKENS_APPROX } from './constants'; 
import { geminiApiCallWithRetry, parseJsonFromString, summarizeHistoryForContext } from './utils';
import { GenerateContentResponse } from '@google/genai';


const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY missing in executionService.ts");
}

const EXPERT_DECISION_MAKER_SYSTEM_PROMPT = "You are an expert researcher making critical decisions for the next research step. Be highly analytical, prioritize novelty and information gain, and justify your choices with clear, concise reasoning. Accuracy and thoroughness are paramount. Consider the overall research strategy and previous findings to avoid redundancy and ensure comprehensive coverage.";


export const decideNextResearchAction = async (
  topic: string,
  strategy: string, // This is the "report plan" or "research plan"
  executedSteps: ExecutedStepOutcome[],
  iteration: number,
  maxIterations: number,
  researchMode: ResearchMode
): Promise<ProposedActionDetails> => {
  if (!API_KEY) throw new Error("API Key not configured.");
  const modelName = getModelNameForMode(researchMode);
  const historySummary = summarizeHistoryForContext(executedSteps, MAX_CONTEXT_TOKENS_APPROX);
  const iterationLimitNote = `Current Iteration: ${iteration} of ${maxIterations}. Research Mode: '${researchMode}'. Target Model: ${modelName}.`;

  // Constructing the "PLAN" and "LEARNINGS" structure from Prompt 6
  const researchPlan = strategy;
  const previousLearnings = historySummary || "No actions have been executed yet. This is the first action to be decided.";

  const prompt = `
Research Topic: "${topic}"

Overall Research Plan (Strategy):
<PLAN>
${researchPlan}
</PLAN>

Summary of Previous Research Actions & Findings (Learnings):
<LEARNINGS>
${previousLearnings}
</LEARNINGS>

Contextual Information:
${iterationLimitNote}

Task:
Based on the Research Plan and Previous Learnings, decide the single most logical and impactful next research action. This action will typically be a specific Google Search query, but could be a question if direct factual lookup isn't appropriate. The goal is to progressively build a comprehensive understanding of the topic, adhering to the research plan.

CRITICAL Considerations for Action Decision:
1.  **Novelty and Non-Redundancy:** The proposed action MUST seek new information or explore new facets of the topic. Analyze past actions and findings carefully. Do NOT propose actions that are semantically similar to or slight variations of previous actions if those actions yielded relevant information. Explicitly state in your reasoning how this action differs from previous ones or targets a new area.
2.  **Adherence to Plan:** The action should align with the overall Research Plan, addressing one of its key areas or objectives.
3.  **Information Value:** Prioritize actions that are likely to yield significant, insightful, or foundational information.
4.  **Specificity:** Formulate a clear and specific query. Ambiguous queries lead to poor results.

Output Requirements:
Respond with ONLY a JSON object containing the following fields:
-   "action": (string) The specific research query or question for the next step.
-   "reason": (string) A brief (1-2 sentences) justification for this action. This reasoning MUST clearly articulate why this action is the logical next step, emphasizing its novelty, its connection to the research plan, and what new information it aims to uncover compared to previous steps.
-   "shouldStop": (boolean) Set to true if you strongly believe that sufficient information has been gathered to address the core research topic and plan, OR if further iterations are highly unlikely to yield significant new insights, OR if the iteration limit is being approached and broad coverage has been achieved. Otherwise, set to false. (Be conservative with \`shouldStop: true\` in early iterations unless the topic is extremely narrow or the plan is fully covered).

Example JSON Output:
{
  "action": "What are the latest breakthroughs in quantum sensor technology specifically for environmental monitoring since 2023?",
  "reason": "This action targets a new sub-area (quantum sensors for environment) within the broader topic of quantum tech, focusing on very recent developments (post-2023) not covered by previous general queries on quantum computing. It aligns with the plan's objective to explore practical applications.",
  "shouldStop": false
}`;
  try {
    const response = await geminiApiCallWithRetry({ 
        model: modelName, 
        contents: prompt, 
        config: { 
            responseMimeType: "application/json",
            systemInstruction: EXPERT_DECISION_MAKER_SYSTEM_PROMPT
        } 
    });
    const decision = parseJsonFromString<ProposedActionDetails>(response.text, response.text);
    
    if (decision && typeof decision.action === 'string' && decision.action.trim() !== '' &&
        typeof decision.reason === 'string' && decision.reason.trim() !== '' &&
        typeof decision.shouldStop === 'boolean') {
      
      // If AI doesn't stop itself but max iterations are reached, force stop.
      if (iteration >= maxIterations && !decision.shouldStop) {
        return { ...decision, shouldStop: true, reason: decision.reason + ` (Forced stop: maximum iterations (${maxIterations}) reached.)` };
      }
      return decision;
    }
    
    console.error("Failed to parse a valid decision from AI, or critical fields are missing/empty. Response:", response.text);
    // Fallback if parsing fails or content is invalid
    return { 
      action: `Error: Could not determine next valid research step after iteration ${iteration -1}. Please review logs.`, 
      reason: "AI response was not in the expected format or lacked essential content. Defaulting to stop to prevent errors.", 
      shouldStop: true 
    };
  } catch (error) {
    console.error("Error deciding next research action:", error);
    // Throw error to be caught by UI and displayed, allowing user to retry or adjust.
    throw new Error(`Failed to decide next research action: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const executeResearchStep = async (stepQuery: string, researchMode: ResearchMode): Promise<{ text: string; sources: Source[] }> => {
  if (!API_KEY) throw new Error("API Key not configured.");
  const modelForSearch = getModelNameForMode(researchMode);

  try {
    // The prompt here is direct and asks for comprehensive answer with citations.
    // The Gemini API's googleSearch tool handles the actual searching and initial synthesis.
    const response: GenerateContentResponse = await geminiApiCallWithRetry({
      model: modelForSearch,
      contents: `Perform a thorough web search and provide a comprehensive, factual answer for the following query: "${stepQuery}". Cite your sources clearly. Aim for detailed information.`,
      config: { 
        tools: [{googleSearch: {}}]
        // System instruction could be added here if desired, e.g., "Focus on academic and reputable sources."
        // However, the core googleSearch tool behavior is primary.
      } 
    });

    const geminiResponse = response as unknown as GeminiResponseForSearch; 
    const text = geminiResponse.text || "";
    let sources: Source[] = [];

    // Extract sources from grounding metadata
    if (geminiResponse.candidates && geminiResponse.candidates[0]?.groundingMetadata?.groundingChunks) {
      sources = geminiResponse.candidates[0].groundingMetadata.groundingChunks
        .filter((chunk: GroundingChunk) => chunk.web && chunk.web.uri && chunk.web.uri.trim() !== '')
        .map((chunk: GroundingChunk) => ({
          uri: chunk.web.uri,
          title: chunk.web.title || chunk.web.uri, // Use URI as fallback for title
        }))
        // Deduplicate sources based on URI to avoid listing the same link multiple times from one search
        .filter((source, index, self) => index === self.findIndex(s => s.uri === source.uri));
    }
    
    if (!text && sources.length === 0) {
        console.warn(`No text content and no sources returned for query: "${stepQuery}" using model ${modelForSearch}.`);
        // Return empty but valid structure instead of throwing error, summary can handle this.
        return { text: "No information found for this query.", sources: [] };
    }

    return { text, sources };
  } catch (error) {
    console.error(`Error executing research step "${stepQuery}" (model: ${modelForSearch}):`, error);
    throw new Error(`Failed to execute research step "${stepQuery}": ${error instanceof Error ? error.message : String(error)}`);
  }
};
