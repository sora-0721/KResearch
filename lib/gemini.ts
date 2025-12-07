import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiClient {
    private genAI: GoogleGenerativeAI;
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
        this.genAI = new GoogleGenerativeAI(apiKey);
    }

    async listModels() {
        try {
            // Using REST API directly as the SDK's listModels might vary by version or require specific setup
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch models: ${response.statusText}`);
            }
            const data = await response.json();
            return data.models || [];
        } catch (error) {
            console.error("Gemini API List Models Error:", error);
            return [];
        }
    }

    async generateText(modelName: string, prompt: string, systemInstruction?: string, jsonMode: boolean = false, tools?: any[]) {
        try {
            const modelParams: any = {
                model: modelName,
                systemInstruction: systemInstruction
            };

            if (tools) {
                modelParams.tools = tools;
            }

            const model = this.genAI.getGenerativeModel(modelParams);

            // NOTE: Google Search Grounding (tools) is currently incompatible with responseMimeType: "application/json"
            // If tools are present, we must disable strict JSON mode at the API level and rely on the prompt.
            const effectiveJsonMode = jsonMode && !tools;
            const generationConfig = effectiveJsonMode ? { responseMimeType: "application/json" } : undefined;

            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig
            });

            const response = await result.response;
            let text = response.text();

            // Clean up markdown code blocks if present, especially if we expected JSON (whether strict mode was on or not)
            if (jsonMode) {
                // Try to extract JSON from code block first
                const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
                if (jsonMatch && jsonMatch[1]) {
                    text = jsonMatch[1].trim();
                } else {
                    // Fallback: just strip the markers if they exist
                    text = text.replace(/```json\n?|\n?```/g, "").trim();
                }

                // Additional cleanup: Extract just the JSON part by finding the first { or [ and matching braces
                const firstBrace = text.indexOf("{");
                const firstBracket = text.indexOf("[");

                let startIndex = -1;
                let isObject = false;

                if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
                    startIndex = firstBrace;
                    isObject = true;
                } else if (firstBracket !== -1) {
                    startIndex = firstBracket;
                    isObject = false;
                }

                if (startIndex !== -1) {
                    // Count braces/brackets to find the matching closing one
                    let depth = 0;
                    const openChar = isObject ? "{" : "[";
                    const closeChar = isObject ? "}" : "]";

                    for (let i = startIndex; i < text.length; i++) {
                        if (text[i] === openChar) depth++;
                        if (text[i] === closeChar) depth--;

                        if (depth === 0) {
                            text = text.substring(startIndex, i + 1);
                            break;
                        }
                    }
                }
            }

            return text;
        } catch (error) {
            console.error("Gemini API Error:", error);
            throw error;
        }
    }
}
