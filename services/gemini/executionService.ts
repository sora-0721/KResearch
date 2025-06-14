
import { Source, GroundingChunk, ExecutedStepOutcome, ResearchMode, GeminiResponseForSearch } from '../../types';
import { getModelNameForMode, MAX_CONTEXT_TOKENS_APPROX } from './constants'; 
import { geminiApiCallWithRetry, parseJsonFromString, summarizeHistoryForContext } from './utils';
import { GenerateContentResponse } from '@google/genai';


const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY missing in executionService.ts");
}

export const decideNextResearchAction = async (
  topic: string,
  strategy: string,
  executedSteps: ExecutedStepOutcome[],
  iteration: number,
  maxIterations: number,
  researchMode: ResearchMode
): Promise<{ action: string; reason: string; shouldStop: boolean }> => {
  if (!API_KEY) throw new Error("API Key not configured.");
  const modelName = getModelNameForMode(researchMode);
  const historySummary = summarizeHistoryForContext(executedSteps, MAX_CONTEXT_TOKENS_APPROX);
  const iterationLimitNote = `Mode: '${researchMode}'. Max Iterations: ${maxIterations}. Model: ${modelName}.`;

  const prompt = `
Topic: "${topic}"
Strategy: "${strategy}"
Iteration: ${iteration} 
Note: ${iterationLimitNote}
Previous Actions & Findings Summary:
${historySummary || "No actions yet."}

Task: Decide the single most logical next research action (specific question or Google Search query).
Goal: Deepen understanding, explore facets, gather diverse info.
CRITICAL: Avoid Redundancy & Seek Novelty.
1. Analyze Past Actions: Review intent/scope of past actions and outcomes.
2. No Semantic Duplicates: Do NOT rephrase/vary previous actions if they yielded relevant info.
3. Prioritize New Angles: Explore distinctly different aspects, new sub-topics, or contrasting views.
Your reasoning MUST state how the new action seeks novel information.

Also provide:
1. Brief reason (1-2 sentences) for this action, emphasizing novelty/progression.
2. shouldStop (boolean): true if sufficient info gathered OR unlikely to yield new insights OR near maxIterations with broad coverage. false otherwise. (Usually false for early iterations < 5-10 for normal topics, < 15-20 complex).

Output Format (Strictly JSON only):
{
  "action": "Specific research query/question for next step, aiming for novelty.",
  "reason": "Justification, emphasizing novelty or new area.",
  "shouldStop": boolean
}`;
  try {
    const response = await geminiApiCallWithRetry({ model: modelName, contents: prompt, config: { responseMimeType: "application/json" } });
    const decision = parseJsonFromString<{ action: string; reason: string; shouldStop: boolean }>(response.text, response.text);
    if (decision && typeof decision.action === 'string' && typeof decision.reason === 'string' && typeof decision.shouldStop === 'boolean') {
      if (iteration >= maxIterations && !decision.shouldStop) {
        return { ...decision, shouldStop: true, reason: decision.reason + ` (Forced stop: max iterations ${maxIterations})` };
      }
      return decision;
    }
    console.error("Failed to parse decision from AI:", response.text);
    return { action: "Error: Could not determine next step.", reason: "AI response format error.", shouldStop: true };
  } catch (error) {
    console.error("Error deciding next research action:", error);
    throw new Error(`Failed to decide next action: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const executeResearchStep = async (stepQuery: string, researchMode: ResearchMode): Promise<{ text: string; sources: Source[] }> => {
  if (!API_KEY) throw new Error("API Key not configured.");
  // Use the model specific to the current researchMode for search grounding, as per new guidelines.
  const modelForSearch = getModelNameForMode(researchMode);

  try {
    const response: GenerateContentResponse = await geminiApiCallWithRetry({
      model: modelForSearch,
      contents: `Perform a web search and provide a comprehensive answer for: "${stepQuery}". Focus on facts, cite sources.`,
      // Adhering to guideline: "DO NOT add other configs except for tools googleSearch."
      config: { tools: [{ googleSearch: {} }] } 
    });

    const geminiResponse = response as unknown as GeminiResponseForSearch; // Cast to access .text and .candidates more easily
    const text = geminiResponse.text || "";
    let sources: Source[] = [];

    if (geminiResponse.candidates && geminiResponse.candidates[0]?.groundingMetadata?.groundingChunks) {
      sources = geminiResponse.candidates[0].groundingMetadata.groundingChunks
        .filter((chunk: GroundingChunk) => chunk.web && chunk.web.uri)
        .map((chunk: GroundingChunk) => ({
          uri: chunk.web.uri,
          title: chunk.web.title || chunk.web.uri,
        }))
        .filter(source => source.uri);
    }
    return { text, sources };
  } catch (error) {
    console.error(`Error executing research step "${stepQuery}" (model: ${modelForSearch}):`, error);
    throw new Error(`Failed step "${stepQuery}": ${error instanceof Error ? error.message : String(error)}`);
  }
};