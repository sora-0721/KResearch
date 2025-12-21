import OpenAI from "openai";

export class OpenAIClient {
    private client: OpenAI;
    private apiKey: string;
    private baseUrl: string;

    constructor(apiKey: string, baseUrl?: string) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl || "https://api.openai.com/v1";
        this.client = new OpenAI({
            apiKey: apiKey,
            baseURL: this.baseUrl,
            dangerouslyAllowBrowser: true // Since we might use it client-side effectively though this runs on server
        });
    }

    async generateText(modelName: string, prompt: string, systemInstruction?: string, jsonMode: boolean = false, tools?: any[]) {
        try {
            const messages: any[] = [];
            if (systemInstruction) {
                messages.push({ role: "system", content: systemInstruction });
            }
            messages.push({ role: "user", content: prompt });

            const options: any = {
                model: modelName,
                messages: messages,
            };

            if (jsonMode) {
                options.response_format = { type: "json_object" };
            }

            // Note: OpenAI tools format is different from Gemini. 
            // If tools are provided (like google search), we might need to handle calling them differently or skip for now if only Gemini supports that specific tool format.
            // For now, ignoring tools for OpenAI to prevent errors, assuming Agent logic handles fallback or we implement OpenAI function calling later.
            // The current codebase uses "googleSearch" tool which is Gemini specific. OpenAI uses function calling.

            const completion = await this.client.chat.completions.create(options);
            let text = completion.choices[0].message.content || "";

            // Cleanup code blocks if present (similar to Gemini client)
            if (jsonMode) {
                const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
                if (jsonMatch && jsonMatch[1]) {
                    text = jsonMatch[1].trim();
                } else {
                    text = text.replace(/```json\n?|\n?```/g, "").trim();
                }
            }
            return text;
        } catch (error) {
            console.error("OpenAI API Error:", error);
            throw error;
        }
    }
}
