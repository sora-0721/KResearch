import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { apiKeyService, AllKeysFailedError } from "./apiKeyService";

// This is a utility function that should probably be somewhere generic,
// but for this change, having it here is fine to avoid creating a new file.
const getCleanErrorMessage = (error: any): string => {
    if (!error) return 'An unknown error occurred.';
    if (typeof error === 'string') return error;

    // Prioritize a 'message' or 'str' property, common in error-like objects (e.g., Mermaid)
    if (error.message && typeof error.message === 'string') {
        try {
            // Check for Gemini's nested error format
            const parsed = JSON.parse(error.message);
            return parsed?.error?.message || error.message;
        } catch (e) {
            return error.message;
        }
    }

    if (error.str && typeof error.str === 'string') {
        return error.str;
    }

    if (error instanceof Error) {
        return error.message;
    }

    // Fallback for other objects
    if (typeof error === 'object' && error !== null) {
        try {
            return JSON.stringify(error, null, 2);
        } catch {
            return 'Received an un-stringifiable error object.';
        }
    }

    return String(error);
};

const sanitizeForLogging = (obj: any, truncateLength: number = 500) => {
    if (!obj) return obj;
    try {
        // Deep clone and sanitize
        return JSON.parse(JSON.stringify(obj, (key, value) => {
            if (typeof value === 'string' && value.length > truncateLength) {
                return value.substring(0, truncateLength) + '...[TRUNCATED]';
            }
            return value;
        }));
    } catch (e) {
        return { error: "Failed to sanitize for logging" };
    }
};

// The core executor with retry logic
async function executeWithRetry<T>(
    apiCall: (client: GoogleGenAI) => Promise<T>,
    operationName: string,
    params: any
): Promise<T> {
    const keys = apiKeyService.getApiKeys();
    if (keys.length === 0) {
        throw new Error("No API keys provided. Please add at least one key in the application settings.");
    }

    const maxAttempts = keys.length;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const key = apiKeyService.getNextApiKey();
        if (!key) {
            continue;
        }
        
        console.log(`[API Request] Operation: ${operationName}, Model: ${params.model}, Attempt: ${attempt}/${maxAttempts}, Key ending: ...${key.slice(-4)}`);
        console.log(`[API Request] Parameters:`, sanitizeForLogging(params, 4000));

        try {
            const client = new GoogleGenAI({ apiKey: key });
            const result = await apiCall(client);

            console.log(`[API Success] Operation: ${operationName}`);
            console.log(`[API Response]:`, sanitizeForLogging(result));
            
            return result;
        } catch (error) {
            console.warn(`[API Call Failed: Attempt ${attempt}/${maxAttempts}] Operation: '${operationName}' with key ending in ...${key.slice(-4)}. Error: ${getCleanErrorMessage(error)}`);
            lastError = error;
        }
    }

    // All keys have failed
    const finalErrorMessage = getCleanErrorMessage(lastError);
    console.error(`[API Error: All Keys Failed] Operation: '${operationName}'. Last error: ${finalErrorMessage}`);
    console.error(`[API Error] Failed Parameters:`, sanitizeForLogging(params, 4000));
    throw new AllKeysFailedError(`All API keys failed. Last error: ${finalErrorMessage}`);
}

// The new 'ai' object that will replace the old one.
// It exposes methods that wrap the actual API calls with our retry logic.
export const ai = {
    models: {
        generateContent: (params: any): Promise<GenerateContentResponse> => {
            return executeWithRetry(client => client.models.generateContent(params), 'generateContent', params);
        },
        generateContentStream: (params: any): Promise<any> => {
            // Logging will only show the initial object for streams, not each chunk.
            return executeWithRetry(client => client.models.generateContentStream(params), 'generateContentStream', params);
        },
        generateImages: (params: any): Promise<any> => {
            return executeWithRetry(client => client.models.generateImages(params), 'generateImages', params);
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