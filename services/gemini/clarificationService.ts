
import { UserAnswer, ClarificationQuestion, ResearchMode } from '../../types';
import { getModelNameForMode, NORMAL_MODE_MODEL, DEEPER_MODE_MODEL } from './constants';
import { geminiApiCallWithRetry, parseJsonFromString } from './utils';
import { executeResearchStep } from './executionService';
import { summarizeText } from './synthesisService'; // summarizeText is now in synthesisService

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.error("API_KEY missing in clarificationService.ts");
}

const EXPERT_RESEARCHER_CLARIFICATION_SYSTEM_PROMPT = "You are an expert researcher. Be proactive and anticipate user needs. Your goal is to help refine the research topic effectively. Ask insightful and targeted questions. Avoid generic or overly broad questions.";

export const getInitialTopicContext = async (topic: string, researchMode: ResearchMode): Promise<string> => {
  if (!API_KEY) throw new Error("API Key not configured.");
  try {
    // Using researchMode's model for the initial search, as it might be a complex query.
    const searchResult = await executeResearchStep(`Provide a brief overview of the current understanding or key aspects of the topic: "${topic}"`, researchMode);
    if (!searchResult.text && searchResult.sources.length === 0) {
        return "No initial context could be found for this topic via search.";
    }
    // Summarization can use the researchMode model as well, or a specific one if preferred for cost/speed.
    // Sticking with researchMode model for consistency in quality for this initial critical step.
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

Generate 3-4 concise initial clarifying questions. Focus on narrowing scope, user intent, specific areas of interest, or ambiguities in the topic or context.
Avoid questions that are:
- Obvious from the provided context.
- About unannounced future events or pure speculation (unless the topic is explicitly about forecasting).
- Overly simplistic or yes/no questions if a more nuanced answer is needed.

Output ONLY a JSON array of strings (questions). No other text.
Example for "Renewable Energy Impact" (context: general types/benefits):
[
  "Are you primarily interested in the economic impacts on developing countries, or the technological advancements in specific renewable sectors like next-gen solar?",
  "Should the research focus on common renewables (solar, wind) or also explore less common but emerging ones (e.g., tidal, geothermal, green hydrogen)?",
  "Is there a specific policy angle, such as the effectiveness of government incentives or international agreements post-${parseInt(today.substring(0,4)) - 2}, you'd like to investigate?",
  "Are you more interested in the current challenges and limitations of renewable energy adoption, or the success stories and future potential?"
]`;

  try {
    const response = await geminiApiCallWithRetry({ 
        model: modelName, 
        contents: prompt, 
        config: { 
            responseMimeType: "application/json",
            systemInstruction: EXPERT_RESEARCHER_CLARIFICATION_SYSTEM_PROMPT 
        } 
    });
    const questions = parseJsonFromString<string[]>(response.text, response.text);
    if (questions && Array.isArray(questions) && questions.every(item => typeof item === 'string')) {
      return questions.length > 0 ? questions : ["No specific questions generated. What aspect of the topic are you most interested in focusing on?"];
    }
    console.warn("Invalid initial clarification questions format. Response:", response.text);
    return ["The AI couldn't generate specific questions at this time. Could you please specify your primary areas of interest within the topic?"];
  } catch (error) {
    console.error("Error generating initial clarification questions:", error);
    return [`Failed to generate initial questions for "${topic}". What specific aspect or sub-topic are you most interested in exploring?`];
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
    return `Q: ${question ? question.question : `Question ID ${ua.questionId}`}\nA: ${ua.answer}`;
  }).join('\n\n');

  const prompt = `
Original Topic: "${topic}"
User answers to previous questions:
<PreviousQA>
${formattedPrevQA}
</PreviousQA>

Task:
1. Critically evaluate if the user's answers provide sufficient clarity and detail to formulate a focused and effective research strategy.
2. If the answers are sufficient (i.e., the research scope is well-defined, key ambiguities are resolved), indicate that no more questions are needed.
3. If answers are vague, incomplete, introduce new ambiguities, or don't adequately narrow the scope, generate 1-3 NEW, targeted follow-up questions. 
   These follow-up questions should aim to resolve the *remaining* ambiguities or delve deeper into specific aspects that are still unclear.
   Do NOT repeat previous questions unless the user's answer was entirely off-topic or indicated a misunderstanding of the original question.
   Focus on what is *still* unclear or insufficiently detailed for strategic research planning.

Output ONLY a JSON object with the following structure:
{
  "areAnswersSufficient": boolean, // true if no more questions are needed, false otherwise.
  "followUpQuestions": string[]    // An array of new follow-up questions if areAnswersSufficient is false. Empty array if true.
}

Example (insufficient answers, more detail needed):
{
  "areAnswersSufficient": false,
  "followUpQuestions": [
    "You mentioned 'economic impact,' could you specify if you mean microeconomic effects on businesses or macroeconomic trends like GDP growth?",
    "For 'recent developments,' what timeframe are you considering (e.g., last 2 years, last 5 years)?",
    "Regarding 'sustainability,' are you focused on environmental, social, or economic sustainability aspects, or a combination?"
  ]
}

Example (sufficient answers, ready to proceed):
{
  "areAnswersSufficient": true,
  "followUpQuestions": []
}`;

  try {
    const response = await geminiApiCallWithRetry({ 
        model: modelName, 
        contents: prompt, 
        config: { 
            responseMimeType: "application/json",
            systemInstruction: EXPERT_RESEARCHER_CLARIFICATION_SYSTEM_PROMPT
        } 
    });
    const evaluation = parseJsonFromString<EvaluatedAnswers>(response.text, response.text);
    if (evaluation && typeof evaluation.areAnswersSufficient === 'boolean') {
      if (!evaluation.areAnswersSufficient && (!Array.isArray(evaluation.followUpQuestions) || evaluation.followUpQuestions.length === 0)) {
         // If AI says answers are insufficient but provides no follow-ups, it might be a subtle way of saying it has enough.
         // Or it's an error. For robustness, assume it's "good enough" if no new questions are posed.
         console.warn("AI indicated answers are insufficient but provided no follow-up questions. Proceeding as if sufficient.");
         return { ...evaluation, areAnswersSufficient: true, followUpQuestions: [] };
      }
      return evaluation;
    }
    // If parsing fails or structure is wrong, assume error and consider answers insufficient, prompting for manual review or retry implicitly.
    throw new Error("Failed to evaluate answers: Invalid JSON structure in AI response.");
  } catch (error) {
    console.error("Error evaluating answers and generating follow-up questions:", error);
    // Gracefully degrade: assume not sufficient, but don't ask new questions to avoid error loop.
    // This will push user to strategy phase, where they can refine. Or they can go back.
    // throw new Error(`Answer evaluation failed: ${error instanceof Error ? error.message : String(error)}`);
     return { areAnswersSufficient: true, followUpQuestions: [] }; // Safest fallback: proceed to strategy
  }
};
