import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { MAX_RETRIES, BASE_RETRY_DELAY_MS } from './constants';
import { ExecutedStepOutcome } from "../../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY is not set. Please ensure the process.env.API_KEY environment variable is configured. The app may not function correctly.");
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

export async function geminiApiCallWithRetry(
  params: { model: string; contents: any; config?: any }
): Promise<GenerateContentResponse> {
  if (!ai) throw new Error("Gemini API client not initialized. API_KEY might be missing.");
  let attempts = 0;
  while (attempts < MAX_RETRIES) {
    try {
      // thinkingConfig is intentionally omitted to allow for unlimited thinking budget by default.
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

export const parseJsonFromString = <T,>(text: string, originalTextForError?: string): T | null => {
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

export const summarizeHistoryForContext = (history: ExecutedStepOutcome[], maxTokens: number): string => {
  let summarized = history.map(h => `Action: ${h.action}\nFinding: ${(h.summary || "").substring(0, 300)}...`).join('\n---\n');
  const estimatedTokens = summarized.length / 4; // Simple approximation

  if (estimatedTokens > maxTokens) {
      summarized = summarized.substring(summarized.length - (maxTokens * 4)); // Keep the most recent part
      // Try to start at a coherent point
      summarized = "...\n" + summarized.substring(summarized.indexOf('\n---\n') > 0 ? summarized.indexOf('\n---\n') + 5 : 0);
  }
  return summarized;
};