
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Source, GroundingChunk, UserAnswer, ExecutedStepOutcome, ClarificationQuestion, ResearchMode } from '../types';

const API_KEY = process.env.API_KEY;
// IMPORTANT: Use the guideline-specified model name for general text tasks.
const GEMINI_MODEL_NAME = "gemini-2.5-pro-preview-06-05"; 

if (!API_KEY) {
  // Log an error, but don't throw here, as the App component will handle API key display if not set.
  // The individual service functions will throw if API_KEY is missing when they are called.
  console.error("API_KEY is not set. Please ensure the process.env.API_KEY environment variable is configured. The app may not function correctly.");
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;

async function geminiApiCallWithRetry(
  params: { model: string; contents: any; config?: any }
): Promise<GenerateContentResponse> {
  if (!ai) throw new Error("Gemini API client not initialized. API_KEY might be missing.");
  let attempts = 0;
  while (attempts < MAX_RETRIES) {
    try {
      // If params.model is the flash model, thinkingConfig should be omitted for quality tasks (default enabled)
      // or set to { thinkingBudget: 0 } for low latency tasks.
      // This generic retry wrapper doesn't impose thinkingConfig; calling functions should set it if needed.
      const finalParams = params; // Simplified: specific thinkingConfigs handled by calling functions or default behavior.

      const response = await ai.models.generateContent(finalParams);
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

export const generateInitialClarificationQuestions = async (topic: string): Promise<string[]> => {
  if (!API_KEY || !ai) throw new Error("API Key not configured or Gemini client not initialized.");
  const prompt = `
Given the research topic: "${topic}"

Generate 3-4 concise initial clarifying questions to help narrow down the scope, understand user intent, and focus the research.
These questions should prompt the user for specific aspects they are interested in, or constraints they might have.
Output ONLY a JSON array of strings, where each string is a question. Do not include any other text, explanation, or markdown.

Example for topic "Renewable Energy Impact":
[
  "Are you interested in the economic, environmental, or technological impact of renewable energy?",
  "Which specific types of renewable energy (e.g., solar, wind, geothermal) are you most interested in?",
  "Is there a particular geographical region or timeframe you want to focus on?",
  "Are you looking for information on policy, current research, or market trends?"
]`;

  try {
    const response = await geminiApiCallWithRetry({
      model: GEMINI_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        // For gemini-2.5-flash-preview-04-17, omit thinkingConfig for higher quality (default enabled)
      }
    });
    const questions = parseJsonFromString<string[]>(response.text, response.text);
    if (questions && Array.isArray(questions) && questions.every(item => typeof item === 'string')) {
      return questions;
    }
    throw new Error("Failed to generate valid initial clarification questions. Model did not return a JSON array of strings.");
  } catch (error) {
    console.error("Error generating initial clarification questions:", error);
    throw new Error(`Failed to generate initial clarification questions: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export interface EvaluatedAnswers {
  areAnswersSufficient: boolean;
  followUpQuestions?: string[];
}

export const evaluateAnswersAndGenerateFollowUps = async (
  topic: string,
  questionsAsked: ClarificationQuestion[],
  userAnswers: UserAnswer[] 
): Promise<EvaluatedAnswers> => {
  if (!API_KEY || !ai) throw new Error("API Key not configured or Gemini client not initialized.");

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
      model: GEMINI_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        // For gemini-2.5-flash-preview-04-17, omit thinkingConfig for higher quality (default enabled)
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


export const generateResearchStrategy = async (topic: string, accumulatedAnswers: UserAnswer[]): Promise<string> => {
  if (!API_KEY || !ai) throw new Error("API Key not configured or Gemini client not initialized.");
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
      model: GEMINI_MODEL_NAME,
      contents: prompt,
      // For gemini-2.5-flash-preview-04-17, omit thinkingConfig for higher quality (default enabled)
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
  
  const historySummary = summarizeHistoryForContext(executedSteps);
  const iterationLimitNote = researchMode === 'deeper' 
    ? "You are in 'Deeper Research Mode'. Continue as long as valuable new information relevant to the strategy can be found. The iteration count is not a strict limit; focus on comprehensive coverage or diminishing returns."
    : `You are in 'Normal Mode'. Aim for thorough coverage within approximately ${maxIterations} iterations.`;

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
    *   **Example of WHAT TO AVOID for a topic like "Apple M5 chip":** If a previous action was "Latest rumors and analyst predictions for Apple M5 chip specifications" and it returned useful data on specs, DO NOT then generate "Apple M5 chip rumors specifications and release date predictions" or "Apple M5 chip leaks, rumors, and analyst predictions on architecture, performance, and release date" if these are just covering the same ground on 'specifications' or 'rumors'. The goal is not to get more of the same, but to get NEW information.
3.  **Prioritize New Angles:** If a general area (e.g., 'M5 chip specifications') has been touched upon, your new action **MUST** aim to:
    *   Explore a **distinctly different aspect** or sub-topic (e.g., if specs covered, now ask "Potential manufacturing challenges for Apple M5 chip" or "Expected impact of M5 chip on specific Mac models").
    *   Seek **contrasting viewpoints, alternative perspectives, or comparative analysis** (e.g., "Analyst A's M5 predictions vs Analyst B's M5 predictions" or "How might M5 compare to competitor X's upcoming chip?").
    *   Delve into a **related sub-topic not yet covered in depth** (e.g., "M5 chip power efficiency targets" or "M5 Neural Engine improvements focus").
    *   Find **more recent information** ONLY if previous findings are explicitly outdated and the topic is highly time-sensitive.
    *   Synthesize or compare findings from multiple previous steps if a higher-level understanding is now appropriate and hasn't been done.
4.  **Objective:** Expand the knowledge base and build a comprehensive understanding by uncovering *new facets* of the topic. Do not re-query for slight variations of already explored information. Your reasoning should explicitly state how the new action seeks novel information.

Also, provide:
1.  A brief **reason** for choosing this action (1-2 sentences), explaining how it builds upon or DIVERGES from previous findings to gather NEW insights.
2.  A boolean flag **shouldStop**: 
    - Set to \`true\` if you believe sufficient information has been gathered across multiple dimensions of the topic to synthesize a comprehensive report, OR if further specific actions, even when aiming for novelty, are unlikely to yield significantly new insights according to the strategy and the novelty guidelines above.
    - If in 'Normal Mode' and approaching \`maxIterations\` (\`${maxIterations}\`), consider stopping if broad coverage is achieved.
    - If in 'Deeper Mode', \`shouldStop\` should generally be \`false\` unless the topic is truly comprehensively covered or returns are clearly diminishing even when attempting diverse new angles.
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
      model: GEMINI_MODEL_NAME, 
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        // For gemini-2.5-flash-preview-04-17, omit thinkingConfig for higher quality (default enabled)
      }
    });
    const decision = parseJsonFromString<{ action: string; reason: string; shouldStop: boolean }>(response.text, response.text);
    if (decision && typeof decision.action === 'string' && typeof decision.reason === 'string' && typeof decision.shouldStop === 'boolean') {
      if (researchMode === 'normal' && iteration >= maxIterations && !decision.shouldStop) {
        return { ...decision, shouldStop: true, reason: decision.reason + " (Forced stop due to max iterations in Normal Mode)" };
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

export const executeResearchStep = async (stepQuery: string): Promise<{ text: string; sources: Source[] }> => {
  if (!API_KEY || !ai) throw new Error("API Key not configured or Gemini client not initialized.");
  try {
    const response = await geminiApiCallWithRetry({
      model: GEMINI_MODEL_NAME, 
      contents: `Perform a web search and provide a comprehensive answer for the following query: "${stepQuery}". Focus on factual information and cite sources.`,
      config: {
        tools: [{ googleSearch: {} }],
        // For gemini-2.5-flash-preview-04-17 with Google Search, omit thinkingConfig.
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

export const summarizeText = async (textToSummarize: string, topic?: string): Promise<string> => {
  if (!API_KEY || !ai) throw new Error("API Key not configured or Gemini client not initialized.");
  if (!(textToSummarize || "").trim()) return "No content to summarize.";
  
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
      model: GEMINI_MODEL_NAME, 
      contents: prompt,
      // For gemini-2.5-flash-preview-04-17, omit thinkingConfig for higher quality (default enabled)
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
  executedSteps: ExecutedStepOutcome[]
): Promise<string> => {
  if (!API_KEY || !ai) throw new Error("API Key not configured or Gemini client not initialized.");

  const findingsDetails = executedSteps.map((s, index) => 
    `Step ${index + 1}: Action Taken: ${s.action}\nReasoning: ${s.reason || 'N/A'}\nSummary of Findings: ${s.summary}\nSources: ${s.sources.map(src => `[${src.title || src.uri}](${src.uri})`).join(', ') || 'None'}`
  ).join('\n\n---\n\n');

  const prompt = `
You are a professional research analyst tasked with writing an exceptionally detailed and comprehensive final report. Your goal is to synthesize ALL learnings from the research into a human-readable, extensive document.

**Main Research Topic (User's Query):** "${topic}"
**Guiding Research Strategy (Developed Approach):** "${strategy}"

**Learnings from Previous Research (Detailed Log of Actions, Findings, and Sources):**
${findingsDetails || "No research steps were executed or no findings were recorded."}

**CRITICAL INSTRUCTIONS FOR REPORT GENERATION:**

1.  **Length and Detail:**
    *   The report must be **as detailed and comprehensive as possible**. Aim for an extensive document, potentially spanning the equivalent of several pages if the gathered information supports this depth. Elucidate on all facets of the topic covered by the research.
    *   **Thoroughly incorporate ALL learnings** presented in the "Learnings from Previous Research" section. No piece of information should be omitted if it's relevant. Expand on summaries, connect disparate findings, and provide a holistic view.

2.  **Human-like Tone and Formatting:**
    *   Write this report as a human researcher would. The tone should be objective, analytical, and informative.
    *   The output **must be ONLY the report content itself**.
    *   **DO NOT** wrap your entire response in markdown code fences (e.g., \`\`\`markdown ... \`\`\`).
    *   **DO NOT** include any explanatory text, preambles, or postscripts before or after the report. Just the report.

3.  **Structure and Markdown Usage:**
    *   Follow a standard report structure:
        *   **Title:** A clear, descriptive title (e.g., \`# Report Title\`).
        *   **Introduction:** (Use \`## Introduction\`) Briefly introduce the topic, the research strategy, and the report's purpose.
        *   **Main Body:** Organize findings thematically or chronologically using \`## Section Title\` and \`### Subsection Title\`.
            *   Synthesize, do not just list summaries. Discuss key insights, evidence, and data points.
            *   **If the research topic/findings are comparative,** a detailed markdown comparison table is highly encouraged.
        *   **Conclusion:** (Use \`## Conclusion\`) Summarize key findings, offer concluding perspectives, and note any limitations or areas for further research.
        *   **(Optional) Consolidated List of Sources:** (Use \`## All Sources\`) If not fully covered by inline citations or for an overview.
    *   Use proper markdown for all structural elements (headings, lists, bold/italic, etc.).

4.  **Rich Content (Data Representation):**
    *   Where the information lends itself to it, **incorporate diverse data representations using markdown syntax**. This includes, but is not limited to:
        *   **Detailed Tables:** For comparisons, structured data, etc. (Use standard markdown table syntax).
        *   **KaTeX Formulas:** For mathematical or scientific notations (e.g., wrap with \`$$\` for block: \`$$E=mc^2$$\` or \`$\` for inline: \`$ax^2+bx+c=0$\`). Ensure correct KaTeX syntax.
        *   **Mermaid Diagrams:** For processes, flowcharts, hierarchies, etc. (e.g., \`\`\`mermaid\ngraph TD;\nA[Start] --> B{Decision};\nB -- Yes --> C[End];\nB -- No --> D[Recycle];\n\`\`\`). Ensure correct Mermaid syntax.

5.  **Citations:**
    *   **Crucially, cite sources for claims made.** Use markdown link format: \`[Source Title or Domain](URL)\`.
    *   Refer to sources provided in the 'Learnings from Previous Research'. If a title is missing, use the domain.
    *   Attribute all significant information from sources directly within the report body.

6.  **Content Focus:**
    *   Base the report **solely** on the "Learnings from Previous Research". Do not introduce external knowledge. The quality and extensiveness of the report depend on your ability to synthesize and elaborate on the provided data.

---
**Markdown Table Example (for comparative topics):**
This illustrates how to structure a comparison. Adapt based on the actual research topic. If the topic is "Analysis of Apple M5 Chip", your sections would be like "## Architecture Predictions", "## Performance", not necessarily a direct A vs B table unless comparing M5 to M4.

If comparing "Agent X" vs "Agent Y":
\`\`\`markdown
# Comparison of AI Research Agents X and Y

## Introduction
This report compares Agent X and Agent Y based on research into their workflow components...

## Workflow Component Comparison

| Workflow Component      | Agent X Details & Analysis                                                                 | Agent Y Details & Analysis                                                                          |
|-------------------------|--------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------|
| **Input Handling**      | Agent X accepts text prompts and allows file uploads for context. It may ask initial clarifying questions. [Relevant Source A](URL_A_1) | Agent Y uses a web interface for prompts, also supporting file uploads. It auto-generates a research plan for user review. [Source B](URL_B_1) |
| **Task Decomposition**  | Internally breaks down complex queries. This plan is not typically user-visible. [Source A2](URL_A_2)      | Explicitly formulates a multi-step plan which the user can edit before execution. [Relevant Source C](URL_C_1) |
| *Sub-aspect of Task*  | Further details on Agent X's decomposition... [Source A3](URL_A_3)                             | Details on how Agent Y handles sub-tasks in its plan... [Source D](URL_D_1)                             |
| **Query Generation**    | Autonomously formulates web search queries based on evolving understanding. [Source E](URL_E_1)         | Leverages existing search infrastructure, iteratively refining queries. [Source F](URL_F_1)                 |
| ... (other components like Information Retrieval, Reasoning, Output Structuring, etc.) ... | ...                                                                                        | ...                                                                                                 |

## Conclusion
In summary, Agent X excels in ..., while Agent Y offers strengths in ...
\`\`\`
---

**Final Output Reminder:**
Your entire response must be the raw markdown content of the report. No other text, no wrappers.
`;

  try {
    const response = await geminiApiCallWithRetry({
      model: GEMINI_MODEL_NAME, 
      contents: prompt,
      // For gemini-2.5-flash-preview-04-17 (report synthesis), omit thinkingConfig for higher quality (default enabled).
    });
    return response.text || "";
  } catch (error) {
    console.error("Error synthesizing report:", error);
    throw new Error(`Failed to synthesize report: ${error instanceof Error ? error.message : String(error)}`);
  }
};
