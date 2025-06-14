
import { UserAnswer, ResearchMode } from '../../types';
import { getModelNameForMode } from './constants';
import { geminiApiCallWithRetry } from './utils';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.error("API_KEY missing in strategyService.ts");
}

export const generateResearchStrategy = async (topic: string, accumulatedAnswers: UserAnswer[], researchMode: ResearchMode): Promise<string> => {
  if (!API_KEY) throw new Error("API Key not configured.");
  const modelName = getModelNameForMode(researchMode);
  const formattedAnswers = accumulatedAnswers.map(ans => `- Question: ${ans.questionText}\n  Answer: ${ans.answer}`).join("\n\n");

  const prompt = `
Research Topic: "${topic}"
User's answers to clarifying questions:
${formattedAnswers || "No specific clarifications provided beyond the initial topic."}

Outline a high-level research strategy (concise paragraph, 3-5 sentences).
Describe overall direction, key areas to investigate, types of info to look for.
This is NOT a list of specific search queries or step-by-step tasks.
Output ONLY the research strategy as a single block of text. No extra formatting, titles, or markdown.`;

  try {
    const response = await geminiApiCallWithRetry({ model: modelName, contents: prompt });
    return (response.text || "").trim();
  } catch (error) {
    console.error("Error generating research strategy:", error);
    throw new Error(`Failed to generate research strategy: ${error instanceof Error ? error.message : String(error)}`);
  }
};
