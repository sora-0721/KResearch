import { ai } from './geminiClient';
import { clarificationModels } from './models';
import { parseJsonFromMarkdown } from './utils';
import { ResearchMode, FileData, ClarificationTurn } from '../types';

export interface ClarificationResponse {
    type: 'question' | 'summary';
    content: string;
}

export const clarifyQuery = async (
    history: ClarificationTurn[],
    mode: ResearchMode,
    fileData: FileData | null
): Promise<ClarificationResponse> => {
    // --- STEP 1: Generate the clarification text using Google Search ---
    const generationPrompt = `You are a Research Analyst AI. Your task is to help a user refine their research topic. You MUST respond ONLY in English.

**Workflow:**
1.  You will receive a user's query and the conversation history.
2.  Use the Google Search tool to gather initial context on the user's query.
3.  Based on the search results, decide if you need more information or if you have enough to proceed.
4.  If you need more information, formulate ONE specific, concise question in English to help the user narrow their focus.
5.  If you have enough information (e.g., after 2-4 questions), provide a final, refined research topic summary in English.

**Output Rules:**
- Your output must be ONLY the plain text of your question or your summary.
- Do NOT add any conversational filler, introductory phrases, or markdown formatting.

Example output for a question:
Are you more interested in the advancements in electric vehicle technology or the development of autonomous driving systems?

Example output for a summary:
The user wants to research the impact of autonomous driving systems on urban planning and public transportation.`;
    
    const contents = history.map((turn, index) => {
        const parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [{ text: turn.content }];
        if (turn.role === 'user' && index === 0 && fileData) {
            parts.push({ inlineData: { mimeType: fileData.mimeType, data: fileData.data } });
        }
        return { role: turn.role, parts: parts };
    });

    const generationResponse = await ai.models.generateContent({
        model: clarificationModels[mode],
        contents: contents,
        config: { 
            systemInstruction: generationPrompt, 
            temperature: 0.5,
            tools: [{ googleSearch: {} }],
        }
    });

    const generatedText = generationResponse.text.trim();
    if (!generatedText) {
        console.error("Clarification Step 1 failed: No text was generated.");
        return { type: 'summary', content: `AI clarification failed. Proceeding with original query: ${history[0].content}` };
    }

    // --- STEP 2: Format the generated text into a structured JSON object ---
    const formattingPrompt = `Analyze the following text and classify it.
Your response MUST be a single, valid JSON object and nothing else.
- If the text is a question, set "type" to "question".
- If the text is a summary or statement, set "type" to "summary".
- The "content" key must contain the original, unmodified text.

Text to analyze: "${generatedText}"
`;

    const clarificationResponseSchema = {
        type: 'object',
        properties: {
            type: { type: 'string', enum: ['question', 'summary'] },
            content: { type: 'string' }
        },
        required: ['type', 'content']
    };

    const formattingResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash', // Use a fast model for this simple formatting task
        contents: [{ role: 'user', parts: [{ text: formattingPrompt }] }],
        config: {
            responseMimeType: "application/json",
            responseSchema: clarificationResponseSchema,
            temperature: 0.0,
        }
    });

    const parsedResponse = parseJsonFromMarkdown(formattingResponse.text) as ClarificationResponse;

    if (!parsedResponse || !parsedResponse.type || !parsedResponse.content) {
        console.error("Clarification Step 2 (JSON formatting) failed. Raw text from formatter:", formattingResponse.text);
        // Fallback: If JSON formatting fails, make an intelligent guess based on the original generated text.
        if (generatedText.includes('?')) {
            return { type: 'question', content: generatedText };
        }
        return { type: 'summary', content: generatedText };
    }
    
    return parsedResponse;
};
