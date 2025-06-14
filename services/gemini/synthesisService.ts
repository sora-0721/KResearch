
import { ExecutedStepOutcome, ResearchMode } from '../../types';
import { getModelNameForMode } from './constants';
import { geminiApiCallWithRetry } from './utils';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.error("API_KEY missing in synthesisService.ts");
}

export const summarizeText = async (textToSummarize: string, researchMode: ResearchMode, topic?: string): Promise<string> => {
  if (!API_KEY) throw new Error("API Key not configured.");
  if (!(textToSummarize || "").trim()) return "No content to summarize.";
  const modelName = getModelNameForMode(researchMode);

  const prompt = `
Summarize key info from the text in 2-4 concise sentences.
Focus on points relevant to research topic: "${topic || 'General Information'}".
Maintain neutral, factual tone.
Text:
---
${textToSummarize}
---
Output ONLY the summary. No intros like "The summary is:".`;
  try {
    const response = await geminiApiCallWithRetry({ model: modelName, contents: prompt });
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
  if (!API_KEY) throw new Error("API Key not configured.");
  const modelName = getModelNameForMode(researchMode);

  const findingsDetails = executedSteps.map((s, index) =>
    `Step ${index + 1}: Action: ${s.action}\nReason: ${s.reason || 'N/A'}\nSummary: ${s.summary}\nSources: ${s.sources.map(src => `[${src.title || src.uri}](${src.uri})`).join(', ') || 'None'}`
  ).join('\n\n---\n\n');

  const initialReportPrompt = `Query: <query>${topic}</query>
Learnings: <learnings>\n${findingsDetails || "No research steps/findings recorded."}\n</learnings>
Write a detailed final report (aim for 3+ pages, include ALL learnings). Use diverse markdown (tables, katex, mermaid).
**DO NOT** output anything other than the report. No markdown block wrapping for the whole report.`;

  let initialReportText = "";
  try {
    console.log(`Synthesizing initial report (model: ${modelName})...`);
    const initialResponse = await geminiApiCallWithRetry({ model: modelName, contents: initialReportPrompt });
    initialReportText = (initialResponse.text || "").trim();
    if (!initialReportText) {
        initialReportText = `# ${topic}\n\nInitial report generation failed. Learnings:\n${findingsDetails}`;
    }
  } catch (error) {
    console.error("Error synthesizing initial report:", error);
    throw new Error(`Initial report synthesis failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  const elaborationSystemInstruction = `Elaborate on existing points, add detail/examples from research findings. Maintain coherence. Original topic: "${topic}". Strategy: "${strategy}". NO NEW INFO not in initial artifact/learnings.`;
  const elaborationPrompt = `Rewrite to be longest. Do not change meaning/story.
Artifact: <artifact>\n${initialReportText}\n</artifact>
System Instruction (if not empty, use with artifact): <systemInstruction>\n${elaborationSystemInstruction}\n</systemInstruction>
Respond ONLY with updated artifact. No wrappers. Keep language consistent.`;

  try {
    console.log(`Elaborating report (model: ${modelName})...`);
    const elaboratedResponse = await geminiApiCallWithRetry({ model: modelName, contents: elaborationPrompt });
    const elaboratedReportText = (elaboratedResponse.text || "").trim();
    return elaboratedReportText || initialReportText; // Fallback to initial if elaboration is empty
  } catch (error) {
    console.warn("Error elaborating report. Returning initial.", error);
    return initialReportText;
  }
};
