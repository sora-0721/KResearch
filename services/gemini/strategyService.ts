
import { UserAnswer, ResearchMode } from '../../types';
import { getModelNameForMode } from './constants';
import { geminiApiCallWithRetry } from './utils';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.error("API_KEY missing in strategyService.ts");
}

const EXPERT_STRATEGIST_SYSTEM_PROMPT = "You are an expert research strategist. Your task is to devise a comprehensive, insightful, and actionable high-level research strategy. Be thorough, consider multiple angles, and anticipate potential areas of investigation. The strategy should guide a detailed research process.";

export const generateResearchStrategy = async (topic: string, accumulatedAnswers: UserAnswer[], researchMode: ResearchMode): Promise<string> => {
  if (!API_KEY) throw new Error("API Key not configured.");
  const modelName = getModelNameForMode(researchMode);
  const formattedAnswers = accumulatedAnswers.map(ans => `- Question: ${ans.questionText}\n  Answer: ${ans.answer}`).join("\n\n");

  const prompt = `
Research Topic: "${topic}"

User's answers to clarifying questions (if any):
<UserClarifications>
${formattedAnswers || "No specific clarifications were provided beyond the initial topic. Infer intent from the topic itself."}
</UserClarifications>

Task:
Based SOLELY on the research topic and any user clarifications, outline a high-level research strategy.
This strategy should be a concise paragraph (approximately 3-7 sentences) that describes:
1.  The overall direction and primary goals of the research.
2.  Key areas, themes, or sub-topics that need to be investigated.
3.  The types of information or evidence that should be sought (e.g., data, expert opinions, case studies, comparative analysis, historical context).
4.  Optionally, any critical perspectives or counterarguments that should be considered for a balanced view.

Focus ONLY on the strategic plan forward.
DO NOT include:
-   Any summary of the topic itself.
-   Repetition of information already present in the topic or answers.
-   Specific search queries or step-by-step tactical tasks.
-   Greetings, conversational filler, or any text outside the strategy itself.

Output ONLY the research strategy as a single, coherent block of text.

Example Strategy (for topic "Impact of AI on Creative Industries", with clarifications focusing on visual arts and copyright):
"The research will investigate the multifaceted impact of artificial intelligence on creative industries, with a specific focus on visual arts (e.g., digital painting, graphic design, photography) and the evolving landscape of copyright law. Key areas include exploring how AI tools are being used by artists, the potential for AI to augment or replace human creativity, economic shifts within these industries, and the legal and ethical challenges related to IP ownership and AI-generated art. The strategy will involve gathering information on current AI technologies, case studies of AI adoption, expert opinions from artists and legal scholars, and analysis of recent copyright disputes or policy discussions."
`;

  try {
    const response = await geminiApiCallWithRetry({ 
        model: modelName, 
        contents: prompt,
        config: {
            systemInstruction: EXPERT_STRATEGIST_SYSTEM_PROMPT
        }
    });
    return (response.text || "").trim();
  } catch (error) {
    console.error("Error generating research strategy:", error);
    throw new Error(`Failed to generate research strategy: ${error instanceof Error ? error.message : String(error)}`);
  }
};
