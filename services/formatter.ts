
import { ai } from './geminiClient';
import { plannerTurnSchema } from './plannerPrompt';
import { parseJsonFromMarkdown } from './utils';

interface PlannerTurn {
    thought: string;
    action: 'search' | 'continue_debate' | 'finish';
    queries?: string[] | null;
    finish_reason?: string | null;
}

export const forceFormatPlannerResponse = async (rawText: string): Promise<PlannerTurn | null> => {
    if (!rawText || !rawText.trim()) {
        console.warn("[Formatter] Received empty raw text to format. Skipping.");
        return null;
    }
    
    console.log("[Formatter] Attempting to salvage malformed planner response...");

    const formattingPrompt = `You are an expert JSON formatter. Your sole task is to take the provided text, which is a failed attempt by another AI to generate JSON, and correct it to perfectly match the provided JSON schema. Output ONLY the valid JSON object and nothing else. Do not add explanations, apologies, or markdown fences.

JSON Schema to conform to:
${JSON.stringify(plannerTurnSchema, null, 2)}

---

Text to fix:
${rawText}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-lite',
            contents: formattingPrompt,
            config: {
                temperature: 0.0,
                responseMimeType: "application/json",
                responseSchema: plannerTurnSchema
            }
        });
        
        const parsed = parseJsonFromMarkdown(response.text) as PlannerTurn;
        if (parsed && parsed.action && parsed.thought) {
            console.log("[Formatter] Successfully salvaged planner response.");
            return parsed;
        }
        console.error("[Formatter] Salvage attempt failed to produce valid structure.", parsed);
        return null;
    } catch (e) {
        console.error("[Formatter] Error during salvage attempt:", e);
        return null;
    }
};
