import { apiKeyService, AllKeysFailedError } from "./apiKeyService";

// Helper to get a clean error message from various error types
const getCleanErrorMessage = (error: any): string => {
    if (!error) return 'An unknown error occurred.';
    if (typeof error === 'string') return error;

    if (error.message && typeof error.message === 'string') {
        try {
            const parsed = JSON.parse(error.message);
            return parsed?.error?.message || error.message;
        } catch (e) {
            return error.message;
        }
    }
    if (error.str && typeof error.str === 'string') return error.str;
    if (error instanceof Error) return error.message;
    if (typeof error === 'object' && error !== null) {
        try { return JSON.stringify(error, null, 2); }
        catch { return 'Received an un-stringifiable error object.'; }
    }
    return String(error);
};

// Helper to sanitize potentially large objects for logging
const sanitizeForLogging = (obj: any, truncateLength: number = 500) => {
    if (!obj) return obj;
    try {
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

// Formats the flexible `contents` parameter from the SDK style to the strict REST API style
function formatContentsForRest(contents: any): any[] {
    if (typeof contents === 'string') {
        return [{ role: 'user', parts: [{ text: contents }] }];
    }
    if (Array.isArray(contents)) {
        return contents; // Assumes it's already a Content[] array
    }
    if (typeof contents === 'object' && contents !== null && contents.parts) {
        // A single Content object, wrap it in an array and default the role
        return [{ role: contents.role || 'user', parts: contents.parts }];
    }
    console.warn("Unknown contents format, passing through:", contents);
    return [contents];
}

// Maps the SDK-style `params` object to a REST API-compatible request body
function mapToRestBody(params: any): object {
    const body: any = {};
    if (params.contents) {
        body.contents = formatContentsForRest(params.contents);
    }
    if (params.config) {
        const { systemInstruction, tools, ...generationConfig } = params.config;
        if (Object.keys(generationConfig).length > 0) {
            body.generationConfig = generationConfig;
        }
        if (systemInstruction) {
            body.systemInstruction = { parts: [{ text: systemInstruction }] };
        }
        if (tools) body.tools = tools;
    }
    return body;
}

const operationToRestMethod: Record<string, string> = {
    'generateContent': 'generateContent',
};

// The core executor with retry logic, now using `fetch` instead of the SDK
async function executeWithRetry(operationName: string, params: any): Promise<any> {
    const keys = apiKeyService.getApiKeys();
    if (keys.length === 0) {
        throw new Error("No API keys provided. Please add at least one key in the application settings.");
    }

    const maxAttempts = keys.length;
    let lastError: any = null;
    const baseUrl = apiKeyService.getApiBaseUrl();
    const modelName = params.model;
    const restMethod = operationToRestMethod[operationName];

    if (!modelName || !restMethod) {
        throw new Error(`Invalid model or operation for API call: ${modelName}, ${operationName}`);
    }

    const url = `${baseUrl}/v1beta/models/${modelName}:${restMethod}`;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const key = apiKeyService.getNextApiKey();
        if (!key) continue;

        console.log(`[API Request] URL: ${url}, Attempt: ${attempt}/${maxAttempts}, Key: ...${key.slice(-4)}`);
        console.log(`[API Request] Parameters:`, sanitizeForLogging(params, 4000));

        try {
            const body = mapToRestBody(params);
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
                body: JSON.stringify(body)
            });

            const responseText = await response.text();
            if (!response.ok) {
                try {
                    const errorData = JSON.parse(responseText);
                    throw new Error(errorData?.error?.message || `API Error: ${response.status}`);
                } catch {
                     throw new Error(`API Error: ${response.status} - ${responseText}`);
                }
            }
            
            const result = JSON.parse(responseText);

            // Re-shape the REST response to mimic the SDK's GenerateContentResponse object
            // This ensures compatibility with existing code that uses `.text` or `.candidates`
            const sdkLikeResponse = {
                ...result,
                text: result?.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
            };

            console.log(`[API Success] Operation: ${operationName}`);
            console.log(`[API Response]:`, sanitizeForLogging(sdkLikeResponse));
            return sdkLikeResponse;

        } catch (error) {
            const errorMessage = getCleanErrorMessage(error);
            console.warn(`[API Call Failed: Attempt ${attempt}/${maxAttempts}] Operation: '${operationName}' with key ...${key.slice(-4)}. Error: ${errorMessage}`);
            lastError = error;
        }
    }

    const finalErrorMessage = getCleanErrorMessage(lastError);
    console.error(`[API Error: All Keys Failed] Operation: '${operationName}'. Last error: ${finalErrorMessage}`);
    console.error(`[API Error] Failed Parameters:`, sanitizeForLogging(params, 4000));
    throw new AllKeysFailedError(`All API keys failed. Last error: ${finalErrorMessage}`);
}

// A simplified `ai` object that uses our fetch-based retry logic
export const ai = {
    models: {
        generateContent: (params: any): Promise<any> => {
            return executeWithRetry('generateContent', params);
        },
        // Other methods like generateContentStream, generateImages, and chats are not used
        // by the app and are omitted to avoid implementing their fetch-based logic.
    },
};
