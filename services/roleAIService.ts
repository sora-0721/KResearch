import { ai } from './geminiClient';
import { getModel } from './models';
import { parseJsonFromMarkdown } from './utils';

export const generateNameAndEmoji = async (prompt: string): Promise<{ name: string; emoji: string }> => {
    const systemPrompt = `Analyze the user's role prompt. Based on its content, suggest a short, catchy name (3 words max) and a single, representative emoji.
Your response MUST be a single, valid JSON object and nothing else, like this: { "name": "Creative Writer", "emoji": "✍️" }`;

    const nameAndEmojiSchema = {
        type: 'object',
        properties: {
            name: { type: 'string' },
            emoji: { type: 'string' }
        },
        required: ['name', 'emoji']
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseSchema: nameAndEmojiSchema,
            temperature: 0.8,
        }
    });

    const parsed = parseJsonFromMarkdown(response.text);
    if (!parsed || !parsed.name || !parsed.emoji) {
        throw new Error("AI failed to generate a valid name and emoji object.");
    }
    return parsed;
};


export const optimizePrompt = async (prompt: string, mode: 'creative' | 'refine'): Promise<string> => {
    const baseInstruction = "You are an expert prompt engineer. Your task is to rewrite the following user-provided prompt to be clearer, more effective, and more likely to elicit a high-quality response from a large language model.";

    const modeInstruction = mode === 'refine'
        ? "Crucially, DO NOT add new instructions or change the core intent. Simply refine the existing text for maximum impact and clarity. Polish the language and structure."
        : "You have creative freedom. Enhance the prompt by adding new dimensions, suggesting creative angles, and expanding on the original idea to make the final output more comprehensive and imaginative. Do not remove the user's core intent, but feel free to build upon it significantly.";

    const systemPrompt = `${baseInstruction} ${modeInstruction}
Your final output MUST be only the text of the rewritten prompt. Do not add any conversational text, explanations, or markdown formatting.`;
    
    const response = await ai.models.generateContent({
        model: getModel('roleAI', 'Balanced'),
        contents: prompt,
        config: {
            systemInstruction: systemPrompt,
            temperature: mode === 'creative' ? 0.8 : 0.3
        }
    });
    
    if (!response.text) {
        throw new Error("AI failed to return an optimized prompt.");
    }

    return response.text.trim();
};
