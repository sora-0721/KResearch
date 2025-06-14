
import { UserAnswer, ClarificationQuestion, ResearchMode } from '../../types';
import { getModelNameForMode, NORMAL_MODE_MODEL, DEEPER_MODE_MODEL } from './constants';
import { geminiApiCallWithRetry, parseJsonFromString } from './utils';
import { executeResearchStep } from './executionService';
import { summarizeText } from './synthesisService'; // summarizeText is now in synthesisService

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.error("API_KEY missing in clarificationService.ts");
}

export const getInitialTopicContext = async (topic: string, researchMode: ResearchMode): Promise<string> => {
  if (!API_KEY) throw new Error("API Key not configured.");
  try {
    const searchResult = await executeResearchStep(`Provide a brief overview of the current understanding or key aspects of the topic: "${topic}"`, researchMode);
    if (!searchResult.text && searchResult.sources.length === 0) {
        return "No initial context could be found for this topic via search.";
    }
    // Using NORMAL_MODE_MODEL for summarization as it's a general task
    const contextSummary = await summarizeText(searchResult.text, researchMode, `Initial context for: ${topic}`);
    return contextSummary || "Could not summarize initial context.";
  } catch (error) {
    console.error("Error fetching initial topic context:", error);
    return `Could not fetch initial context due to an error: ${error instanceof Error ? error.message : String(error)}`;
  }
};

export const generateInitialClarificationQuestions = async (topic: string, researchMode: ResearchMode, initialContext: string): Promise<string[]> => {
  if (!API_KEY) throw new Error("API Key not configured.");
  const modelName = getModelNameForMode(researchMode);
  const today = new Date().toISOString().split('T')[0];

  const prompt = `
Given the research topic: "${topic}"
Today's date is: ${today}.
Initial context: <context>${initialContext}</context>
Generate 3-4 concise initial clarifying questions. Focus on narrowing scope, user intent.
Avoid questions obvious from context or about unannounced future events.
Output ONLY a JSON array of strings (questions). No other text.
Example for "Renewable Energy Impact" (context: general types/benefits):
[
  "Focus on economic impacts on developing countries or global markets?",
  "Interested in common (solar, wind) or less common renewables (tidal, geothermal)?",
  "Policy angle like incentives or agreements post-${parseInt(today.substring(0,4)) - 2}?",
  "Challenges/limitations or success stories/future potential?"
]`;

  try {
    const response = await geminiApiCallWithRetry({ model: modelName, contents: prompt, config: { responseMimeType: "application/json" } });
    const questions = parseJsonFromString<string[]>(response.text, response.text);
    if (questions && Array.isArray(questions) && questions.every(item => typeof item === 'string')) {
      return questions.length > 0 ? questions : ["No specific questions generated. What aspect are you most interested in?"];
    }
    console.warn("Invalid initial clarification questions format. Response:", response.text);
    return ["AI couldn't generate specific questions. Specify your interest areas."];
  } catch (error) {
    console.error("Error generating initial clarification questions:", error);
    return [`Failed to get questions for "${topic}". Specific area of interest?`];
  }
};

export interface EvaluatedAnswers {
  areAnswersSufficient: boolean;
  followUpQuestions?: string[];
}

export const evaluateAnswersAndGenerateFollowUps = async (
  topic: string,
  questionsAsked: ClarificationQuestion[],
  userAnswers: UserAnswer[],
  researchMode: ResearchMode
): Promise<EvaluatedAnswers> => {
  if (!API_KEY) throw new Error("API Key not configured.");
  const modelName = getModelNameForMode(researchMode);
  const formattedPrevQA = userAnswers.map(ua => {
    const question = questionsAsked.find(q => q.id === ua.questionId);
    return `Q: ${question ? question.question : `ID ${ua.questionId}`}\nA: ${ua.answer}`;
  }).join('\n\n');

  const prompt = `
Original Topic: "${topic}"
User answers to previous questions:
${formattedPrevQA}

Task:
1. Evaluate if answers provide sufficient clarity for a focused research strategy.
2. If sufficient, indicate no more questions.
3. If vague/incomplete, generate 1-3 NEW follow-up questions to resolve ambiguities. Do NOT repeat questions unless user was confused. Focus on what's *still* unclear.

Output ONLY a JSON object: { "areAnswersSufficient": boolean, "followUpQuestions": string[] }
Example (insufficient): { "areAnswersSufficient": false, "followUpQuestions": ["Specify micro or macroeconomic impact?", "Timeframe for 'recent developments' (e.g., last 2, 5 years)?"] }
Example (sufficient): { "areAnswersSufficient": true, "followUpQuestions": [] }`;

  try {
    const response = await geminiApiCallWithRetry({ model: modelName, contents: prompt, config: { responseMimeType: "application/json" } });
    const evaluation = parseJsonFromString<EvaluatedAnswers>(response.text, response.text);
    if (evaluation && typeof evaluation.areAnswersSufficient === 'boolean') {
      if (!evaluation.areAnswersSufficient && (!Array.isArray(evaluation.followUpQuestions) || evaluation.followUpQuestions.length === 0)) {
         console.warn("AI: answers insufficient, but no follow-ups. Proceeding.");
         return { ...evaluation, areAnswersSufficient: true, followUpQuestions: [] };
      }
      return evaluation;
    }
    throw new Error("Failed evaluation. Invalid JSON structure.");
  } catch (error) {
    console.error("Error evaluating answers:", error);
    throw new Error(`Evaluation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};
