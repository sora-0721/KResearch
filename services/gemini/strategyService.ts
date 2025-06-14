
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

Task: Based SOLELY on the topic and user's answers, outline a high-level research strategy.
The strategy should be a concise paragraph (3-5 sentences) describing the overall direction, key areas to investigate, and types of information to seek.
DO NOT include any summary of the topic itself, or repeat information already provided in the topic or answers. Focus ONLY on the plan forward.
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
