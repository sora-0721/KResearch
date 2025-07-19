import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { apiKeyService, AllKeysFailedError } from "./apiKeyService";

// This is a utility function that should probably be somewhere generic,
// but for this change, having it here is fine to avoid creating a new file.
const getCleanErrorMessage = (error: any): string => {
    let message = 'An unknown error occurred.';
    if (error instanceof Error) {
        try {
            // Attempt to parse Gemini API's structured error message
            const parsed = JSON.parse(error.message);
            message = parsed?.error?.message || error.message;
        } catch (e) {
            message = error.message;
        }
    } else {
        message = String(error);
    }
    return message;
};

// The core executor with retry logic
async function executeWithRetry<T>(
    apiCall: (client: GoogleGenAI) => Promise<T>,
    operationName: string
): Promise<T> {
    const keys = apiKeyService.getApiKeys();
    if (keys.length === 0) {
        throw new Error("No API keys provided. Please add at least one key in the application settings.");
    }

    // Use the number of keys as the maximum number of attempts
    const maxAttempts = keys.length;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const key = apiKeyService.getNextApiKey();
        if (!key) {
            continue;
        }

        try {
            const client = new GoogleGenAI({ apiKey: key });
            const result = await apiCall(client);
            return result;
        } catch (error) {
            console.warn(`[Attempt ${attempt}/${maxAttempts}] API call for '${operationName}' with key ending in ...${key.slice(-4)} failed. Trying next key.`);
            lastError = error;
        }
    }

    // All keys have failed
    const finalErrorMessage = getCleanErrorMessage(lastError);
    console.error(`All ${maxAttempts} API keys failed for operation '${operationName}'. Last error:`, lastError);
    throw new AllKeysFailedError(`All API keys failed. Last error: ${finalErrorMessage}`);
}

// The new 'ai' object that will replace the old one.
// It exposes methods that wrap the actual API calls with our retry logic.
export const ai = {
    models: {
        generateContent: (params: any): Promise<GenerateContentResponse> => {
            return executeWithRetry(client => client.models.generateContent(params), 'generateContent');
        },
        generateContentStream: (params: any): Promise<any> => {
            return executeWithRetry(client => client.models.generateContentStream(params), 'generateContentStream');
        },
        generateImages: (params: any): Promise<any> => {
            return executeWithRetry(client => client.models.generateImages(params), 'generateImages');
        },
    },
    // The chat API is not used in the app. This is a safe fallback that mimics the original (flawed) implementation.
    get chats() {
        const key = apiKeyService.getNextApiKey();
        if (!key) {
             throw new Error("Cannot create chat: No API key available.");
        }
        return new GoogleGenAI({ apiKey: key }).chats;
    }
};