
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Source, GroundingChunk, UserAnswer, ExecutedStepOutcome, ClarificationQuestion, ResearchMode } from '../types';

const API_KEY = process.env.API_KEY;

// Define model names based on user's specific guidelines for research modes
const NORMAL_MODE_MODEL = "gemini-2.5-flash-preview-05-20";
const DEEPER_MODE_MODEL = "gemini-2.5-pro-preview-06-05";

if (!API_KEY) {
  console.error("API_KEY is not set. Please ensure the process.env.API_KEY environment variable is configured. The app may not function correctly.");
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;

const getModelNameForMode = (mode: ResearchMode): string => {
  if (mode === 'deeper') {
    return DEEPER_MODE_MODEL;
  }
  return NORMAL_MODE_MODEL; // Default to normal mode model
};

async function geminiApiCallWithRetry(
  params: { model: string; contents: any; config?: any }
): Promise<GenerateContentResponse> {
  if (!ai) throw new Error("Gemini API client not initialized. API_KEY might be missing.");
  let attempts = 0;
  while (attempts < MAX_RETRIES) {
    try {
      // thinkingConfig is intentionally omitted here as the specified models
      // (gemini-2.5-flash-preview-05-20 and gemini-2.5-pro-preview-06-05)
      // are not gemini-2.5-flash-preview-04-17, for which thinkingConfig is specifically mentioned.
      // Omitting it defaults to higher quality for these models.
      const response = await ai.models.generateContent(params);
      return response;
    } catch (error: any) {
      attempts++;
      const errorMessage = String(error?.message || error).toLowerCase();
      const isRetryableError = 
        errorMessage.includes("status: 500") || 
        errorMessage.includes("status: 503") || 
        errorMessage.includes("status: 429") || 
        errorMessage.includes("internal error") ||
        errorMessage.includes("unknown error") || 
        errorMessage.includes("service unavailable") ||
        errorMessage.includes("deadline exceeded") || 
        errorMessage.includes("unavailable");

      if (isRetryableError && attempts < MAX_RETRIES) {
        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempts - 1);
        console.warn(
          `Gemini API call for model ${params.model} failed (attempt ${attempts}/${MAX_RETRIES}) with error: ${error}. Retrying in ${delay / 1000}s...`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error(
          `Gemini API call for model ${params.model} failed definitively after ${attempts} attempts or due to non-retryable error: ${error}.`
        );
        throw error;
      }
    }
  }
  throw new Error(`Gemini API call for model ${params.model} failed after ${MAX_RETRIES} retries.`);
}

const parseJsonFromString = <T,>(text: string, originalTextForError?: string): T | null => {
  let jsonStr = (text || "").trim();
  const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
  const match = jsonStr.match(fenceRegex);
  if (match && match[2]) {
    jsonStr = (match[2] || "").trim(); 
  }
  try {
    return JSON.parse(jsonStr) as T;
  } catch (e) {
    console.error("Failed to parse JSON response:", e, "Original text for error:", originalTextForError || text, "Processed text for parsing:", jsonStr);
    return null;
  }
};

export const getInitialTopicContext = async (topic: string, researchMode: ResearchMode): Promise<string> => {
  if (!API_KEY || !ai) throw new Error("API Key not configured or Gemini client not initialized.");
  try {
    const searchResult = await executeResearchStep(`Provide a brief overview of the current understanding or key aspects of the topic: "${topic}"`, researchMode);
    if (!searchResult.text && searchResult.sources.length === 0) {
        return "No initial context could be found for this topic via search.";
    }
    const contextSummary = await summarizeText(searchResult.text, researchMode, `Initial context for: ${topic}`);
    return contextSummary || "Could not summarize initial context.";
  } catch (error) {
    console.error("Error fetching initial topic context:", error);
    // Return a non-breaking message rather than throwing, so clarification can still proceed
    return `Could not fetch initial context due to an error: ${error instanceof Error ? error.message : String(error)}`;
  }
};

export const generateInitialClarificationQuestions = async (topic: string, researchMode: ResearchMode, initialContext: string): Promise<string[]> => {
  if (!API_KEY || !ai) throw new Error("API Key not configured or Gemini client not initialized.");
  const modelName = getModelNameForMode(researchMode);
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const prompt = `
Given the research topic: "${topic}"
Today's date is: ${today}.

Here is some initial context found about the topic:
<context>
${initialContext}
</context>

Based on this context, the topic, and today's date, generate 3-4 concise initial clarifying questions to help narrow down the scope, understand user intent, and focus the research.
These questions should prompt the user for specific aspects they are interested in, or constraints they might have.

Important Instructions:
- Use the provided context to avoid asking questions whose answers are already obvious from the information given.
- Use today's date (${today}) to avoid asking about future events that have not yet occurred or are not yet publicly known (e.g., details of product releases if not yet announced, or specific outcomes of events scheduled for the future).
- Focus on questions that genuinely help narrow down the scope for effective research. Do not ask "stupid" or unhelpful questions.
- If the context already provides significant detail on an aspect, try to ask questions that delve deeper or explore related unmentioned areas.

Output ONLY a JSON array of strings, where each string is a question. Do not include any other text, explanation, or markdown.

Example for topic "Renewable Energy Impact" (assuming context mentioned general types and benefits):
[
  "Are you interested in the specific economic impacts on developing countries, or more broadly on global markets?",
  "Given that solar and wind are common, are you interested in less common renewables like tidal or advanced geothermal energy?",
  "Is there a particular policy angle, such as government incentives or international agreements, you want to focus on for the period after ${parseInt(today.substring(0,4)) - 2}?",
  "Are you looking for information on challenges and limitations, or primarily success stories and future potential?"
]`;

  try {
    const response = await geminiApiCallWithRetry({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });
    const questions = parseJsonFromString<string[]>(response.text, response.text);
    if (questions && Array.isArray(questions) && questions.every(item => typeof item === 'string')) {
      return questions.length > 0 ? questions : ["No specific clarification questions were generated based on the context. What aspect of the topic are you most interested in?"];
    }
    console.warn("Failed to generate valid initial clarification questions. Model did not return a JSON array of strings. Response:", response.text);
    // Fallback question if parsing fails or returns empty
    return ["The AI could not generate specific questions. Could you please specify what aspects of the topic you are most interested in?"];
  } catch (error) {
    console.error("Error generating initial clarification questions:", error);
    // Provide a generic fallback question on error
    return [`Failed to generate clarification questions due to an error. What specific area of "${topic}" would you like to explore?`];
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
  if (!API_KEY || !ai) throw new Error("API Key not configured or Gemini client not initialized.");
  const modelName = getModelNameForMode(researchMode);
  const formattedPrevQA = userAnswers.map(ua => {
    const question = questionsAsked.find(q => q.id === ua.questionId);
    return `Q: ${question ? question.question : `ID ${ua.questionId}`}\nA: ${ua.answer}`;
  }).join('\n\n');

  const prompt = `
You are an AI assistant helping to refine a research topic through iterative clarification.
Original Research Topic: "${topic}"

The following questions were just asked, and these are the user's answers:
${formattedPrevQA}

Your Task:
1. Evaluate if the user's answers provide sufficient clarity and detail to formulate a focused research strategy for the original topic.
2. If the answers are sufficient, indicate that no more questions are needed.
3. If the answers are vague, ambiguous, incomplete, or open up new necessary clarifications critical for effective research, generate 1-3 NEW follow-up questions. These questions should aim to resolve the remaining ambiguities and ensure the research can be effectively targeted. Do NOT repeat previous questions unless the user explicitly indicated confusion or provided an irrelevant answer that needs re-addressing from a new angle. Focus on what's *still* unclear or missing to build a good research strategy.

Output ONLY a JSON object with the following structure:
{
  "areAnswersSufficient": boolean, // true if no more questions are needed, false otherwise
  "followUpQuestions": string[]   // An array of new question strings (1-3 questions if areAnswersSufficient is false). Omit or provide an empty array if areAnswersSufficient is true.
}

Example (if answers are insufficient):
{
  "areAnswersSufficient": false,
  "followUpQuestions": [
    "You mentioned 'economic impact', could you specify if you're interested in microeconomic effects on businesses or macroeconomic trends?",
    "Regarding 'recent developments', what timeframe are you considering (e.g., last 2 years, last 5 years)?"
  ]
}

Example (if answers are sufficient):
{
  "areAnswersSufficient": true,
  "followUpQuestions": []
}
`;

  try {
    const response = await geminiApiCallWithRetry({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });
    const evaluation = parseJsonFromString<EvaluatedAnswers>(response.text, response.text);
    if (evaluation && typeof evaluation.areAnswersSufficient === 'boolean') {
      if (!evaluation.areAnswersSufficient && (!Array.isArray(evaluation.followUpQuestions) || evaluation.followUpQuestions.length === 0)) {
         console.warn("AI indicated answers are insufficient but provided no follow-up questions. Proceeding based on current information.");
         return { ...evaluation, areAnswersSufficient: true, followUpQuestions: [] }; 
      }
      return evaluation;
    }
    throw new Error("Failed to evaluate answers. Model did not return expected JSON structure.");
  } catch (error) {
    console.error("Error evaluating answers and generating follow-ups:", error);
    throw new Error(`Failed to evaluate answers: ${error instanceof Error ? error.message : String(error)}`);
  }
};


export const generateResearchStrategy = async (topic: string, accumulatedAnswers: UserAnswer[], researchMode: ResearchMode): Promise<string> => {
  if (!API_KEY || !ai) throw new Error("API Key not configured or Gemini client not initialized.");
  const modelName = getModelNameForMode(researchMode);
  const formattedAnswers = accumulatedAnswers.map(ans => `- Question: ${ans.questionText}\n  Answer: ${ans.answer}`).join("\n\n");

  const prompt = `
Based on the research topic: "${topic}"
And the user's answers to clarifying questions (accumulated over potentially multiple rounds):
${formattedAnswers || "No specific clarifications provided beyond the initial topic."}

Outline a high-level research strategy or approach.
Describe the overall direction, key areas to investigate, and the types of information to look for.
This is NOT a list of specific search queries or step-by-step tasks, but a guiding paragraph that sets the tone and focus for the subsequent iterative research.
The strategy should be a concise paragraph (3-5 sentences).
Output ONLY the research strategy as a single block of text. No extra formatting, titles, or markdown.
`;
  try {
    const response = await geminiApiCallWithRetry({
      model: modelName,
      contents: prompt,
    });
    return (response.text || "").trim();
  } catch (error) {
    console.error("Error generating research strategy:", error);
    throw new Error(`Failed to generate research strategy: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const MAX_CONTEXT_TOKENS_APPROX = 7000; 
const summarizeHistoryForContext = (history: ExecutedStepOutcome[]): string => {
  let summarized = history.map(h => `Action: ${h.action}\nFinding: ${(h.summary || "").substring(0, 300)}...`).join('\n---\n');
  
  const estimatedTokens = summarized.length / 4; 

  if (estimatedTokens > MAX_CONTEXT_TOKENS_APPROX) {
      summarized = summarized.substring(summarized.length - (MAX_CONTEXT_TOKENS_APPROX * 4)); 
      summarized = "...\n" + summarized.substring(summarized.indexOf('\n---\n') > 0 ? summarized.indexOf('\n---\n') + 5 : 0); 
  }
  return summarized;
};

export const decideNextResearchAction = async (
  topic: string,
  strategy: string,
  executedSteps: ExecutedStepOutcome[],
  iteration: number,
  maxIterations: number, 
  researchMode: ResearchMode
): Promise<{ action: string; reason: string; shouldStop: boolean }> => {
  if (!API_KEY || !ai) throw new Error("API Key not configured or Gemini client not initialized.");
  const modelName = getModelNameForMode(researchMode);
  
  const historySummary = summarizeHistoryForContext(executedSteps);
  const iterationLimitNote = `You are in '${researchMode} Mode'. Aim for thorough coverage within approximately ${maxIterations} iterations. Model used: ${modelName}.`;


  const prompt = `
You are an AI research agent driving an iterative investigation.

**Overall Research Topic:** "${topic}"
**Guiding Research Strategy:** "${strategy}"
**Current Iteration:** ${iteration}
**Research Mode Note:** ${iterationLimitNote}

**Summary of Previous Research Actions and Key Findings:**
${historySummary || "No actions taken yet."}

**Your Task:**
Based on all the above, decide the single most logical next research action to take. This should typically be a specific question to answer or a precise search query for Google Search.
Your goal is to progressively deepen the understanding of the topic, explore various facets outlined in the strategy, and gather diverse, relevant information.

**CRITICAL: Avoid Redundancy and Seek Genuine Novelty:**
1.  **Thoroughly Analyze Past Actions:** Critically review the 'Summary of Previous Research Actions and Key Findings'. Pay close attention to the *intent* and *scope* of each past action and its outcome.
2.  **Strictly Prohibit Semantic Duplicates:** Do NOT generate an action (search query or question) that is essentially a rephrasing or a slight variation of a previous action IF that previous action already yielded relevant information or addressed that specific information need.
3.  **Prioritize New Angles:** If a general area has been touched upon, your new action **MUST** aim to explore a **distinctly different aspect**, delve into a **related sub-topic not yet covered in depth**, or seek **contrasting viewpoints**.
4.  **Objective:** Expand the knowledge base and build a comprehensive understanding by uncovering *new facets* of the topic. Your reasoning should explicitly state how the new action seeks novel information.

Also, provide:
1.  A brief **reason** for choosing this action (1-2 sentences), explaining how it builds upon or DIVERGES from previous findings to gather NEW insights.
2.  A boolean flag **shouldStop**: 
    - Set to \`true\` if you believe sufficient information has been gathered across multiple dimensions of the topic to synthesize a comprehensive report, OR if further specific actions are unlikely to yield significantly new insights according to the strategy and novelty guidelines.
    - If approaching \`maxIterations\` (\`${maxIterations}\`), consider stopping if broad coverage is achieved.
    - If it's very early (e.g., less than 5-10 iterations for normal topics, or 15-20 for complex ones unless the topic is very narrow and strategy fully covered quickly), \`shouldStop\` should generally be \`false\`.
    Otherwise, set to \`false\`.

**Output Format (Strictly JSON only, no other text or markdown):**
{
  "action": "Your specific research query or question for the next step, aiming for novelty.",
  "reason": "Your brief justification for this action, emphasizing novelty or progression to a new area.",
  "shouldStop": boolean
}
`; 
  try {
    const response = await geminiApiCallWithRetry({
      model: modelName, 
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });
    const decision = parseJsonFromString<{ action: string; reason: string; shouldStop: boolean }>(response.text, response.text);
    if (decision && typeof decision.action === 'string' && typeof decision.reason === 'string' && typeof decision.shouldStop === 'boolean') {
      if (iteration >= maxIterations && !decision.shouldStop) { 
        return { ...decision, shouldStop: true, reason: decision.reason + ` (Forced stop due to max iterations limit of ${maxIterations})` };
      }
      return decision;
    }
    console.error("Failed to parse decision from AI:", response.text);
    return { action: "Error: Could not determine next step.", reason: "AI response was not in the expected JSON format.", shouldStop: true };
  } catch (error) {
    console.error("Error deciding next research action:", error);
    throw new Error(`Failed to decide next research action: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const executeResearchStep = async (stepQuery: string, researchMode: ResearchMode): Promise<{ text: string; sources: Source[] }> => {
  if (!API_KEY || !ai) throw new Error("API Key not configured or Gemini client not initialized.");
  const modelName = getModelNameForMode(researchMode); 
  try {
    const response = await geminiApiCallWithRetry({
      model: modelName, 
      contents: `Perform a web search and provide a comprehensive answer for the following query: "${stepQuery}". Focus on factual information and cite sources.`,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });
    
    const geminiResponse = response; 
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
    console.error(`Error executing research step "${stepQuery}":`, error);
    throw new Error(`Failed to execute research step "${stepQuery}": ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const summarizeText = async (textToSummarize: string, researchMode: ResearchMode, topic?: string): Promise<string> => {
  if (!API_KEY || !ai) throw new Error("API Key not configured or Gemini client not initialized.");
  if (!(textToSummarize || "").trim()) return "No content to summarize.";
  const modelName = getModelNameForMode(researchMode);
  
  const prompt = `
Summarize the key information from the following text in 2-4 concise sentences.
Focus on extracting the most salient points relevant to the potential research topic: "${topic || 'General Information'}".
Maintain a neutral, factual tone.

Text to summarize:
---
${textToSummarize}
---

Output ONLY the summary. Do not include any introductory phrases like "The summary is:" or "This text states that:".
`;
  try {
    const response = await geminiApiCallWithRetry({
      model: modelName, 
      contents: prompt,
    });
    return (response.text || "").trim();
  } catch (error) {
    console.error("Error summarizing text:", error);
    return `Summarization failed. Preview: ${(textToSummarize || "").substring(0, 200)}...`;
  }
};

export const synthesizeReport = async (
  topic: string,
  strategy: string,
  executedSteps: ExecutedStepOutcome[],
  researchMode: ResearchMode
): Promise<string> => {
  if (!API_KEY || !ai) throw new Error("API Key not configured or Gemini client not initialized.");
  const modelName = getModelNameForMode(researchMode); 

  const findingsDetails = executedSteps.map((s, index) => 
    `Step ${index + 1}: Action Taken: ${s.action}\nReasoning: ${s.reason || 'N/A'}\nSummary of Findings: ${s.summary}\nSources: ${s.sources.map(src => `[${src.title || src.uri}](${src.uri})`).join(', ') || 'None'}`
  ).join('\n\n---\n\n');

  // Step 1: Generate Initial Report
  const initialReportPrompt = `Given the following query from the user, write a final report on the topic using the learnings from research. Make it as as detailed as possible, aim for 3 or more pages, include ALL the learnings from research:\n<query>${topic}</query>
Here are all the learnings from previous research:\n<learnings>\n${findingsDetails || "No research steps were executed or no findings were recorded."}\n</learnings>
You need to write this report like a human researcher. Humans don not wrap their writing in markdown blocks. Contains diverse data information such as table, katex formulas, mermaid diagrams, etc. in the form of markdown syntax. **DO NOT** output anything other than report.`;

  let initialReportText = "";
  try {
    console.log(`Synthesizing initial report using model: ${modelName}...`);
    const initialResponse = await geminiApiCallWithRetry({
      model: modelName, 
      contents: initialReportPrompt,
    });
    initialReportText = (initialResponse.text || "").trim();
    if (!initialReportText) {
        console.warn("Initial report generation resulted in empty text. Using a placeholder.");
        initialReportText = `# ${topic}\n\nInitial report generation failed to produce content. Learnings:\n${findingsDetails}`;
    }
    console.log("Initial report generated, length:", initialReportText.length);
  } catch (error) {
    console.error("Error synthesizing initial report:", error);
    throw new Error(`Failed to synthesize initial report: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Step 2: Elaborate Report
  const systemInstructionForElaboration = `Focus on elaborating the existing points, adding more detail, examples, and explanations where appropriate, while strictly adhering to the information presented in the research findings detailed in the initial artifact. Ensure the report remains coherent and well-structured. The original research topic was: "${topic}". The guiding research strategy was: "${strategy}". Avoid introducing new information not present in the initial artifact or the original research learnings.`;
  
  const elaborationPrompt = `You are tasked with re-writing the following artifact to be longest.
Ensure you do not change the meaning or story behind the artifact, simply update the artifacts length to be longest.

Here is the current content of the artifact:
<artifact>
${initialReportText}
</artifact>

When the following systemInstruction is not empty, you can also think further about artifacts in conjunction with systemInstruction.
<systemInstruction>
${systemInstructionForElaboration}
</systemInstruction>

Rules and guidelines:
</rules-guidelines>
- Respond with ONLY the updated artifact, and no additional text before or after.
- Do not wrap it in \`<artifact></artifact>\`, \`<systemInstruction></systemInstruction>\`, \`<rules-guidelines></rules-guidelines>\`. Ensure it's just the updated artifact.
- Do not change the language of the updated artifact. The updated artifact language is consistent with the current artifact.`;

  try {
    console.log(`Elaborating report using model: ${modelName}...`);
    const elaboratedResponse = await geminiApiCallWithRetry({
      model: modelName, 
      contents: elaborationPrompt,
    });
    const elaboratedReportText = (elaboratedResponse.text || "").trim();
    if (!elaboratedReportText) {
        console.warn("Report elaboration resulted in empty text. Returning initial report.");
        return initialReportText; // Return initial report if elaboration fails to produce content
    }
    console.log("Report elaborated, new length:", elaboratedReportText.length);
    return elaboratedReportText;
  } catch (error) {
    console.warn("Error elaborating report. Returning the initial version.", error);
    // If elaboration fails, return the initial report as a fallback.
    return initialReportText;
  }
};
