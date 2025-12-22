// OpenAI Client for KResearch

export class OpenAIClient {
    private apiKey: string;
    private baseUrl: string;

    constructor(apiKey: string, host?: string) {
        this.apiKey = apiKey;
        this.baseUrl = host || "https://api.openai.com/v1";
    }

    async generateText(
        modelName: string,
        prompt: string,
        systemInstruction?: string,
        jsonMode: boolean = false
    ): Promise<string> {
        try {
            const messages: any[] = [];

            if (systemInstruction) {
                messages.push({ role: "system", content: systemInstruction });
            }
            messages.push({ role: "user", content: prompt });

            const requestBody: any = {
                model: modelName,
                messages
            };

            if (jsonMode) {
                requestBody.response_format = { type: "json_object" };
            }

            let response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                // If JSON validation failed, retry once without strict JSON mode
                if (jsonMode && response.status === 400 && errorData.error?.code === "json_validate_failed") {
                    console.warn("OpenAI JSON validation failed, retrying without strict mode...");
                    const retryBody = { ...requestBody };
                    delete retryBody.response_format;

                    response = await fetch(`${this.baseUrl}/chat/completions`, {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${this.apiKey}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(retryBody)
                    });

                    if (!response.ok) {
                        const retryErrorData = await response.json().catch(() => ({}));
                        throw new Error(`OpenAI API Retry Error: ${response.statusText} - ${JSON.stringify(retryErrorData)}`);
                    }
                } else {
                    throw new Error(`OpenAI API Error: ${response.statusText} - ${JSON.stringify(errorData)}`);
                }
            }

            const data = await response.json();
            let text = data.choices?.[0]?.message?.content || "";

            // Clean up markdown code blocks if present
            if (jsonMode) {
                const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
                if (jsonMatch && jsonMatch[1]) {
                    text = jsonMatch[1].trim();
                } else {
                    text = text.replace(/```json\n?|\n?```/g, "").trim();
                }

                // Extract JSON part
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
            console.error("OpenAI API Error:", error);
            throw error;
        }
    }
}
