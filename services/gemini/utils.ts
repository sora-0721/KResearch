import { GoogleGenAI, GenerateContentResponse, Content } from "@google/genai";
import { MAX_RETRIES, BASE_RETRY_DELAY_MS } from './constants';
import { ExecutedStepOutcome } from "../../types";

const API_KEY = process.env.API_KEY;

let ai: GoogleGenAI | null = null;

if (API_KEY) {
  try {
    ai = new GoogleGenAI({ apiKey: API_KEY });
  } catch (e) {
    console.error("Failed to initialize GoogleGenAI, API_KEY might be invalid or environment issue:", e);
    // Let API_KEY check below handle the warning to the user.
  }
}

if (!API_KEY || !ai) { // Also check if 'ai' was successfully initialized
  console.error("API_KEY is not set or GoogleGenAI client failed to initialize. Please ensure the process.env.API_KEY environment variable is configured correctly. The app may not function correctly.");
  // Error will be thrown by functions below if 'ai' is null.
}

export async function geminiApiCallWithRetry(
  params: { model: string; contents: any; config?: any }
): Promise<GenerateContentResponse> {
  if (!ai) throw new Error("Gemini API client not initialized. API_KEY might be missing or invalid.");
  let attempts = 0;
  while (attempts < MAX_RETRIES) {
    try {
      // Omit thinkingConfig for research tasks to default to enabled thinking for higher quality.
      const response = await ai.models.generateContent(params);
      if (!response.text && !response.candidates) { // Check for empty or malformed successful response
        console.warn(`Gemini API call for model ${params.model} returned a response with no text or candidates. Prompt:`, params.contents);
        // Depending on strictness, could throw an error here or let caller handle it.
        // For now, return the (potentially empty) response.
      }
      return response;
    } catch (error: any) {
      attempts++;
      const errorMessage = String(error?.message || error).toLowerCase();
      const isRetryableError =
        errorMessage.includes("status: 500") || // Includes "got status: 500 UNKNOWN"
        errorMessage.includes("status: 503") ||
        errorMessage.includes("status: 429") ||
        errorMessage.includes("internal error") ||
        errorMessage.includes("unknown error") || // General catch for some API errors
        errorMessage.includes("service unavailable") ||
        errorMessage.includes("deadline exceeded") ||
        errorMessage.includes("unavailable") ||
        errorMessage.includes("xhr error"); // Catches XHR issues like in the user's example

      if (isRetryableError && attempts < MAX_RETRIES) {
        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempts - 1);
        console.warn(
          `Gemini API call for model ${params.model} failed (attempt ${attempts}/${MAX_RETRIES}) with error: ${error}. Retrying in ${delay / 1000}s...`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error(
          `Gemini API call for model ${params.model} failed definitively after ${attempts} attempts or due to non-retryable error: ${error}. Details:`, error
        );
        throw error; // Re-throw the original error after logging
      }
    }
  }
  // This line should ideally not be reached if MAX_RETRIES > 0, as the loop would throw.
  // Included for safety or if MAX_RETRIES could be 0.
  throw new Error(`Gemini API call for model ${params.model} failed after ${MAX_RETRIES} retries.`);
}


export async function* geminiApiCallStreamWithRetry(
  params: { model: string; contents: Content | string | (string | Content)[]; config?: any }
): AsyncGenerator<GenerateContentResponse, void, undefined> {
  if (!ai) throw new Error("Gemini API client not initialized. API_KEY might be missing or invalid.");
  let attempts = 0;
  while (attempts < MAX_RETRIES) {
    try {
      // Omit thinkingConfig for research tasks.
      const responseStream = await ai.models.generateContentStream(params);
      for await (const chunk of responseStream) {
        // Ensure chunk has 'text' property, even if empty, to match non-streaming behavior for consumers.
        // The actual GenerateContentResponse from stream chunks might not always have .text directly,
        // but often text() method. Here we assume the lib provides .text directly on chunks.
        // Based on SDK, chunk.text is the way.
        if (chunk.text === undefined && chunk.text === null) {
            // If a chunk is totally empty or malformed, we might skip it or log it.
            // For now, yield as is, consumer should be robust.
            console.warn("Received a stream chunk with no text:", chunk);
        }
        yield chunk;
      }
      return; // Signal end of stream
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
        errorMessage.includes("unavailable") ||
        errorMessage.includes("xhr error");

      if (isRetryableError && attempts < MAX_RETRIES) {
        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempts - 1);
        console.warn(
          `Gemini API stream for model ${params.model} failed (attempt ${attempts}/${MAX_RETRIES}) with error: ${error}. Retrying in ${delay / 1000}s...`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
         console.error(
          `Gemini API stream for model ${params.model} failed definitively after ${attempts} attempts or due to non-retryable error: ${error}. Details:`, error
        );
        throw error; // Re-throw the original error
      }
    }
  }
  throw new Error(`Gemini API stream for model ${params.model} failed after ${MAX_RETRIES} retries.`);
}


export const parseJsonFromString = <T,>(text: string, originalTextForError?: string): T | null => {
  let jsonStr = (text || "").trim();
  const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
  const match = jsonStr.match(fenceRegex);
  if (match && match[2]) {
    jsonStr = (match[2] || "").trim();
  }
  if (!jsonStr) { // Handle case where jsonStr becomes empty after processing
    console.warn("JSON string is empty after processing. Original text:", originalTextForError || text);
    return null;
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
      const lastSeparatorIndex = summarized.indexOf('\n---\n');
      if (lastSeparatorIndex > 0) {
        summarized = "...\n" + summarized.substring(lastSeparatorIndex + 5);
      } else {
        summarized = "...\n" + summarized; // If no separator, just prepend ellipsis
      }
  }
  return summarized;
};