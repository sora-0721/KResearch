export const parseJsonFromMarkdown = (text: string): any => {
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = text.match(fenceRegex);
    const jsonStr = match ? match[2].trim() : text.trim();
    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("Failed to parse JSON response:", e, "Raw text:", text);
        try {
            const openBrace = jsonStr.indexOf('{');
            const closeBrace = jsonStr.lastIndexOf('}');
            if (openBrace !== -1 && closeBrace > openBrace) {
                return JSON.parse(jsonStr.substring(openBrace, closeBrace + 1));
            }
        } catch (lenientError) {
             console.error("Lenient JSON parse also failed:", lenientError);
        }
        return null;
    }
};

export const getCleanErrorMessage = (error: any): string => {
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