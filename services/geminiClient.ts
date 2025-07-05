import { GoogleGenAI } from "@google/genai";
import { apiKeyService } from "./apiKeyService";

function createClient(): GoogleGenAI {
    const apiKey = apiKeyService.getApiKey();
    if (!apiKey) {
        // This should be caught by UI checks, but throwing is a good safeguard.
        throw new Error("Gemini API key is not set. Please configure it in the application settings.");
    }
    return new GoogleGenAI({ apiKey });
}

// The 'ai' object is now a proxy that creates a new client on each access.
// This ensures that if the user sets a new API key, subsequent API calls will use it
// without needing to restart the application or re-import the module.
export const ai = {
    get models() {
        return createClient().models;
    },
    get chats() {
        return createClient().chats;
    }
};
